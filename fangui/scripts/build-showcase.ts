/* 把一个 examples/<名字> 编译成单文件 HTML（含运行时），用来肉眼验收框架。
 *
 * 用法：npm run build:showcase [examples/icons]
 * 产物：<该例>/preview.html；不给参数就是默认的 kitchen
 */

import esbuild from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { compileCui } from '../src/cui/compile';
import { parseCui } from '../src/cui/parser';
import { renderCuiTree, buildCuiTree } from '../src/cui/tree';
import { BASE_CSS, TOKEN_CSS } from '../src/styles/index';

const root = process.cwd();
const arg = process.argv[2];
const rel = (arg ?? 'examples/kitchen').replace(/\\/g, '/').replace(/\/+$/, '');
const dir = join(root, rel);
const srcPath = join(dir, 'app', 'main.cui');
const outPath = join(dir, 'preview.html');

const cui = readFileSync(srcPath, 'utf8');
const compiled = compileCui(cui);
const tree = buildCuiTree(parseCui(cui));
const body = renderCuiTree(tree);

/* 运行时打成 IIFE 直接内联，产物断网可跑 */
const runtime = esbuild.buildSync({
  entryPoints: [join(root, 'src', 'cui', 'runtime.ts')],
  bundle: true,
  format: 'iife',
  globalName: 'FangUIRuntime',
  platform: 'browser',
  target: ['es2020'],
  minify: true,
  write: false
}).outputFiles[0].text;

const data = JSON.stringify({ behaviors: compiled.behaviors }).replace(/</g, '\\u003c');

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FangUI · 组件陈列</title>
<style>${TOKEN_CSS}\n${BASE_CSS}\n${compiled.css}</style>
</head>
<body>
${body}
<script type="application/json" id="cui-data">${data}</script>
<script>${runtime}</script>
<script>
(function () {
  var data = JSON.parse(document.getElementById('cui-data').textContent);
  var toast = document.querySelector('[data-t="toast"]');
  var timer = 0;
  function say(msg) {
    if (!toast) return;
    var label = toast.querySelector('[data-t="text"]') || toast;
    label.textContent = msg;
    toast.classList.add('open');
    clearTimeout(timer);
    timer = setTimeout(function () { toast.classList.remove('open'); }, 3200);
  }
  FangUIRuntime.attachCuiRuntime(document, data.behaviors, {
    say: say,
    call: function (fn) { say('call ' + fn + '()'); }
  });
})();
</script>
</body>
</html>
`;

mkdirSync(dir, { recursive: true });
writeFileSync(outPath, html, 'utf8');

const warnings = [...compiled.diags, ...tree.diags];
for (const w of warnings.slice(0, 8)) console.log(`第 ${w.line} 行 · ${w.msg}`);
console.log(`${rel}/preview.html  ${(html.length / 1024).toFixed(1)} KB · ${compiled.ruleCount} 条规则 · ${warnings.length} 条诊断`);
if (warnings.some((w) => w.level === 'error')) process.exitCode = 1;
