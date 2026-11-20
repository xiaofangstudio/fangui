/* .cui 的运行时：一套代码，三处共用。
 *
 *   - IDE 预览（CuiPane）
 *   - 教程预览（MiniPreview）
 *   - AOT 编译出的软件（cui-engine.ts 打包成 IIFE）
 *
 * 只做四件事：
 *   1. 事件分发（click / input / change / submit / enter / keydown）
 *   2. 声明式动作（add / remove / toggle / text / say / go / call / theme / open / close / accent / copy）
 *   3. 交互语义（多页切换、浮层开关、Esc 关闭、点遮罩关闭、焦点陷阱、页签方向键）
 *   4. 图标注入
 *
 * 动作全是声明式 DOM 操作，不会跑出任意代码；只有 call 才进 Copper。
 */

import { applyIcons } from './icons';

export type CuiRunAction = { kind: string; target: string; arg: string };
export type CuiRunBehavior = { sel: string; event: string; action: CuiRunAction };

export type CuiRuntimeOptions = {
  /** act say 的提示条 */
  say?: (msg: string) => void;
  /** act call：把 Copper 函数名和被点元素交给宿主 */
  call?: (fn: string, hit: Element) => void;
};

/** 能被"打开 / 关闭"的浮层元件。 */
const PANEL_KINDS = ['overlay', 'drawer', 'popover', 'menu', 'toast', 'modal'];
/** 关闭时只认这几类（modal 关的是它外面的 overlay）。 */
const CLOSABLE = ['overlay', 'drawer', 'popover', 'menu', 'toast'];
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const kindOf = (el: Element): string => el.getAttribute('data-t') ?? '';

/** 从被点元素往上找最近的浮层（含自己）。 */
function nearestPanel(el: Element, kinds: string[] = PANEL_KINDS): Element | null {
  let cur: Element | null = el;
  while (cur) {
    if (kinds.includes(kindOf(cur))) return cur;
    cur = cur.parentElement;
  }
  return null;
}

/** 被点元素里面第一个浮层（按钮里塞菜单 / 浮层的写法）。 */
function panelInside(el: Element): Element | null {
  return el.querySelector('[data-t="menu"], [data-t="popover"], [data-t="overlay"], [data-t="drawer"], [data-t="toast"]');
}

/** 多页切换：把 data-view / #id 匹配的那一页设为 .active，其余页藏起来。
 *  名字带不带 # 都行（act go #home 与 act go home 等价）。 */
export function goView(doc: Document, name: string): void {
  const wanted = name.trim().replace(/^#/, '');
  const views = Array.from(doc.querySelectorAll('[data-view]'));
  if (views.length === 0) return;
  let hit: Element | null = null;
  if (wanted) {
    hit = views.find((v) => v.getAttribute('data-view') === wanted || v.id === wanted) ?? null;
  }
  for (const v of views) {
    const on = v === hit;
    v.classList.toggle('active', on);
    /* 页签跟着亮：同一页里 data-view 的名字对应的 tab 互相对应 */
    if (on) v.setAttribute('aria-hidden', 'false');
    else v.setAttribute('aria-hidden', 'true');
  }
}

/** 首次渲染：没有哪一页自己是 active 时，显示第一页。
 *  这样单页应用（只有一个 view）也不会白屏。 */
export function activateFirstView(doc: Document): void {
  const views = Array.from(doc.querySelectorAll('[data-view]'));
  if (views.length === 0) return;
  if (views.some((v) => v.classList.contains('active'))) return;
  views[0].classList.add('active');
}

function writeText(el: Element, value: string): void {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    el.value = value;
  } else {
    el.textContent = value;
  }
}

/** 打开一个浮层：加 .open，遮罩类顺便管焦点。 */
function openPanel(el: Element, restore: Map<Element, Element>): void {
  el.classList.add('open');
  const kind = kindOf(el);
  if (kind === 'overlay' || kind === 'drawer') {
    const active = el.ownerDocument.activeElement;
    if (active instanceof Element && !el.contains(active)) restore.set(el, active);
    const first = el.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus({ preventScroll: true });
  }
  /* 轻提示不是常驻的：4 秒自己走，写 sticky 类可以钉住 */
  if (kind === 'toast' && !el.classList.contains('sticky')) {
    const doc = el.ownerDocument;
    const timer = doc.defaultView?.setTimeout(() => el.classList.remove('open'), 4000);
    if (timer) toastTimers.set(el, timer);
  }
}

function closePanel(el: Element, restore: Map<Element, Element>): void {
  el.classList.remove('open');
  const timer = toastTimers.get(el);
  if (timer) {
    el.ownerDocument.defaultView?.clearTimeout(timer);
    toastTimers.delete(el);
  }
  const back = restore.get(el);
  if (back instanceof HTMLElement && back.isConnected) back.focus({ preventScroll: true });
  restore.delete(el);
}

const toastTimers = new WeakMap<Element, number>();

/** 把行为表挂到 document 上：click / input / change / submit / enter / keydown。
 *  返回解绑函数（预览重建时调用），宿主可以反复挂、反复拆。 */
export function attachCuiRuntime(
  doc: Document,
  behaviors: CuiRunBehavior[],
  opts: CuiRuntimeOptions = {}
): () => void {
  const restore = new Map<Element, Element>();

  const query = (sel: string): Element[] => {
    try {
      return Array.from(doc.querySelectorAll(sel));
    } catch {
      return [];
    }
  };

  const run = (event: string, target: EventTarget | null): void => {
    if (!(target instanceof Element)) return;
    for (const b of behaviors) {
      if (b.event !== event) continue;
      let hit: Element | null = null;
      try {
        hit = b.sel ? target.closest(b.sel) : null;
      } catch {
        continue;
      }
      if (!hit) continue;

      const a = b.action;
      switch (a.kind) {
        case 'call': opts.call?.(a.arg, hit); continue;
        case 'say': opts.say?.(a.arg); continue;
        case 'go': goView(doc, a.arg); continue;

        case 'theme': {
          /* 换主题：写 data-theme，整棵界面（含根元素）一起换 */
          const wanted = a.arg.trim().toLowerCase();
          doc.documentElement.setAttribute('data-theme', wanted);
          for (const w of query('[data-t="window"]')) w.setAttribute('data-theme', wanted);
          continue;
        }

        case 'motion': {
          /* 图标动画开关：改 m-hover / m-always / m-still 这套类。
             类这条路是 Copper 原生的（page.add / page.remove 就能改），
             运行时和脚本共用同一个开关。 */
          const wanted = (a.arg || 'hover').trim().toLowerCase();
          const modes = ['m-hover', 'm-always', 'm-still'];
          const nodes = a.target ? query(a.target) : [hit];
          for (const n of nodes) {
            const all = [n, ...Array.from(n.querySelectorAll('[data-t="icon"]'))];
            for (const k of all) {
              if (!k.matches?.('[data-t="icon"]')) continue;
              k.classList.remove(...modes);
              k.classList.add('m-' + wanted);
              k.setAttribute('data-motion', wanted);
            }
          }
          continue;
        }

        case 'zoom': {
          /* 无极缩放：值来自动作参数，或读触发滑块（act zoom 不带值）。
             夹在 0.5–4 之间，免得一次误操作把界面缩没。 */
          const raw = a.arg === 'from' || !a.arg ? (hit as HTMLInputElement)?.value : a.arg;
          const n = Number(raw);
          if (!Number.isFinite(n)) continue;
          const z = Math.min(4, Math.max(0.5, n));
          const nodes = a.target ? query(a.target) : query('[data-t="window"]');
          const list = nodes.length > 0 ? nodes : [doc.documentElement];
          for (const el of list) {
            (el as HTMLElement).style.zoom = String(z);
            el.dispatchEvent(new CustomEvent('cui-zoom', { detail: z, bubbles: true }));
          }
          continue;
        }

        case 'accent': {
          const wanted = a.arg.trim().toLowerCase();
          doc.documentElement.setAttribute('data-accent', wanted);
          for (const w of query('[data-t="window"]')) w.setAttribute('data-accent', wanted);
          continue;
        }

        case 'copy': {
          const text = a.arg || (a.target ? query(a.target).map((n) => n.textContent ?? '').join('\n') : hit.textContent) || '';
          void copyText(doc, text);
          opts.say?.('已复制');
          continue;
        }

        case 'open':
        case 'close': {
          let nodes: Element[];
          if (a.target) nodes = query(a.target);
          else if (a.kind === 'open') {
            const inside = panelInside(hit);
            const owner = inside ?? nearestPanel(hit);
            nodes = owner ? [owner] : [];
          } else {
            const owner = nearestPanel(hit, CLOSABLE);
            nodes = owner ? [owner] : [];
          }
          for (const n of nodes) {
            if (a.kind === 'open') openPanel(n, restore);
            else closePanel(n, restore);
          }
          continue;
        }

        default: break;
      }

      /* add / remove / toggle / text：作用在 hit 自己或指定选择器 */
      const nodes = a.target ? query(a.target) : [hit];
      for (const n of nodes) {
        if (a.kind === 'add') n.classList.add(a.arg);
        else if (a.kind === 'remove') n.classList.remove(a.arg);
        else if (a.kind === 'toggle') n.classList.toggle(a.arg);
        else if (a.kind === 'text') writeText(n, a.arg);
      }
    }
  };

  /** 点标签也切换后面的勾选控件（label 没有 for，靠这条补上）。 */
  const toggleFromLabel = (target: Element): void => {
    if (kindOf(target) !== 'label') return;
    const next = target.nextElementSibling;
    if (!next) return;
    const k = kindOf(next);
    if (k !== 'checkbox' && k !== 'radio' && k !== 'switch') return;
    if (next instanceof HTMLInputElement) next.click();
  };

  const onClick = (e: MouseEvent): void => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    /* 点遮罩本身（不是点面板里）就关掉这层 */
    const scrim = t.closest('[data-t="overlay"].open');
    if (scrim && kindOf(t) === 'overlay') {
      closePanel(scrim, restore);
      return;
    }
    toggleFromLabel(t);
    run('click', t);
  };

  const onInput = (e: Event): void => run(e.type, e.target);
  const onSubmit = (e: Event): void => {
    e.preventDefault();
    run('submit', e.target);
  };

  const onKeydown = (e: KeyboardEvent): void => {
    const t = e.target;

    /* Esc：关掉最上面那层开着的浮层 */
    if (e.key === 'Escape') {
      const open = query('[data-t="overlay"].open, [data-t="drawer"].open, [data-t="popover"].open, [data-t="menu"].open, [data-t="toast"].open').pop();
      if (open) {
        closePanel(open, restore);
        e.preventDefault();
        return;
      }
    }

    /* 页签：左右方向键换焦点，Home / End 到两头 */
    if (t instanceof Element && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End')) {
      const tab = t.closest('[data-t="tab"]');
      const tabs = tab?.parentElement;
      if (tab && tabs && kindOf(tabs) === 'tabs') {
        const all = Array.from(tabs.querySelectorAll<HTMLElement>('[data-t="tab"]')).filter((x) => !x.hasAttribute('disabled'));
        const i = all.indexOf(tab as HTMLElement);
        if (i >= 0) {
          const next = e.key === 'Home' ? 0 : e.key === 'End' ? all.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length;
          all[next]?.focus();
          e.preventDefault();
          return;
        }
      }
    }

    /* 焦点陷阱：遮罩 / 抽屉开着时，Tab 在面板内循环 */
    if (e.key === 'Tab') {
      const panel = query('[data-t="overlay"].open, [data-t="drawer"].open').pop();
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((x) => !x.hasAttribute('disabled'));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!e.shiftKey && doc.activeElement === last) { first.focus(); e.preventDefault(); }
      else if (e.shiftKey && doc.activeElement === first) { last.focus(); e.preventDefault(); }
      return;
    }

    /* 换成 div 的按钮（里面装了菜单 / 浮层）：Enter / 空格键要能点 */
    if ((e.key === 'Enter' || e.key === ' ') && t instanceof Element) {
      const fake = t.closest('[role="button"][tabindex]');
      if (fake) {
        e.preventDefault();
        fake.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        return;
      }
    }

    /* 输入框回车：触发 when enter */
    if (e.key === 'Enter' && (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)) {
      run('enter', t);
    }
  };

  doc.addEventListener('click', onClick, true);
  doc.addEventListener('input', onInput, true);
  doc.addEventListener('change', onInput, true);
  doc.addEventListener('submit', onSubmit, true);
  doc.addEventListener('keydown', onKeydown, true);

  activateFirstView(doc);
  applyIcons(doc);

  return () => {
    doc.removeEventListener('click', onClick, true);
    doc.removeEventListener('input', onInput, true);
    doc.removeEventListener('change', onInput, true);
    doc.removeEventListener('submit', onSubmit, true);
    doc.removeEventListener('keydown', onKeydown, true);
  };
}

/** 复制：优先剪贴板 API，退化成临时 textarea（预览 iframe 里也能用）。 */
async function copyText(doc: Document, text: string): Promise<void> {
  try {
    await doc.defaultView?.navigator.clipboard?.writeText(text);
    return;
  } catch {
    /* 老宿主 / 没权限：走老办法 */
  }
  const ta = doc.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  doc.body.appendChild(ta);
  ta.select();
  try {
    doc.execCommand('copy');
  } finally {
    ta.remove();
  }
}

