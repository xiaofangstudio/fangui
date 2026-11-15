/* 工程里的 Copper UI 工作台：左边预览（能点、能操作），右边/下面是属性检查器。
 *
 * 三件事在这里合上：
 *  1. 编译：优先走 Rust 内核（api.cuiCompile），没有内核就回退 TS 版；
 *  2. 互动：把 `when click` + `act` 编译出来的 behaviors 挂到 iframe 上，点一下真的会动；
 *     act call 会调 app/*.co 里的 Copper 函数（page.* 操作预览里的界面）；
 *  3. 可视化编辑：点预览里的元素 → 选中对应规则 → 改个值 → 源码自己更新。
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { compileCui } from './compile';
import { parseCui } from './parser';
import { buildCuiTree, renderCuiTree } from './tree';
import { findRuleForPick, valueText, type CuiPick } from './patch';
import type { CuiBehavior, CuiCompileResult } from './ast';
import { BASE_CSS, TOKEN_CSS } from './sample';
import { api } from '../core/tauri';
import { callCopperFn, createPageBridge, selectorOfHit, setPageBridge } from '../lang/pagehost';

export type CuiPaneProps = {
  /** 当前 .cui 缓冲区里的文本 */
  code: string;
  /** 前端 Copper 逻辑（app/*.co，工程相对路径 → 源码）；act call 调这里的函数 */
  preview?: { logic?: Record<string, string> };
  /** 预览结构变了（换文件）就重建 iframe */
  frameKey?: string;
  /** 检查器改了属性：把这一行写回源码 */
  onPatch?: (pick: CuiPick, prop: string, value: string) => void;
};

/** 检查器里能直接改的属性：都是最常用的那几个，不是全部 */
const INSPECT_PROPS: { prop: string; label: string; hint: string }[] = [
  { prop: 'background', label: '背景', hint: 'accent / #ffffff' },
  { prop: 'color', label: '文字色', hint: 'ink' },
  { prop: 'radius', label: '圆角', hint: '10' },
  { prop: 'padding', label: '内边距', hint: '8 16' },
  { prop: 'size', label: '字号', hint: '13' },
  { prop: 'weight', label: '字重', hint: 'bold' }
];

function pickLabel(p: CuiPick): string {
  const parts: string[] = [];
  if (p.tag) parts.push(p.tag);
  if (p.id) parts.push('#' + p.id);
  for (const c of p.cls.split(/\s+/)) {
    if (c && c !== 'selected') parts.push('.' + c);
  }
  return parts.join(' ') || '元素';
}

export function CuiPane({ code, preview, frameKey, onPatch }: CuiPaneProps): React.ReactElement {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const docRef = useRef<Document | null>(null);
  const actsRef = useRef<CuiBehavior[]>([]);
  const hlRef = useRef<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);
  const [pick, setPick] = useState<CuiPick | null>(null);
  const [toast, setToast] = useState('');
  const [result, setResult] = useState<CuiCompileResult>(() => compileCui(code));

  /* 界面结构由 .cui 自己长出来：一条规则 = 一个元件。
   * 只有结构真的变了才重建 iframe（改颜色不会打断预览里的交互）。 */
  const tree = useMemo(() => buildCuiTree(parseCui(code)), [code]);
  const treeHtml = useMemo(() => renderCuiTree(tree), [tree]);

  const toastTimer = useRef<number | null>(null);
  const say = useCallback((msg: string): void => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 1800);
  }, []);

  /* 序号防竞态：敲得快时只认最后一次的结果。
   *
   * 有 act / when click 的时候直接走 TS 编译器：Rust 内核目前只认样式，
   * 让它去解释行为行只会多出一堆无意义诊断。纯样式文件仍然优先问内核。 */
  const seqRef = useRef(0);
  useEffect(() => {
    const seq = ++seqRef.current;
    const ts = compileCui(code);
    actsRef.current = ts.behaviors;

    const hasLogic = ts.behaviors.length > 0 || /when\s+(click|input|change|submit|enter)/i.test(code);
    if (hasLogic) {
      setResult(ts);
      return;
    }

    let alive = true;
    void (async () => {
      try {
        const r = await api.cuiCompile(code);
        if (!alive || seq !== seqRef.current) return;
        setResult({
          css: r.css,
          diags: r.diags,
          behaviors: [],
          texts: r.texts,
          imgs: r.imgs,
          hints: [],
          declCount: r.decl_count,
          ruleCount: r.rule_count
        });
      } catch {
        if (!alive || seq !== seqRef.current) return;
        setResult(ts);
      }
    })();
    return () => { alive = false; };
  }, [code]);

  /* 交互脚本不能写成内联 <script>：
   * Tauri 会把自带初始化脚本的 sha256 塞进 CSP 的 script-src，而按 CSP 规范，
   * 一旦存在 hash/nonce，'unsafe-inline' 就整条失效 —— srcdoc 里的内联脚本会被静默拦掉，
   * 预览就成了一动不动的死图（连 blob: 当 src 也可能被 srcdoc 的继承策略拦下）。
   * 最稳的一条路：在父窗口里用 Function 求值，把 iframe 的 document/window 传进去，
   * 模板脚本是内建的、可信的，不走 eval 的只是 .cui 的行为（那部分本来就是纯 DOM 操作）。 */
  const srcDoc = useMemo(() => {
    const body = treeHtml;
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<style>${TOKEN_CSS}</style>
<style>${BASE_CSS}</style>
<style id="cui-style"></style>
</head><body>${body}</body></html>`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameKey, treeHtml]);

  const apply = useCallback((): void => {
    const d = frameRef.current?.contentDocument;
    if (!d) return;
    const style = d.getElementById('cui-style');
    if (style) style.textContent = result.css;
    for (const t of result.texts) {
      try { d.querySelectorAll(t.sel).forEach((el) => { el.textContent = t.text; }); } catch { /* 选择器无效就跳过 */ }
    }
    for (const im of result.imgs) {
      try { d.querySelectorAll(im.sel).forEach((el) => { el.setAttribute('src', im.src); }); } catch { /* 同上 */ }
    }
    for (const h of result.hints) {
      try { d.querySelectorAll(h.sel).forEach((el) => { el.setAttribute('placeholder', h.text); }); } catch { /* 同上 */ }
    }
  }, [result]);

  useEffect(() => {
    if (ready) apply();
  }, [ready, apply]);

  /* ── 互动：点/输入时执行 behaviors（全是声明式 DOM 操作；call 才进 Copper） ── */
  const logicRef = useRef<Record<string, string>>({});
  logicRef.current = preview?.logic ?? {};

  const runActs = useCallback((kind: string, target: Element | null): void => {
    const d = docRef.current;
    if (!d || !target) return;
    for (const b of actsRef.current) {
      if (b.event !== kind) continue;
      let hit: Element | null = null;
      try { hit = b.sel ? target.closest(b.sel) : null; } catch { hit = null; }
      if (!hit) continue;
      const a = b.action;
      if (a.kind === 'call') {
        /* Copper 函数：把被点元素的选择器传进去（#id 优先） */
        const main = Object.keys(logicRef.current).find((k) => k.replace(/\\/g, '/') === 'app/main.co')
          ?? Object.keys(logicRef.current)[0];
        if (!main) {
          say('act call ' + a.arg + '：这个工程还没有前端逻辑文件（app/main.co）');
          continue;
        }
        callCopperFn(logicRef.current, main.replace(/\\/g, '/'), a.arg, selectorOfHit(hit), (m) => say('⚠ ' + m));
        continue;
      }
      let nodes: Element[] = [];
      try {
        nodes = a.target ? Array.from(d.querySelectorAll(a.target)) : [hit];
      } catch {
        nodes = [hit];
      }
      for (const n of nodes) {
        if (a.kind === 'add') n.classList.add(a.arg);
        else if (a.kind === 'remove') n.classList.remove(a.arg);
        else if (a.kind === 'toggle') n.classList.toggle(a.arg);
        else if (a.kind === 'text') {
          if (n instanceof HTMLInputElement || n instanceof HTMLTextAreaElement) n.value = a.arg;
          else n.textContent = a.arg;
        }
        else if (a.kind === 'say') say(a.arg);
        else if (a.kind === 'go') say(a.arg);
      }
    }
  }, [say]);

  const highlight = useCallback((el: HTMLElement | null): void => {
    if (hlRef.current) {
      hlRef.current.style.outline = '';
      hlRef.current.style.outlineOffset = '';
    }
    hlRef.current = el;
    if (el) {
      el.style.outline = '2px solid #0f9d58';
      el.style.outlineOffset = '2px';
    }
  }, []);

  const onDocClick = useCallback((ev: Event): void => {
    const t = ev.target as Element | null;
    runActs('click', t);
    if (!t) return;
    const boxed = (t.closest('[data-t]') ?? t) as HTMLElement;
    const next: CuiPick = {
      tag: boxed.getAttribute('data-t') ?? '',
      cls: typeof boxed.className === 'string' ? boxed.className : '',
      id: boxed.id ?? ''
    };
    highlight(boxed);
    setPick(next);
  }, [runActs, highlight]);

  const onDocInput = useCallback((ev: Event): void => {
    runActs(ev.type, ev.target as Element | null);
  }, [runActs]);

  /* 输入框里按回车 = when enter 事件 */
  const onDocKeydown = useCallback((ev: Event): void => {
    const e = ev as KeyboardEvent;
    if (e.key !== 'Enter') return;
    const t = ev.target;
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) runActs('enter', t);
  }, [runActs]);

  /* 注入界面宿主：page.* 从这一刻起有界面可操作（预览的 document） */
  const injectBridge = useCallback((): void => {
    const d = docRef.current;
    if (!d) return;
    setPageBridge(createPageBridge(d, say));
  }, [say]);

  const attach = useCallback((): void => {
    const d = frameRef.current?.contentDocument;
    if (!d) return;
    docRef.current = d;
    d.addEventListener('click', onDocClick, true);
    d.addEventListener('input', onDocInput, true);
    d.addEventListener('change', onDocInput, true);
    d.addEventListener('submit', (e) => { e.preventDefault(); onDocInput(e); }, true);
    d.addEventListener('keydown', onDocKeydown, true);
    apply();
    injectBridge();
  }, [onDocClick, onDocInput, onDocKeydown, apply, injectBridge]);

  useEffect(() => { setReady(false); setPick(null); }, [frameKey]);

  const matched = useMemo(
    () => (pick ? findRuleForPick(parseCui(code), pick) : null),
    [code, pick]
  );

  const commit = useCallback((prop: string, raw: string): void => {
    const value = raw.trim();
    if (!pick || !value || !onPatch) return;
    onPatch(pick, prop, value);
    say(`${pickLabel(pick)}：${prop} ${value}`);
  }, [pick, onPatch, say]);

  const errors = result.diags.filter((d) => d.level === 'error');

  return (
    <div className="cui-pane">
      <div className="cui-pane-head">
        <span className="cui-pane-title">Copper UI</span>
        <span className="cui-pane-sub">.cui</span>
        <span className="cui-bar-gap" />
        <span className="cui-stat">
          {result.ruleCount} 条规则 · {result.declCount} 条属性
          {preview?.logic && Object.keys(preview.logic).length > 0 ? ' · 可交互' : ''}
        </span>
        {errors.length > 0 && <span className="cui-badge err">{errors.length} 个错误</span>}
        {result.diags.length > errors.length && (
          <span className="cui-badge warn">{result.diags.length - errors.length} 个提示</span>
        )}
      </div>

      <iframe
        ref={frameRef}
        key={frameKey ?? 'default'}
        className="cui-pane-frame"
        title="Copper UI 预览"
        srcDoc={srcDoc}
        sandbox="allow-same-origin allow-scripts"
        onLoad={() => { setReady(true); attach(); }}
      />

      {toast && <div className="cui-toast">{toast}</div>}

      <div className="cui-inspect">
        {pick ? (
          <>
            <div className="cui-inspect-head">
              <span className="cui-pick-sel">{pickLabel(pick)}</span>
              {matched
                ? <span className="cui-pick-line">第 {matched.span.line} 行</span>
                : <span className="cui-pick-line">还没有对应规则</span>}
              <span className="cui-bar-gap" />
              <button className="cui-mini" onClick={() => { highlight(null); setPick(null); }}>取消选中</button>
            </div>
            <div className="cui-inspect-fields">
              {INSPECT_PROPS.map((f) => {
                const cur = matched?.decls.find((d) => d.prop === f.prop);
                return (
                  <label key={f.prop} className="cui-field">
                    <span>{f.label}</span>
                    <input
                      key={`${f.prop}:${matched?.span.line ?? 0}:${valueText(cur?.values[0])}`}
                      defaultValue={valueText(cur?.values[0])}
                      placeholder={f.hint}
                      onKeyDown={(e) => { if (e.key === 'Enter') commit(f.prop, e.currentTarget.value); }}
                      onBlur={(e) => commit(f.prop, e.currentTarget.value)}
                    />
                  </label>
                );
              })}
            </div>
          </>
        ) : (
          <span className="cui-hint">点一下左边预览里的元素 → 下面直接改属性，代码自己写回去</span>
        )}
      </div>

      <div className="cui-pane-diags">
        {result.diags.length === 0
          ? <span className="cui-ok">语法没问题</span>
          : result.diags.map((d, i) => (
            <div key={i} className={d.level === 'error' ? 'cui-diag err' : 'cui-diag warn'}>
              第 {d.line} 行：{d.msg}
            </div>
          ))}
      </div>
    </div>
  );
}
