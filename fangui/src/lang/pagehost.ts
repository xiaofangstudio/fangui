/* 界面逻辑宿主（page.* 命名空间的实现 + act call 的调度）。
 *
 * 分层规矩：.cui 管界面，app/*.co 管前端逻辑，srv/*.co 管后端。
 * 前端逻辑在两处运行：
 *   - IDE 的预览面板：CuiPane 注入 iframe 的 document；
 *   - AOT 编译出的软件：Copper 引擎（cui-engine.ts 打包的 IIFE）注入页面 document。
 * 两处用的是同一份 createPageBridge + callCopperFn。
 *
 * page.* 全部是同步的 DOM 操作，不会跑出死循环；真正的计算都在 Copper 里。
 */

import { Runner } from './interp';
import type { PageBridge } from './pagebridge';
import { goView } from '../cui/runtime';

export type { PageBridge } from './pagebridge';
export { setPageBridge } from './pagebridge';
export { needPageBridge } from './pagebridge';

/** 造一个桥。say 不给就什么都不弹。 */
export function createPageBridge(doc: Document, say?: (msg: string) => void): PageBridge {
  const first = (sel: string): Element | null => {
    try { return doc.querySelector(sel); } catch { return null; }
  };
  const all = (sel: string): Element[] => {
    try { return Array.from(doc.querySelectorAll(sel)); } catch { return []; }
  };
  const readOf = (el: Element): string => {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      return el.value;
    }
    if (el instanceof HTMLProgressElement) return String(el.value);
    return el.textContent ?? '';
  };
  const writeOf = (el: Element, value: string): void => {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      el.value = value;
    } else if (el instanceof HTMLProgressElement) {
      const n = Number(value);
      if (Number.isFinite(n)) el.value = n;
    } else {
      el.textContent = value;
    }
  };

  let cloneSeq = 0;
  const stripIds = (root: Element): void => {
    root.removeAttribute('id');
    for (const n of Array.from(root.querySelectorAll('[id]'))) n.removeAttribute('id');
  };

  return {
    read(sel) {
      const el = first(sel);
      if (!el) throw new Error(`page.read 找不到元素：${sel}`);
      return readOf(el);
    },
    write(sel, value) {
      const hits = all(sel);
      if (hits.length === 0) throw new Error(`page.write 找不到元素：${sel}`);
      for (const el of hits) writeOf(el, value);
    },
    add(sel, cls) {
      for (const el of all(sel)) el.classList.add(cls);
    },
    remove(sel, cls) {
      for (const el of all(sel)) el.classList.remove(cls);
    },
    toggle(sel, cls) {
      for (const el of all(sel)) el.classList.toggle(cls);
    },
    delete(sel) {
      for (const el of all(sel)) el.remove();
    },
    clone(sel, into) {
      const src = first(sel);
      if (!src) throw new Error(`page.clone 找不到元素：${sel}`);
      const parent = first(into);
      if (!parent) throw new Error(`page.clone 找不到目标容器：${into}`);
      const copy = src.cloneNode(true) as Element;
      stripIds(copy);
      cloneSeq += 1;
      const id = `c${cloneSeq}`;
      copy.setAttribute('id', id);
      parent.appendChild(copy);
      return '#' + id;
    },
    count(sel) {
      return all(sel).length;
    },
    say(msg) {
      say?.(msg);
    },
    focus(sel) {
      const el = first(sel);
      if (el instanceof HTMLElement) el.focus();
    },
    go(name) {
      goView(doc, name);
    }
  };
}

/** act call 的执行体：把 app/*.co 里的一个函数跑起来。
 *
 * 每次事件起一个独立的 Copper 运行器：界面状态都存在 DOM 里，
 * 函数之间不共享内存，跑多快、点多少次都不会互相踩。
 * 传给函数的参数是被点元素的选择器（#id 优先，没有就用元件 + 类）。
 */
export function callCopperFn(
  sources: Record<string, string>,
  main: string,
  fn: string,
  arg: string,
  onError: (msg: string) => void
): void {
  const entry = '@act-call.co';
  const map = new Map<string, string>();
  for (const [k, v] of Object.entries(sources)) map.set(k.replace(/\\/g, '/'), v);
  map.set(entry, `import "${main}"\n${fn}(${JSON.stringify(arg)})\n`);
  try {
    const runner = new Runner(entry, {
      output: () => {},
      report: () => {},
      onPaused: () => {},
      onDone: () => {},
      onState: () => {},
      onError: (info) => onError(`${fn}：${info.message}（第 ${info.line} 行）`)
    }, '/', map);
    runner.start('run');
  } catch (e) {
    onError(`${fn} 跑不起来：${e instanceof Error ? e.message : String(e)}`);
  }
}

/** 被点元素 → 稳定的选择器串。
 *
 * 自己有 #id 就直接用；没有就往上找最近一个带 #id 的祖先——
 * 这样「条目里的勾选按钮」能把整行（#t1）传给 Copper 函数，
 * 行内的小元件不用自己背 id。再没有就退回 data-t + 类名。
 */
export function selectorOfHit(el: Element | null): string {
  let cur: Element | null = el;
  while (cur) {
    if (cur.id) return '#' + cur.id;
    cur = cur.parentElement;
  }
  if (!el) return '';
  const t = el.getAttribute('data-t') ?? '';
  const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean) : [];
  return ([t ? `[data-t="${t}"]` : '', ...cls.map((c) => '.' + c)]).filter(Boolean).join('');
}
