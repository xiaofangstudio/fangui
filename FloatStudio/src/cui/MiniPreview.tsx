/* 教程里的小预览：一段 .cui → 直接渲染出效果。
 *
 * 和主预览面板同源（同一个编译器、同一套令牌与基础样式）。
 * v2 起结构不用再手写：规则自己长元件，缩进就是层级。
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { compileCui } from './compile';
import { parseCui } from './parser';
import { buildCuiTree, renderCuiTree } from './tree';
import { BASE_CSS, TOKEN_CSS } from './sample';

/* 教程演示用的版式：不是整窗界面的示例居中摆，写了 win 的示例铺满 */
const VIEW_CSS = `
html, body { height: 100%; margin: 0; }
body { display: flex; align-items: center; justify-content: center; overflow: auto; background: #ffffff; }
body > [data-t="win"] { width: 100%; height: 100%; }
body > :not([data-t="win"]) { margin: 14px; max-width: calc(100% - 28px); }
`;

/** act say 的提示条：画在 iframe 文档里，跟着预览走 */
function sayIn(d: Document, msg: string): void {
  let tip = d.getElementById('cui-mini-toast') as HTMLDivElement | null;
  if (!tip) {
    tip = d.createElement('div');
    tip.id = 'cui-mini-toast';
    tip.style.cssText = 'position:fixed;left:50%;bottom:12px;transform:translateX(-50%);padding:6px 12px;'
      + 'border-radius:7px;background:#171717;color:#fff;font-size:12px;opacity:0;'
      + 'transition:opacity .16s;pointer-events:none;z-index:99';
    d.body.appendChild(tip);
  }
  tip.textContent = msg;
  tip.style.opacity = '1';
  window.setTimeout(() => { if (tip) tip.style.opacity = '0'; }, 1600);
}

export type MiniPreviewProps = {
  /** 要渲染的 .cui 源码 */
  code: string;
  /** 旧版手写结构；不给就完全由 .cui 生成 */
  html?: string;
  /** 需要交互的演示可以带脚本 */
  script?: string;
  height?: number;
};

export function MiniPreview({ code, html, script, height = 200 }: MiniPreviewProps): React.ReactElement {
  const compiled = useMemo(() => compileCui(code), [code]);
  const bodyHtml = useMemo(
    () => html ?? renderCuiTree(buildCuiTree(parseCui(code))),
    [code, html]
  );
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);

  const srcDoc = useMemo(() => `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<style>${TOKEN_CSS}</style>
<style>${BASE_CSS}</style>
<style>${VIEW_CSS}</style>
<style id="cui-style"></style>
</head><body>${bodyHtml}${script ? `<script>${script}</script>` : ''}</body></html>`, [bodyHtml, script]);

  const apply = useCallback((): void => {
    const d = frameRef.current?.contentDocument;
    if (!d) return;
    const style = d.getElementById('cui-style');
    if (style) style.textContent = compiled.css;
    /* text / src / hint 不走 CSS，逐条写进元素 */
    for (const t of compiled.texts) {
      try { d.querySelectorAll(t.sel).forEach((el) => { el.textContent = t.text; }); } catch { /* 选择器无效就跳过 */ }
    }
    for (const im of compiled.imgs) {
      try { d.querySelectorAll(im.sel).forEach((el) => { el.setAttribute('src', im.src); }); } catch { /* 同上 */ }
    }
    for (const h of compiled.hints) {
      try { d.querySelectorAll(h.sel).forEach((el) => { el.setAttribute('placeholder', h.text); }); } catch { /* 同上 */ }
    }
  }, [compiled]);

  useEffect(() => {
    if (ready) apply();
  }, [ready, apply]);

  /* 事件行（when click + act …）在教程预览里也要真的能用 */
  const runActs = useCallback((kind: string, target: Element | null): void => {
    const d = frameRef.current?.contentDocument;
    if (!d || !target || !target.closest) return;
    for (const b of compiled.behaviors) {
      if (b.event !== kind) continue;
      let hit: Element | null = null;
      try { hit = b.sel ? target.closest(b.sel) : null; } catch { hit = null; }
      if (!hit) continue;
      let nodes: Element[] = [];
      try {
        nodes = b.action.target ? Array.from(d.querySelectorAll(b.action.target)) : [hit];
      } catch { nodes = [hit]; }
      for (const n of nodes) {
        const a = b.action;
        if (a.kind === 'add') n.classList.add(a.arg);
        else if (a.kind === 'remove') n.classList.remove(a.arg);
        else if (a.kind === 'toggle') n.classList.toggle(a.arg);
        else if (a.kind === 'text') n.textContent = a.arg;
        else if (a.kind === 'say' || a.kind === 'go') sayIn(d, a.arg);
      }
    }
  }, [compiled]);

  useEffect(() => {
    const d = frameRef.current?.contentDocument;
    if (!d || !ready) return;
    const onEvent = (e: Event): void => runActs(e.type, e.target as Element | null);
    d.addEventListener('click', onEvent, true);
    d.addEventListener('input', onEvent, true);
    d.addEventListener('change', onEvent, true);
    d.addEventListener('submit', onEvent, true);
    return () => {
      d.removeEventListener('click', onEvent, true);
      d.removeEventListener('input', onEvent, true);
      d.removeEventListener('change', onEvent, true);
      d.removeEventListener('submit', onEvent, true);
    };
  }, [ready, runActs]);

  return (
    <div className="tut-view">
      <div className="tut-view-head">写出来是这样</div>
      <iframe
        ref={frameRef}
        className="tut-view-frame"
        style={{ height }}
        title="Copper UI 效果预览"
        srcDoc={srcDoc}
        sandbox="allow-same-origin allow-scripts"
        onLoad={() => { setReady(true); apply(); }}
      />
      <div className="tut-view-foot">
        {compiled.ruleCount} 条规则 · {compiled.declCount} 条属性
        {compiled.diags.length > 0 && <span className="tut-view-warn">{compiled.diags.length} 条提示</span>}
      </div>
    </div>
  );
}
