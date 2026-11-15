/* Copper 引擎 —— 编译产物里的前端运行时（入口）。
 *
 * 这个文件会被 esbuild 打包成单个 IIFE（cui-engine.iife.js），内联进
 * AOT 产物的 index.html。它不是手写脚本：里面跑的是 Copper——
 *   - app/*.co 的源码以 <script type="text/copper"> 内嵌（数据，不是可执行脚本）；
 *   - 引擎读取 .cui 编译出的行为表（cui-data），把事件分发给行为；
 *   - act call 通过 Copper 运行器执行 app/*.co 里的函数（page.* 读写界面）。
 * 重新生成引擎：npx esbuild src/core/cui-engine.ts --bundle --minify
 *   --format=iife --platform=browser --outfile=src/core/cui-engine.iife.js
 */

import { Runner } from '../lang/interp';
import { callCopperFn, createPageBridge, selectorOfHit, setPageBridge } from '../lang/pagehost';

type EngineBehavior = {
  sel: string;
  event: string;
  /** aot.ts 把行为表压平后就是这个形状：kind/target/arg 跟 sel/event 同级 */
  kind: string;
  target: string;
  arg: string;
};

type EngineData = {
  behaviors: EngineBehavior[];
  /** app/*.co 的 Copper 源码，键是工程内相对路径 */
  pages: Record<string, string>;
  /** 前端逻辑主文件（import 入口） */
  main: string;
};

function readData(): EngineData {
  const el = document.getElementById('cui-data');
  if (!el) return { behaviors: [], pages: {}, main: '' };
  try {
    return JSON.parse(el.textContent || '{}') as EngineData;
  } catch {
    return { behaviors: [], pages: {}, main: '' };
  }
}

const data = readData();

/* 提示条：page.say 和错误信息都走这里 */
let tip: HTMLDivElement | null = null;
let tipTimer = 0;
function say(msg: string): void {
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'cui-toast';
    document.body.appendChild(tip);
  }
  tip.textContent = msg;
  tip.style.opacity = '1';
  window.clearTimeout(tipTimer);
  tipTimer = window.setTimeout(() => {
    if (tip) tip.style.opacity = '0';
  }, 2200);
}

/* 注入界面宿主：page.* 从这一刻起有界面可操作 */
setPageBridge(createPageBridge(document, say));

const BEH = Array.isArray(data.behaviors) ? data.behaviors : [];

function all(sel: string): Element[] {
  try {
    return Array.from(document.querySelectorAll(sel));
  } catch {
    return [];
  }
}

function runActs(ev: string, target: EventTarget | null): void {
  if (!(target instanceof Element)) return;
  for (const b of BEH) {
    if (b.event !== ev) continue;
    let hit: Element | null = null;
    try {
      hit = b.sel ? target.closest(b.sel) : null;
    } catch {
      continue;
    }
    if (!hit) continue;
    const kind = b.kind;
    const nodes = b.target ? all(b.target) : [hit];
    if (kind === 'add') {
      for (const n of nodes) n.classList.add(b.arg);
    } else if (kind === 'remove') {
      for (const n of nodes) n.classList.remove(b.arg);
    } else if (kind === 'toggle') {
      for (const n of nodes) n.classList.toggle(b.arg);
    } else if (kind === 'text') {
      for (const n of nodes) {
        if (n instanceof HTMLInputElement || n instanceof HTMLTextAreaElement) n.value = b.arg;
        else n.textContent = b.arg;
      }
    } else if (kind === 'say' || kind === 'go') {
      say(b.arg);
    } else if (kind === 'call') {
      /* Copper 函数：界面之外的计算归 Copper */
      callCopperFn(data.pages, data.main, b.arg, selectorOfHit(hit), (m) => say('⚠ ' + m));
    }
  }
}

document.addEventListener('click', (e) => runActs('click', e.target), true);
document.addEventListener('input', (e) => runActs('input', e.target), true);
document.addEventListener('change', (e) => runActs('change', e.target), true);
document.addEventListener('submit', (e) => runActs('submit', e.target), true);
document.addEventListener(
  'keydown',
  (e) => {
    if (e.key !== 'Enter') return;
    const t = e.target;
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) runActs('enter', t);
  },
  true
);
