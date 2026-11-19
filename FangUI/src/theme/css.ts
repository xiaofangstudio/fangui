/* 令牌 → CSS 变量表。
 *
 * 生成四个层次，顺序即优先级：
 *   :root                      亮色基色 + 默认强调色
 *   [data-theme="dark"]        暗色基色
 *   [data-accent="blue"]       换强调色（亮）
 *   [data-theme="dark"][data-accent="blue"]  换强调色（暗）
 *
 * 宿主只要把这一段塞进 <style> 或 dist/fangui.css，界面就有一套完整令牌。
 */

import type { AccentName, ThemeName } from './tokens';
import { ACCENTS, DEFAULT_ACCENT, DEFAULT_THEME, SCALE, THEMES } from './tokens';

/** 把数字补成 px，字符串原样。 */
const px = (v: number | string): string => (typeof v === 'number' ? `${v}px` : v);

/** 基础变量：尺度 + 动效 + 层级。与主题无关，只写一次。 */
function scaleVars(): string {
  const out: string[] = [];
  for (const [k, v] of Object.entries(SCALE.space)) out.push(`  --space-${k}: ${px(v)};`);
  for (const [k, v] of Object.entries(SCALE.radius)) out.push(`  --radius-${k}: ${px(v)};`);
  for (const [k, v] of Object.entries(SCALE.font)) out.push(`  --font-${k}: ${px(v)};`);
  for (const [k, v] of Object.entries(SCALE.control)) out.push(`  --control-${k}: ${px(v)};`);
  for (const [k, v] of Object.entries(SCALE.icon)) out.push(`  --icon-${k}: ${px(v)};`);
  for (const [k, v] of Object.entries(SCALE.motion)) {
    out.push(k === 'base' ? `  --dur: ${v}ms;` : `  --dur-${k}: ${v}ms;`);
  }
  for (const [k, v] of Object.entries(SCALE.ease)) out.push(`  --ease${k === 'standard' ? '' : '-' + k}: ${v};`);
  for (const [k, v] of Object.entries(SCALE.z)) out.push(`  --z-${k}: ${v};`);
  /* 编译器写死的几个动画变量，指到同一套尺度上 */
  out.push('  --cui-dur: var(--dur);');
  out.push('  --cui-anim-dur: var(--dur-slow);');
  out.push('  --cui-ease: var(--ease);');
  out.push('  --ease-soft: cubic-bezier(.22, 1, .36, 1);');
  return out.join('\n');
}

/** 主题色变量。 */
function themeVars(theme: ThemeName, accent: AccentName): string {
  const c = THEMES[theme];
  const a = ACCENTS[accent][theme];
  return [
    `  --canvas: ${c.canvas};`,
    `  --surface: ${c.surface};`,
    `  --card: ${c.card};`,
    `  --wash: ${c.wash};`,
    `  --sunken: ${c.sunken};`,
    `  --hairline: ${c.hairline};`,
    `  --line: ${c.line};`,
    `  --edge: ${c.edge};`,
    `  --ink: ${c.ink};`,
    `  --soft: ${c.soft};`,
    `  --faint: ${c.faint};`,
    `  --ghost: ${c.ghost};`,
    `  --control: ${c.control};`,
    `  --control-hover: ${c.controlHover};`,
    `  --control-pressed: ${c.controlPressed};`,
    `  --control-disabled: ${c.controlDisabled};`,
    `  --field: ${c.field};`,
    `  --field-hover: ${c.fieldHover};`,
    `  --track: ${c.track};`,
    `  --skeleton: ${c.skeleton};`,
    `  --skeleton-shine: ${c.skeletonShine};`,
    `  --sem-ok: ${c.ok};`,
    `  --sem-err: ${c.err};`,
    `  --sem-warn: ${c.warn};`,
    `  --sem-info: ${c.info};`,
    `  --danger-fill: ${c.dangerFill};`,
    `  --on-danger: ${c.onDanger};`,
    `  --shadow-1: ${c.shadow1};`,
    `  --shadow-2: ${c.shadow2};`,
    `  --shadow-3: ${c.shadow3};`,
    `  --scrim: ${c.scrim};`,
    `  --accent: ${a.accent};`,
    `  --primary: ${a.primary};`,
    `  --accent-hover: ${a.accentHover};`,
    `  --accent-pressed: ${a.accentPressed};`,
    `  --tint: ${a.tint};`,
    `  --tone: ${a.tone};`,
    `  --on-accent: ${a.onAccent};`,
    `  --focus: ${a.focus};`
  ].join('\n');
}

/** 暗色选择器：根元素、window 元件、旧版 .night 类都认。 */
const DARK_SELECTORS = [
  '[data-theme="dark"]',
  '[data-t="window"][data-theme="dark"]',
  '[data-t="window"].night',
  '.night'
];

/** 所有强调色（除默认）的亮 / 暗选择器。 */
const ACCENT_NAMES: AccentName[] = ['green', 'blue', 'violet', 'amber', 'rose'];

export type ThemeCssOptions = {
  /** 前缀选择器，默认空（作用于 :root 与属性选择器） */
  prefix?: string;
  /** 是否输出暗色块，默认 true */
  dark?: boolean;
  /** 是否输出强调色块，默认 true */
  accents?: boolean;
};

/** 生成令牌 CSS。 */
export function themeCss(opts: ThemeCssOptions = {}): string {
  const prefix = opts.prefix ?? '';
  const blocks: string[] = [];

  blocks.push(`/* FangUI 令牌 · 亮色（默认 ${DEFAULT_ACCENT}） */
:root {
  color-scheme: light;
${scaleVars()}
${themeVars('light', DEFAULT_ACCENT)}
}`);

  if (opts.dark !== false) {
    const darkSel = DARK_SELECTORS.map((s) => (prefix ? `${prefix} ${s}` : s)).join(',\n');
    blocks.push(`/* 暗色：根、window 元件、旧版 .night 类 */
${darkSel} {
  color-scheme: dark;
${themeVars('dark', DEFAULT_ACCENT)}
}`);
  }

  if (opts.accents !== false) {
    for (const name of ACCENT_NAMES) {
      if (name === DEFAULT_ACCENT) continue;
      blocks.push(`/* 强调色：${name}（亮） */
[data-accent="${name}"] {
${themeVars('light', name)}
}`);
      if (opts.dark !== false) {
        blocks.push(`/* 强调色：${name}（暗） */
${DARK_SELECTORS.map((s) => `[data-theme="dark"][data-accent="${name}"]`).join(',\n')},
[data-t="window"].night[data-accent="${name}"] {
${themeVars('dark', name)}
}`);
      }
    }
  }

  return blocks.join('\n\n') + '\n';
}

/** 单主题（只亮或只暗）的精简令牌表，AOT 产物里想减体积时用。 */
export function themeCssOnly(theme: ThemeName = DEFAULT_THEME, accent: AccentName = DEFAULT_ACCENT): string {
  return `:root {
  color-scheme: ${theme};
${scaleVars()}
${themeVars(theme, accent)}
}\n`;
}

