/* 生成 docs/components.md 与 docs/tokens.md —— 文档永远和代码同源。
 *
 * 用法：npm run build:docs
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { COMPONENTS, COMPONENT_GROUPS, UTILITIES } from '../src/cui/components';
import { ACCENTS, SCALE, TOKEN_GROUPS, colorValue, THEMES } from '../src/theme/tokens';
import { ELEMENTS, PROPS, STATES, EVENTS } from '../src/cui/props';

const root = process.cwd();
const docs = join(root, 'docs');
mkdirSync(docs, { recursive: true });

/* ─────────────── 组件目录 ─────────────── */

const rows = COMPONENT_GROUPS.flatMap((group) => {
  const items = COMPONENTS.filter((c) => c.group === group);
  if (items.length === 0) return [];
  const table = [
    `### ${group}`,
    '',
    '| 元件 | 说明 | 变体 / 尺寸（写在元件名后当类名） | 常用属性 |',
    '| --- | --- | --- | --- |'
  ];
  for (const c of items) {
    const vs = [...c.variants.map((v) => `\`${v}\``), ...c.sizes.map((s) => `**${s}**`)].join(' ');
    const ps = c.props.map((p) => `\`${p}\``).join(' ');
    table.push(`| \`${c.name}\` | ${c.summary} | ${vs || '—'} | ${ps || '—'} |`);
  }
  const samples = items.filter((c) => c.sample).map((c) => [
    '',
    `**${c.name}**`,
    '',
    '```',
    c.sample,
    '```'
  ].join('\n')).join('\n');
  return [[...table, samples, ''].join('\n')];
});

const componentMd = `# FangUI 组件目录

> 本文件由 \`npm run build:docs\` 从 \`src/cui/components.ts\` 生成，别手改。
> 共 ${COMPONENTS.length} 个元件，${ELEMENTS.length} 个词（含别名），${PROPS.length} 个属性。

写法就一句：**元件名开头，类名跟在后面**。类名可以是变体、尺寸、语义色，顺序不限。

\`\`\`
button primary accent
    text "保存"
\`\`\`

尺寸只有三档：**s / m / l**（控件高 24 / 32 / 40）。变体只对"能点的元件"有意义，
容器类元件（card / section / grid）的类名是布局修饰。

## 通用工具类

${UTILITIES.map((u) => `\`${u}\``).join(' ')} —— 不写属性也能对齐，见 \`docs/guide.md\`。

${rows.join('\n')}
## 状态与事件

| \`when\` 状态 | 意思 |
| --- | --- |
${STATES.map((s) => `| \`${s.name}\` | ${s.desc} |`).join('\n')}

| \`when\` 事件 | 触发时机 |
| --- | --- |
${EVENTS.map((e) => `| \`${e.name}\` | ${e.desc} |`).join('\n')}

## 动作（\`act\`）

| 动作 | 写法 | 作用 |
| --- | --- | --- |
| \`add\` | \`act add active\` | 给被点元素（或 \`on 选择器\` 指定的）加类 |
| \`remove\` | \`act remove open on overlay confirm\` | 去掉类 |
| \`toggle\` | \`act toggle open on menu\` | 来回切 |
| \`text\` | \`act text note "已保存"\` | 改文字 / 改表单值 |
| \`say\` | \`act say "完成"\` | 交给宿主弹提示 |
| \`go\` | \`act go #settings\` | 切页（view） |
| \`call\` | \`act call save\` | 调 \`app/*.co\` 里的 Copper 函数 |
| \`theme\` | \`act theme dark\` | 换亮 / 暗主题 |
| \`accent\` | \`act accent blue\` | 换强调色（green / blue / violet / amber / rose） |
| \`open\` | \`act open\` / \`act open on drawer info\` | 打开浮层（遮罩 / 抽屉 / 菜单 / 轻提示） |
| \`close\` | \`act close\` | 关掉最近的浮层（Esc 也会做同一件事） |
| \`copy\` | \`act copy "文字"\` | 复制到剪贴板 |
`;

writeFileSync(join(docs, 'components.md'), componentMd, 'utf8');

/* ─────────────── 令牌表 ─────────────── */

const tokenRows = TOKEN_GROUPS.map((g) => {
  const rows = g.items.map((t) => {
    const light = colorValue(t.name, 'light', 'green');
    const dark = colorValue(t.name, 'dark', 'green');
    const swatch = light.startsWith('#') ? '`▇`' : '·';
    return `| \`${t.name}\` | ${t.desc} | ${swatch} \`${light}\` | \`${dark}\` |`;
  });
  return [`### ${g.group}`, '', '| 令牌 | 用途 | 亮色 | 暗色 |', '| --- | --- | --- | --- |', ...rows, ''].join('\n');
}).join('\n');

const scaleRows = [
  ['间距', Object.entries(SCALE.space).map(([k, v]) => `${k}=${v}px`).join(' · ')],
  ['圆角', Object.entries(SCALE.radius).map(([k, v]) => `${k}=${v}px`).join(' · ')],
  ['字号', Object.entries(SCALE.font).map(([k, v]) => `${k}=${v}px`).join(' · ')],
  ['控件高', Object.entries(SCALE.control).map(([k, v]) => `${k}=${v}px`).join(' · ')],
  ['图标', Object.entries(SCALE.icon).map(([k, v]) => `${k}=${v}px`).join(' · ')],
  ['动效', Object.entries(SCALE.motion).map(([k, v]) => `${k}=${v}ms`).join(' · ')],
  ['层级', Object.entries(SCALE.z).map(([k, v]) => `${k}=${v}`).join(' · ')]
].map(([k, v]) => `| ${k} | ${v} |`).join('\n');

const accentRows = (['green', 'blue', 'violet', 'amber', 'rose'] as const).map((name) => {
  const l = ACCENTS[name].light;
  const d = ACCENTS[name].dark;
  return `| \`${name}\`${name === 'green' ? '（默认）' : ''} | \`${l.accent}\` | \`${d.accent}\` |`;
}).join('\n');

const tokenMd = `# FangUI 令牌

> 由 \`npm run build:docs\` 从 \`src/theme/tokens.ts\` 生成，别手改。

令牌就是 \`.cui\` 里能直接写在属性值里的词：\`background canvas\`、\`color accent\`。
编译后是 \`var(--canvas)\` 这类 CSS 变量；换主题只换变量值，界面一个字都不用改。

## 颜色

${tokenRows}
## 尺度

| 类 | 取值 |
| --- | --- |
${scaleRows}

尺度不可换主题，只跟"密度"有关。想要更紧凑的界面，覆盖 \`--control-m\` 之类的变量即可。

## 强调色

挂 \`data-accent\` 到根元素或 window 就能整站换品牌色；\`.cui\` 里用 \`act accent blue\`。

| 名字 | 亮色 | 暗色 |
| --- | --- | --- |
${accentRows}

## 主题

\`data-theme="dark"\` 是暗色，\`light\` 是亮色。写在 \`window\` 元件上只影响这个窗口，
写在 \`<html>\` 上影响整页。旧写法 \`.night\` 类仍然认。

亮色底色：\`${THEMES.light.canvas}\` / 暗色：\`${THEMES.dark.canvas}\`。
`;

writeFileSync(join(docs, 'tokens.md'), tokenMd, 'utf8');

console.log(`docs/components.md  ${COMPONENTS.length} 个元件`);
console.log(`docs/tokens.md      ${TOKEN_GROUPS.reduce((n, g) => n + g.items.length, 0)} 个令牌`);
