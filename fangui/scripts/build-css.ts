/* 生成 dist/fangui.css 与 dist/fangui.min.css —— 让不跑 TS 的宿主也能直接 <link>。
 *
 * 用法：npm run build:css
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { COMPONENTS } from '../src/cui/components';
import { ACCENTS, TOKEN_NAMES } from '../src/theme/tokens';
import { fanguiCss } from '../src/styles/index';

const root = process.cwd();
const dist = join(root, 'dist');
mkdirSync(dist, { recursive: true });

const css = fanguiCss();

/** 轻量压缩：去注释、合并空白、去掉符号两侧的空格。CSS 语义不变。 */
function minify(input: string): string {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};:,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

const banner = `/*!
 * FangUI · ${COMPONENTS.length} 个元件 · ${TOKEN_NAMES.length} 个令牌 · ${Object.keys(ACCENTS).length} 套强调色
 * 小方工作室 · MIT · https://github.com/xiaofangstudio/fangui
 * 由 npm run build:css 生成，勿手改；改源码后重新构建。
 */
`;

writeFileSync(join(dist, 'fangui.css'), banner + css, 'utf8');
const small = banner + minify(css);
writeFileSync(join(dist, 'fangui.min.css'), small, 'utf8');

const kb = (n: number): string => `${(n / 1024).toFixed(1)} KB`;
console.log(`dist/fangui.css      ${kb(Buffer.byteLength(banner + css))}`);
console.log(`dist/fangui.min.css  ${kb(Buffer.byteLength(small))}`);
