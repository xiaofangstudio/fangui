/* 前端编译：把 .cui + app/*.co 编译成一个能双击运行的桌面软件。
 *
 * 分层跟工程目录一致：
 *   app/xxx.cui  界面（Copper UI）→ 结构 + 样式 + 声明式行为
 *   app/xxx.co   前端逻辑（Copper）→ 以 Copper 源码内嵌，由 Copper 引擎执行
 *   srv/xxx.co   后端逻辑（Copper）→ 不进前端产物，留在内核里跑
 *
 * 产物只有两样东西：
 *   index.html   单文件，样式/结构/Copper 全部内联，断网也能开
 *   <名字>.exe   C# 写的启动器，优先用 Edge 的 --app 全窗口打开，
 *                没有 Edge 就交给系统默认浏览器
 *
 * 产物里没有第三种语言：没有手写的 JS——
 *   - 结构和样式由 .cui 编译生成；
 *   - 行为由 .cui 的 act 声明，引擎分发；
 *   - 前端逻辑就是 .co 原文，内嵌的 Copper 引擎（cui-engine.iife.js，
 *     由本仓的 Copper 实现打包）在页面里解释执行。
 *
 * 为什么不直接用 Tauri 打一个壳：前端编译要的是"三秒出结果"，
 * 调 csc.exe 编一个几十 KB 的启动器，比再走一遍 Rust 链接快得多。
 */

import type { CuiBehavior } from '../cui/ast';
import { compileCui } from '../cui/compile';
import { parseCui } from '../cui/parser';
import { buildCuiTree, renderCuiTree } from '../cui/tree';
import { BASE_CSS, TOKEN_CSS } from '../cui/sample';
import { api } from './tauri';
import ENGINE from './cui-engine.iife.js?raw';

export type BuildFrontendArgs = {
  name: string;
  /** 入口 .cui 的相对路径，只用于日志 */
  cuiPath: string;
  cui: string;
  /** 前端 Copper 逻辑（app/*.co，相对路径 + 源码） */
  logic: { path: string; code: string }[];
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

/** 启动器源码：纯 ASCII，csc 不需要 BOM 也能正确读 */
const LAUNCHER_CS = `using System;
using System.Diagnostics;
using System.IO;
using System.Text;

class CopperLaunch
{
    static void Main()
    {
        string dir = AppDomain.CurrentDomain.BaseDirectory;
        string html = Path.Combine(dir, "index.html");
        if (!File.Exists(html)) return;

        string edge = "";
        string cfg = Path.Combine(dir, "edge.txt");
        try { if (File.Exists(cfg)) edge = File.ReadAllText(cfg, Encoding.UTF8).Trim(); } catch { }

        if (edge.Length > 0 && File.Exists(edge))
        {
            try
            {
                string uri = new Uri(html).AbsoluteUri;
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = edge;
                psi.Arguments = "--app=\\"" + uri + "\\" --window-size=1100,780";
                psi.UseShellExecute = false;
                Process.Start(psi);
                return;
            }
            catch { }
        }

        try { Process.Start(html); } catch { }
    }
}
`;

function safeName(name: string): string {
  return (name || 'CopperApp').replace(/[\\/:*?"<>|]/g, '').trim() || 'CopperApp';
}

function joinPath(dir: string, name: string): string {
  return dir.replace(/[\\/]+$/, '') + '\\' + name;
}

/** 编译启动器 exe。失败不致命：index.html 本身已经能双击打开。 */
async function buildLauncher(exePath: string, tempDir: string): Promise<{ exe: string | null; warn?: string }> {
  const csPath = joinPath(tempDir, 'copper-launch.cs');
  await api.fsWrite(csPath, LAUNCHER_CS);

  const cscs = [
    'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe',
    'C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe'
  ];
  let last = '';
  for (const csc of cscs) {
    const cmd = `"${csc}" /nologo /target:winexe /out:"${exePath}" "${csPath}"`;
    const r = await api.hostRunCmd(cmd, tempDir).catch((e) => ({ code: -1, out: String(e) }));
    if (r.code === 0) return { exe: exePath };
    last = r.out.trim();
  }
  return { exe: null, warn: `启动器没编译出来（index.html 仍可直接打开）：${last.slice(-200)}` };
}

export async function buildFrontend(a: BuildFrontendArgs): Promise<BuildFrontendResult> {
  const built = renderAppHtml(a.name, a.cui, a.logic);
  const warnings = [...built.warnings];

  await api.fsMkdir(a.outDir);
  const htmlPath = joinPath(a.outDir, 'index.html');
  await api.fsWrite(htmlPath, built.html);

  /* Edge 路径落到产物旁边：exe 自己读，避免命令行参数里的中文/引号问题 */
  let edge = '';
  try {
    const env = await api.detectEnv();
    edge = env.edge ?? env.chrome ?? '';
  } catch { /* 没有环境探测就交给默认浏览器 */ }
  await api.fsWrite(joinPath(a.outDir, 'edge.txt'), edge).catch(() => {});

  let exe: string | null = null;
  try {
    const temp = (await api.hostInfo()).temp;
    const r = await buildLauncher(joinPath(a.outDir, safeName(a.name) + '.exe'), temp);
    exe = r.exe;
    if (r.warn) warnings.push(r.warn);
  } catch (e) {
    warnings.push(`启动器没编译出来（index.html 仍可直接打开）：${String(e)}`);
  }

  return { html: htmlPath, exe, warnings, stats: built.stats };
}
