/* 前端编译：把 .cui + app/*.co 编译成一个能双击运行的桌面软件。
 *
 * 分层跟工程目录一致：
 *   app/xxx.cui  界面（Copper UI）→ 结构 + 样式 + 声明式行为
 *   app/xxx.co   前端逻辑（Copper）→ 以 Copper 源码内嵌，由 Copper 引擎执行
 *   srv/xxx.co   后端逻辑（Copper）→ 复制到产物旁，由启动器的 Copper 内核执行
 *
 * 产物：
 *   index.html   单文件，样式/结构/Copper 全部内联，断网也能开
 *   srv/*.co     后端源码，启动器的本地服务按需执行
 *   <名字>.exe   Rust 写的启动器（本地服务 + WebView2 窗口），双击即开
 *
 * 产物里没有第三种语言：没有手写的 JS——
 *   - 结构和样式由 .cui 编译生成；
 *   - 行为由 .cui 的 act 声明，引擎分发；
 *   - 前端逻辑就是 .co 原文，内嵌的 Copper 引擎在页面里解释执行；
 *   - 启动器是 float-launcher（本仓 Rust crate），后端也由它跑。
 *
 * ── CUI ↔ Copper 环境接入契约（等 Copper 改成环境模型后照此替换） ──
 * CUI 对 Copper 只认一座桥：act call / srv.call，签名固定为
 *   call(函数名, 被点元素选择器) → 无返回值（结果用 page.write 写回界面）
 * 桥的背后现在有三种实现，CUI 侧一行都不用改：
 *   1. IDE 预览：页面内解释器（pagehost.callCopperFn）
 *   2. AOT 产物：启动器本地服务 /api/call
 *   3. 将来的 Copper 环境：环境进程/IPC，只要实现同一个 call 签名即插即用
 * CUI 本体不随环境分发——它内置在 Float Studio 里（编译器/引擎/样式/图标），
 * AOT 产物再把引擎内联进 index.html；用户只装一个 Copper 环境，
 * Float IDE 与 Float Studio 共用。
 */

import type { CuiBehavior } from '../cui/ast';
import { compileCui } from '../cui/compile';
import { parseCui } from '../cui/parser';
import { buildCuiTree, renderCuiTree } from '../cui/tree';
import { BASE_CSS, TOKEN_CSS } from '../cui/sample';
import ENGINE from './cui-engine.iife.js?raw';

/** 编译产物需要的宿主能力：写文件与写启动器。由使用方注入（IDE 注入 Tauri，Node 注入 fs）。 */
export type AotHost = {
  mkdir(path: string): Promise<void>;
  writeFile(path: string, text: string): Promise<void>;
  /** 把内置的启动器写到目标路径，返回字节数；不支持就抛错 */
  writeLauncher(path: string): Promise<number>;
};

let aotHost: AotHost | null = null;

export function setAotHost(h: AotHost | null): void {
  aotHost = h;
}

function needAot(): AotHost {
  if (!aotHost) {
    throw new Error('编译产物需要宿主能力：先调用 setAotHost({ mkdir, writeFile, writeLauncher })');
  }
  return aotHost;
}

export type BuildFrontendArgs = {
  name: string;
  /** 入口 .cui 的相对路径，只用于日志 */
  cuiPath: string;
  cui: string;
  /** 前端 Copper 逻辑（app/*.co，相对路径 + 源码） */
  logic: { path: string; code: string }[];
  /** 后端 Copper 逻辑（srv/*.co），复制到产物目录，由启动器执行 */
  srv?: { path: string; code: string }[];
  /** app = 独立软件（带启动器）；html = 只出单文件网页 */
  kind?: 'app' | 'html';
  outDir: string;
};

export type BuildFrontendResult = {
  html: string;
  exe: string | null;
  warnings: string[];
  stats: { rules: number; decls: number; logic: number; bytes: number };
};

const RUNTIME_CSS = `
#cui-toast {
  position: fixed; left: 50%; bottom: 30px; transform: translateX(-50%);
  max-width: 80vw; padding: 8px 14px; border-radius: 8px;
  background: #171717; color: #fff; font-size: 12.5px; line-height: 1.5;
  opacity: 0; transition: opacity .18s; pointer-events: none; z-index: 9999;
}
`;

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** 行为表压成运行时数组：只留执行时要用的字段 */
function behaviorData(list: CuiBehavior[]): unknown[] {
  return list.map((b) => ({
    sel: b.sel,
    event: b.event,
    kind: b.action.kind,
    target: b.action.target,
    arg: b.action.arg
  }));
}

/** JSON 塞进 <script> 前把闭合序列干掉 */
function jsonForScript(v: unknown): string {
  return JSON.stringify(v).replace(/<\//g, '<\\/');
}

/** Copper 源码内嵌成数据块（type="text/copper"，浏览器不会执行它） */
function copperBlocks(logic: { path: string; code: string }[]): string {
  return logic
    .map(
      (f) =>
        `<script type="text/copper" data-page="${esc(f.path)}">\n${f.code.replace(
          /<\/script/gi,
          '<\\/script'
        )}\n</script>`
    )
    .join('\n');
}

/** 单文件 HTML：令牌 + 基础样式 + .cui 编译出来的样式 + .cui 长出来的结构 + Copper 引擎 + Copper 源码 */
export function renderAppHtml(
  name: string,
  cui: string,
  logic: { path: string; code: string }[]
): { html: string; stats: BuildFrontendResult['stats']; warnings: string[] } {
  const r = compileCui(cui);
  const tree = buildCuiTree(parseCui(cui));
  const body = renderCuiTree(tree);

  const warnings = [...tree.diags, ...r.diags].map(
    (d) => `${d.level === 'error' ? '错误' : '提示'} 第 ${d.line} 行：${d.msg}`
  );
  if (body.trim() === '') warnings.push('界面是空的：.cui 里没有能生成元件的规则');

  /* 前端逻辑主文件：优先 app/main.co，否则取第一个 */
  const main = logic.find((f) => f.path.replace(/\\/g, '/') === 'app/main.co')?.path ?? logic[0]?.path ?? '';

  const data = {
    behaviors: behaviorData(r.behaviors),
    pages: Object.fromEntries(logic.map((f) => [f.path.replace(/\\/g, '/'), f.code])),
    main: main.replace(/\\/g, '/')
  };

  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name)}</title>
<style>${TOKEN_CSS}${BASE_CSS}${r.css}\n${RUNTIME_CSS}</style>
</head>
<body>
${body}
<script type="application/json" id="cui-data">${jsonForScript(data)}</script>
<script>/* Copper 引擎（运行时，由 Copper 实现打包生成；里面没有手写脚本） */
${ENGINE}
</script>
${copperBlocks(logic)}
</body>
</html>
`;

  return {
    html,
    stats: { rules: r.ruleCount, decls: r.declCount, logic: logic.length, bytes: html.length },
    warnings
  };
}

function safeName(name: string): string {
  return (name || 'CopperApp').replace(/[\\/:*?"<>|]/g, '').trim() || 'CopperApp';
}

function joinPath(dir: string, name: string): string {
  return dir.replace(/[\\/]+$/, '') + '\\' + name;
}

/** 把 srv/*.co 复制到产物目录：启动器按同目录的 srv/ 找后端 */
async function writeSrv(outDir: string, srv: { path: string; code: string }[]): Promise<void> {
  if (srv.length === 0) return;
  const dir = joinPath(outDir, 'srv');
  await needAot().mkdir(dir);
  for (const f of srv) {
    const name = f.path.replace(/\\/g, '/').split('/').pop() ?? 'main.co';
    await needAot().writeFile(joinPath(dir, name), f.code);
  }
}

export async function buildFrontend(a: BuildFrontendArgs): Promise<BuildFrontendResult> {
  const built = renderAppHtml(a.name, a.cui, a.logic);
  const warnings = [...built.warnings];

  await needAot().mkdir(a.outDir);
  const htmlPath = joinPath(a.outDir, 'index.html');
  await needAot().writeFile(htmlPath, built.html);
  await writeSrv(a.outDir, a.srv ?? []);

  let exe: string | null = null;
  if ((a.kind ?? 'app') === 'app') {
    try {
      const r = await needAot().writeLauncher(joinPath(a.outDir, safeName(a.name) + '.exe'));
      if (r > 0) exe = joinPath(a.outDir, safeName(a.name) + '.exe');
    } catch (e) {
      warnings.push(`启动器没写出来（index.html 仍可直接打开）：${String(e)}`);
    }
  }

  return { html: htmlPath, exe, warnings, stats: built.stats };
}

/** 多目标编译：第一个是主软件（放输出根目录），其余各进 apps/<名字>/ */
export type BuildTargetsArgs = {
  /** 主软件名（工程名） */
  name: string;
  targets: { rel: string; text: string }[];
  logic: { path: string; code: string }[];
  srv?: { path: string; code: string }[];
  outDir: string;
  kind: 'app' | 'html';
};

export type BuildTargetsResult = {
  items: { rel: string; dir: string; html: string; exe: string | null }[];
  warnings: string[];
};

function slug(rel: string): string {
  const base = (rel.replace(/\\/g, '/').split('/').pop() ?? rel).replace(/\.cui$/i, '');
  return base.replace(/[\\/:*?"<>|\s]+/g, '').trim() || 'page';
}

export async function buildTargets(a: BuildTargetsArgs): Promise<BuildTargetsResult> {
  const items: BuildTargetsResult['items'] = [];
  const warnings: string[] = [];

  for (let i = 0; i < a.targets.length; i++) {
    const t = a.targets[i];
    const isMain = i === 0;
    const dir = isMain ? a.outDir : joinPath(joinPath(a.outDir, 'apps'), slug(t.rel));
    const name = isMain ? a.name : slug(t.rel);
    const r = await buildFrontend({
      name,
      cuiPath: t.rel,
      cui: t.text,
      logic: a.logic,
      srv: a.srv,
      kind: a.kind,
      outDir: dir
    });
    warnings.push(...r.warnings);
    items.push({ rel: t.rel, dir, html: r.html, exe: r.exe });
  }

  return { items, warnings };
}
