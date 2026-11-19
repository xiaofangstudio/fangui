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

import { callCopperFn, createPageBridge, selectorOfHit, setPageBridge } from '../lang/pagehost';
import { setFsBridge } from '../lang/builtins';
import { attachCuiRuntime, type CuiRunBehavior } from '../cui/runtime';

/* 产物里的宿主能力：页面由启动器的本地服务提供，所以 net.* / srv.call
 * 用同源 fetch 就能通。文件系统不开放——前端 Copper 不该碰磁盘。 */
setFsBridge({
  read: async () => null,
  write: async () => false,
  append: async () => false,
  has: async () => false,
  http: async (method, url, body) => {
    const r = await fetch(url, { method, body });
    return await r.text();
  },
  host: async () => ({
    pid: 0,
    platform: 'web',
    cwd: '',
    temp: '',
    home: '',
    ip: location.hostname,
    args: [],
    env: {}
  })
});

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

const BEH: CuiRunBehavior[] = (Array.isArray(data.behaviors) ? data.behaviors : []).map((b) => ({
  sel: b.sel,
  event: b.event,
  action: { kind: b.kind, target: b.target, arg: b.arg }
}));

/* 事件分发、act 动作、go 切页、图标注入全部走同一份 runtime.ts：
 * 预览里怎么动，装出来的软件就怎么动。 */
attachCuiRuntime(document, BEH, {
  say,
  call: (fn, hit) => callCopperFn(data.pages, data.main, fn, selectorOfHit(hit), (m) => say('⚠ ' + m))
});
