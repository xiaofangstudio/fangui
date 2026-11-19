/* FangUI 设计令牌 —— 整个框架的唯一取值来源。
 *
 * 三层：
 *   1. 尺度（SCALE）：间距、圆角、字号、控件高度、动效、层级——与主题无关，写死一次；
 *   2. 主题（THEMES）：亮 / 暗两套底色、文本、描边、语义色；
 *   3. 强调色（ACCENTS）：绿（默认）/ 蓝 / 紫 / 琥珀 / 玫红，亮暗各一份。
 *
 * 组件层只许引用 CSS 变量（var(--xxx)），不许出现字面色值；
 * 想改全站长相，改这里，或者运行时给根元素挂 data-theme / data-accent。
 */

export type ThemeName = 'light' | 'dark';
export type AccentName = 'green' | 'blue' | 'violet' | 'amber' | 'rose';

/** 与主题无关的尺度。数字即 px，只有动效带单位。 */
export const SCALE = {
  /** 八点栅格（1 就是 4px，命名走 1..6 而不是 xs/s/m，避免和控件尺寸混淆） */
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 36 },
  radius: { xs: 2, s: 4, m: 8, l: 12, xl: 16, full: 999 },
  font: { xs: 12, sm: 13, md: 14, lg: 20, xl: 28 },
  /** 控件高度：Fluent 的 24 / 32 / 40 三档 */
  control: { s: 24, m: 32, l: 40 },
  /** 图标尺寸 */
  icon: { s: 16, m: 20, l: 24 },
  line: { hair: 1, thick: 2 },
  motion: { fast: 120, base: 160, slow: 240 },
  ease: {
    standard: 'cubic-bezier(.2, .7, .3, 1)',
    out: 'cubic-bezier(.16, 1, .3, 1)',
    in: 'cubic-bezier(.4, 0, .8, .2)'
  },
  z: { base: 0, sticky: 10, dropdown: 15, overlay: 30, modal: 40, toast: 50, tooltip: 60 }
} as const;

/** 主题基色：亮/暗两套，不含品牌强调色。 */
type BaseColors = {
  canvas: string; surface: string; card: string; wash: string; sunken: string;
  hairline: string; line: string; edge: string;
  ink: string; soft: string; faint: string; ghost: string;
  control: string; controlHover: string; controlPressed: string; controlDisabled: string;
  field: string; fieldHover: string;
  track: string;
  ok: string; err: string; warn: string; info: string;
  dangerFill: string; onDanger: string;
  shadow1: string; shadow2: string; shadow3: string;
  scrim: string;
  focus: string;
  skeleton: string; skeletonShine: string;
};

export const THEMES: Record<ThemeName, BaseColors> = {
  light: {
    canvas: '#f7f7f7', surface: '#fafafa', card: '#ffffff', wash: '#f2f2f2', sunken: '#e8e8e8',
    hairline: '#efefef', line: '#e3e3e3', edge: '#cfcfcf',
    ink: '#16181a', soft: '#4b5054', faint: '#787e82', ghost: '#a8adb1',
    control: '#ffffff', controlHover: '#f6f7f7', controlPressed: '#edeff0', controlDisabled: '#f5f6f6',
    field: '#ffffff', fieldHover: '#fcfcfd',
    track: '#e6e8ea',
    ok: '#12783f', err: '#b42318', warn: '#8a5a00', info: '#0a63b0',
    dangerFill: '#c42b1c', onDanger: '#ffffff',
    shadow1: '0 1px 2px rgba(16, 24, 32, .06), 0 2px 8px rgba(16, 24, 32, .05)',
    shadow2: '0 2px 6px rgba(16, 24, 32, .07), 0 10px 24px rgba(16, 24, 32, .10)',
    shadow3: '0 8px 20px rgba(16, 24, 32, .10), 0 24px 56px rgba(16, 24, 32, .16)',
    scrim: 'rgba(14, 18, 20, .38)',
    focus: '#0d8a4c',
    skeleton: '#edeef0', skeletonShine: '#f8f9fa'
  },
  dark: {
    canvas: '#17191b', surface: '#1d2022', card: '#222527', wash: '#2a2e30', sunken: '#303538',
    hairline: '#2c3033', line: '#383d41', edge: '#454b4f',
    ink: '#e8eaeb', soft: '#bcc0c1', faint: '#8f9496', ghost: '#6b7072',
    control: '#26292b', controlHover: '#2c3032', controlPressed: '#33373a', controlDisabled: '#212426',
    field: '#1c1f21', fieldHover: '#202325',
    track: '#33383b',
    ok: '#4cc38a', err: '#f0716a', warn: '#e0a13e', info: '#6ab4ff',
    dangerFill: '#d13c2d', onDanger: '#ffffff',
    shadow1: '0 1px 2px rgba(0, 0, 0, .35), 0 2px 8px rgba(0, 0, 0, .28)',
    shadow2: '0 2px 8px rgba(0, 0, 0, .40), 0 12px 28px rgba(0, 0, 0, .36)',
    shadow3: '0 8px 24px rgba(0, 0, 0, .45), 0 28px 64px rgba(0, 0, 0, .48)',
    scrim: 'rgba(0, 0, 0, .55)',
    focus: '#34c07c',
    skeleton: '#2b2f32', skeletonShine: '#35393c'
  }
};

/** 一套强调色。亮暗各一份，值全部手写定死，不做运行时混色，颜色才算得准。 */
type AccentColors = {
  accent: string; primary: string; accentHover: string; accentPressed: string;
  tint: string; tone: string; onAccent: string; focus: string;
};

export const ACCENTS: Record<AccentName, Record<ThemeName, AccentColors>> = {
  green: {
    light: { accent: '#0d8a4c', primary: '#0f9d58', accentHover: '#11a65c', accentPressed: '#0a7040', tint: '#e8f7ee', tone: '#cdeed9', onAccent: '#ffffff', focus: '#0d8a4c' },
    dark: { accent: '#37c185', primary: '#2fae72', accentHover: '#48d394', accentPressed: '#2a9e6b', tint: '#19362a', tone: '#244b39', onAccent: '#04150d', focus: '#37c185' }
  },
  blue: {
    light: { accent: '#0b62c4', primary: '#0f72e0', accentHover: '#1174e6', accentPressed: '#094fa0', tint: '#e8f1fd', tone: '#cfdffb', onAccent: '#ffffff', focus: '#0b62c4' },
    dark: { accent: '#5aa9ff', primary: '#4a9bf5', accentHover: '#74b8ff', accentPressed: '#438edb', tint: '#14283c', tone: '#1d3a55', onAccent: '#04121f', focus: '#5aa9ff' }
  },
  violet: {
    light: { accent: '#6b3fc4', primary: '#7c4ddb', accentHover: '#7b4ddb', accentPressed: '#57329f', tint: '#efe9fd', tone: '#ded0f8', onAccent: '#ffffff', focus: '#6b3fc4' },
    dark: { accent: '#a98bfa', primary: '#9d7cf5', accentHover: '#b79ffc', accentPressed: '#9374e0', tint: '#241a38', tone: '#33254f', onAccent: '#0e061c', focus: '#a98bfa' }
  },
  amber: {
    light: { accent: '#a86200', primary: '#bd6f00', accentHover: '#bd6f00', accentPressed: '#8a5100', tint: '#fdf1dd', tone: '#f7dfb6', onAccent: '#ffffff', focus: '#a86200' },
    dark: { accent: '#e8a33c', primary: '#f0ad46', accentHover: '#f2b455', accentPressed: '#cc8a28', tint: '#2e2314', tone: '#47351d', onAccent: '#1b1204', focus: '#e8a33c' }
  },
  rose: {
    light: { accent: '#b42318', primary: '#c42b1c', accentHover: '#cc2a1e', accentPressed: '#941c12', tint: '#fdecea', tone: '#f8d5d2', onAccent: '#ffffff', focus: '#b42318' },
    dark: { accent: '#ff8b80', primary: '#ff7a6e', accentHover: '#ffa199', accentPressed: '#e2726a', tint: '#331917', tone: '#4c241f', onAccent: '#1a0504', focus: '#ff8b80' }
  }
};

export const DEFAULT_THEME: ThemeName = 'light';
export const DEFAULT_ACCENT: AccentName = 'green';

/** 作者可写的令牌名（值 → CSS 变量）。这份清单同时喂给补全、悬停文档和诊断。 */
export const TOKEN_GROUPS: { group: string; items: { name: string; desc: string }[] }[] = [
  {
    group: '表面',
    items: [
      { name: 'canvas', desc: '窗口底' },
      { name: 'surface', desc: '次级面（页头、表头）' },
      { name: 'card', desc: '卡片 / 浮层底' },
      { name: 'wash', desc: '浅底（hover 底、分组块）' },
      { name: 'sunken', desc: '凹底（轨道、输入内阴影）' }
    ]
  },
  {
    group: '线',
    items: [
      { name: 'hairline', desc: '发丝线（分隔、卡片描边）' },
      { name: 'line', desc: '常规描边' },
      { name: 'edge', desc: '强描边（输入框、轮廓按钮）' }
    ]
  },
  {
    group: '文字',
    items: [
      { name: 'ink', desc: '正文字色' },
      { name: 'soft', desc: '次级文字' },
      { name: 'faint', desc: '辅助文字' },
      { name: 'ghost', desc: '最淡（占位、禁用）' }
    ]
  },
  {
    group: '品牌',
    items: [
      { name: 'accent', desc: '强调色（实心按钮、选中态）' },
      { name: 'primary', desc: '主色（hover 档）' },
      { name: 'tint', desc: '强调色浅底' },
      { name: 'tone', desc: '强调色浅线' }
    ]
  },
  {
    group: '语义',
    items: [
      { name: 'ok', desc: '成功' },
      { name: 'warn', desc: '警告' },
      { name: 'err', desc: '错误 / 危险' },
      { name: 'info', desc: '信息' }
    ]
  },
  {
    group: '结构',
    items: [
      { name: 'focus', desc: '焦点环颜色' },
      { name: 'track', desc: '进度 / 滑杆轨道' },
      { name: 'overlay', desc: '遮罩底色' }
    ]
  }
];

/** 扁平清单：词法层认不认一个词是令牌，就查这个集合。 */
export const TOKEN_NAMES: string[] = TOKEN_GROUPS.flatMap((g) => g.items.map((i) => i.name));

/** 令牌名 → CSS 变量名。语义色带 sem- 前缀，其余直接用词。 */
export function cssVarOf(token: string): string {
  switch (token) {
    case 'ok': case 'warn': case 'err': case 'info':
      return `var(--sem-${token})`;
    case 'overlay':
      return 'var(--scrim)';
    default:
      return `var(--${token})`;
  }
}

/** 某个主题 + 强调色下，一个令牌的实际色值。编辑器色块、文档表格、测试都用它。 */
export function colorValue(token: string, theme: ThemeName = DEFAULT_THEME, accent: AccentName = DEFAULT_ACCENT): string {
  const base = THEMES[theme];
  const acc = ACCENTS[accent][theme];
  switch (token) {
    case 'accent': return acc.accent;
    case 'primary': return acc.primary;
    case 'tint': return acc.tint;
    case 'tone': return acc.tone;
    case 'focus': return acc.focus;
    case 'overlay': return base.scrim;
    default:
      return (base as unknown as Record<string, string>)[token] ?? '';
  }
}
