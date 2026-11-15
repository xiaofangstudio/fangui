/* Copper UI 的词汇表：元件、属性、状态、事件、令牌、别名。
 *
 * 这里是唯一的"真相源"——解析器靠它判断一行是属性还是选择器，
 * 编译器靠它把属性翻成 CSS，编辑器的补全与悬停文档也从这里取。
 *
 * 命名规矩（v3 定案）：
 *   1. 全部用完整的短词，绝不用字母缩写：button / background / padding /
 *      radius / border / layout —— 一眼能读懂，不用查表；
 *   2. 多词属性用空格分开（line height、text align），跟 Copper 的 dict read 一致；
 *   3. 美式为主名，英式为别名（colour / centre / grey）；
 *   4. v2 之前的字母缩写（btn / bg / pad …）全部保留为别名，旧文件照常编译。
 */

/** 元件类型。全部小写完整词，能当选择器用。 */
export const ELEMENTS: { name: string; desc: string }[] = [
  { name: 'window', desc: '窗口根容器' },
  { name: 'box', desc: '通用容器（分组、卡片）' },
  { name: 'row', desc: '横向排列容器' },
  { name: 'column', desc: '纵向排列容器' },
  { name: 'text', desc: '文本' },
  { name: 'button', desc: '按钮' },
  { name: 'input', desc: '单行输入框' },
  { name: 'textarea', desc: '多行输入框' },
  { name: 'image', desc: '图片' },
  { name: 'list', desc: '列表容器' },
  { name: 'item', desc: '列表项' },
  { name: 'checkbox', desc: '复选框' },
  { name: 'radio', desc: '单选框' },
  { name: 'slider', desc: '滑块' },
  { name: 'progress', desc: '进度条' },
  { name: 'scroll', desc: '滚动容器' },
  { name: 'spacer', desc: '弹性占位' }
];

/** 旧缩写 → 完整词。旧 .cui 文件里写 btn 一样能编译。 */
export const ELEMENT_ALIAS: Record<string, string> = {
  win: 'window',
  col: 'column',
  btn: 'button',
  area: 'textarea',
  img: 'image',
  lst: 'list',
  chk: 'checkbox',
  prog: 'progress'
};

export const ELEMENT_NAMES = new Set(ELEMENTS.map((e) => e.name));

/** 元件词全集（完整词 + 旧缩写），解析器判断"这是不是元件名"用 */
export const ALL_ELEMENT_WORDS = new Set([...ELEMENT_NAMES, ...Object.keys(ELEMENT_ALIAS)]);

/** 元件名归一化：完整词原样，旧缩写翻译过来，不认识的原样返回 */
export function elementName(w: string): string {
  return ELEMENT_ALIAS[w] ?? w;
}

/** 交互与位置状态，写在 `when` 后面。 */
export const STATES: { name: string; desc: string; css: string }[] = [
  { name: 'hover', desc: '鼠标悬停', css: ':hover' },
  { name: 'pressed', desc: '按下', css: ':active' },
  { name: 'disabled', desc: '禁用', css: ':disabled' },
  { name: 'focus', desc: '获得焦点', css: ':focus' },
  { name: 'checked', desc: '已勾选', css: ':checked' },
  { name: 'even', desc: '偶数项', css: ':nth-child(even)' },
  { name: 'odd', desc: '奇数项', css: ':nth-child(odd)' },
  { name: 'first', desc: '第一项', css: ':first-child' },
  { name: 'last', desc: '最后一项', css: ':last-child' }
];

export const STATE_MAP = new Map(STATES.map((s) => [s.name, s.css]));

/** 事件状态：写在 `when` 后面，不生成 CSS，而是变成事件入口。
 *
 * 为什么要它：光有 hover/focus 只能变样子，点一下什么都不会发生。
 * `when click` 把样式和行为绑在同一个选择器上，.cui 才是一个界面文件，
 * 而不是一张画。`enter` 是输入框里按回车——做"添加"最顺手。
 */
export const EVENTS = [
  { name: 'click', desc: '点击时', dom: 'click' },
  { name: 'input', desc: '输入时', dom: 'input' },
  { name: 'change', desc: '值改变时', dom: 'change' },
  { name: 'submit', desc: '提交时', dom: 'submit' },
  { name: 'enter', desc: '输入框里按回车时', dom: 'enter' }
] as const;

export type CuiDomEvent = 'click' | 'input' | 'change' | 'submit' | 'enter';

export const EVENT_MAP = new Map<string, CuiDomEvent>(
  EVENTS.map((e) => [e.name, e.dom])
);

/** 主题令牌：编译成 var(--xxx)。全部是看得懂的完整词。
 *
 * 分四组：表面（背景由浅到深）、线（边框由浅到深）、文字（由深到浅）、
 * 主色（主色 / 强调 / 浅底 / 浅线），外加 ok / err / warn / info 四个语义色。
 */
export const TOKENS = [
  'canvas', 'surface', 'card', 'wash', 'sunken',
  'hairline', 'line', 'edge',
  'ink', 'soft', 'faint', 'ghost',
  'accent', 'primary', 'tint', 'tone',
  'ok', 'err', 'warn', 'info'
];

/** v2 的字母令牌 → v3 的完整词。旧文件里的 s0 / a2 照常编译。 */
export const TOKEN_ALIAS: Record<string, string> = {
  s0: 'canvas', s1: 'surface', s2: 'card', s3: 'wash', s4: 'sunken',
  b1: 'hairline', b2: 'line', b3: 'edge',
  t1: 'ink', t2: 'soft', t3: 'faint', t4: 'ghost',
  a1: 'accent', a2: 'primary', a3: 'tint', a4: 'tone'
};

/** 令牌归一化：完整词原样，旧字母令牌翻译过来 */
export function tokenName(w: string): string {
  return TOKEN_ALIAS[w] ?? w;
}

/** 词法层认的全集：完整词 + 旧缩写。写 a1 和写 accent 是同一个东西。 */
export const ALL_TOKEN_WORDS = new Set<string>([...TOKENS, ...Object.keys(TOKEN_ALIAS)]);

/** 令牌在预览里的实际色值（浅色主题），仅供内建示例使用。 */
export const TOKEN_COLORS: Record<string, string> = {
  canvas: '#f7f7f7', surface: '#fbfbfb', card: '#ffffff', wash: '#f3f3f3', sunken: '#e9e9e9',
  hairline: '#f0f0f0', line: '#e4e4e4', edge: '#d0d0d0',
  ink: '#171717', soft: '#4a4a4a', faint: '#7a7a7a', ghost: '#a9a9a9',
  accent: '#0d8a4c', primary: '#0f9d58', tint: '#e8f7ee', tone: '#cdeed9',
  ok: '#1a7f47', err: '#b42318', warn: '#8a5a00', info: '#0f9d58',
  /* 旧令牌也留着，教程里的旧片段不至于失色 */
  s0: '#f7f7f7', s1: '#fbfbfb', s2: '#ffffff', s3: '#f3f3f3', s4: '#e9e9e9',
  b1: '#f0f0f0', b2: '#e4e4e4', b3: '#d0d0d0',
  t1: '#171717', t2: '#4a4a4a', t3: '#7a7a7a', t4: '#a9a9a9',
  a1: '#0d8a4c', a2: '#0f9d58', a3: '#e8f7ee', a4: '#cdeed9'
};

/** 属性值的语义类别，决定编译时怎么处理。 */
export type PropType = 'len' | 'num' | 'color' | 'kw' | 'text' | 'shadow' | 'any';

export type PropDef = {
  /** 主名，也是写代码时的推荐写法 */
  name: string;
  /** 对应的 CSS 属性；空字符串表示由本层解析成多条 */
  css: string;
  type: PropType;
  /** 允许写多个空格分隔的值（如 padding 8 16） */
  multi?: boolean;
  desc: string;
};

export const PROPS: PropDef[] = [
  /* ── 尺寸 ── */
  { name: 'width', css: 'width', type: 'len', desc: '宽度；也可写 fill（撑满）或 fit（贴合内容）' },
  { name: 'height', css: 'height', type: 'len', desc: '高度；也可写 fill 或 fit' },
  { name: 'min width', css: 'min-width', type: 'len', desc: '最小宽度' },
  { name: 'max width', css: 'max-width', type: 'len', desc: '最大宽度' },
  { name: 'min height', css: 'min-height', type: 'len', desc: '最小高度' },
  { name: 'max height', css: 'max-height', type: 'len', desc: '最大高度' },
  { name: 'padding', css: 'padding', type: 'len', multi: true, desc: '内边距，1~4 个值' },
  { name: 'margin', css: 'margin', type: 'len', multi: true, desc: '外边距，1~4 个值' },
  { name: 'border', css: 'border', type: 'any', desc: '边框，如 border 1 line' },
  { name: 'border color', css: 'border-color', type: 'color', desc: '边框颜色' },
  { name: 'border width', css: 'border-width', type: 'len', desc: '边框粗细' },
  { name: 'radius', css: 'border-radius', type: 'len', desc: '圆角' },
  { name: 'boxing', css: 'box-sizing', type: 'kw', desc: '盒模型，默认 border' },

  /* ── 布局 ── */
  { name: 'layout', css: 'display', type: 'kw', desc: '布局方式：flow / row / column / stack / grid' },
  { name: 'direction', css: 'flex-direction', type: 'kw', desc: '主轴方向：row / column' },
  { name: 'justify', css: 'justify-content', type: 'kw', desc: '主轴对齐：start / end / center / between / around' },
  { name: 'align', css: 'align-items', type: 'kw', desc: '交叉轴对齐：start / end / center / stretch' },
  { name: 'self align', css: 'align-self', type: 'kw', desc: '自身在交叉轴的对齐' },
  { name: 'gap', css: 'gap', type: 'len', desc: '子元素间距' },
  { name: 'wrap', css: 'flex-wrap', type: 'kw', desc: '是否换行：nowrap / wrap' },
  { name: 'grow', css: 'flex-grow', type: 'num', desc: '放大比例' },
  { name: 'shrink', css: 'flex-shrink', type: 'num', desc: '收缩比例' },
  { name: 'basis', css: 'flex-basis', type: 'len', desc: '基准尺寸' },
  { name: 'position', css: 'position', type: 'kw', desc: '定位：flow / absolute / fixed / sticky' },
  { name: 'inset', css: 'inset', type: 'len', multi: true, desc: '定位偏移，1~4 个值' },
  { name: 'depth', css: 'z-index', type: 'num', desc: '层叠顺序，大的在上面' },
  { name: 'overflow', css: 'overflow', type: 'kw', desc: '溢出处理：show / hide / scroll / auto' },
  { name: 'columns', css: 'grid-template-columns', type: 'any', multi: true, desc: '网格列，如 columns repeat(3, 1fr)' },
  { name: 'rows', css: 'grid-template-rows', type: 'any', multi: true, desc: '网格行，如 rows 40 1fr' },
  { name: 'align content', css: 'align-content', type: 'kw', desc: '多行时的交叉轴分布：start / center / between' },
  { name: 'order', css: 'order', type: 'num', desc: '排列顺序，小的在前' },
  { name: 'aspect', css: 'aspect-ratio', type: 'any', multi: true, desc: '宽高比，如 aspect 16 9' },
  { name: 'cursor', css: 'cursor', type: 'kw', desc: '鼠标形状：pointer / text / move / not / grab' },

  /* ── 文本 ── */
  { name: 'text', css: '', type: 'text', desc: '文本内容，支持 "你好，{name}" 插值' },
  { name: 'hint', css: '', type: 'text', desc: '输入框的提示文字（placeholder），input / textarea 用' },
  { name: 'type', css: '', type: 'text', desc: 'input 的类型：text / password / number / checkbox …' },
  { name: 'font', css: 'font-family', type: 'kw', desc: '字体族' },
  { name: 'size', css: 'font-size', type: 'len', desc: '字号' },
  { name: 'weight', css: 'font-weight', type: 'kw', desc: '字重：light / regular / medium / semibold / bold' },
  { name: 'color', css: 'color', type: 'color', desc: '文字颜色' },
  { name: 'line height', css: 'line-height', type: 'num', desc: '行高倍数' },
  { name: 'text align', css: 'text-align', type: 'kw', desc: '水平对齐：start / center / end' },
  { name: 'letter spacing', css: 'letter-spacing', type: 'len', desc: '字间距' },
  { name: 'lines', css: '-webkit-line-clamp', type: 'num', desc: '最多显示几行' },
  { name: 'ellipsis', css: 'text-overflow', type: 'kw', desc: '溢出省略：clip / ellipsis' },
  { name: 'text transform', css: 'text-transform', type: 'kw', desc: '大小写：upper / lower / capital / none' },
  { name: 'white space', css: 'white-space', type: 'kw', desc: '换行规则：wrap / nowrap / pre' },

  /* ── 背景与视觉 ── */
  { name: 'background', css: 'background', type: 'color', desc: '背景色 / 渐变' },
  { name: 'source', css: '', type: 'text', desc: '图片地址（image 元件用），支持 data: / http: / 工程内相对路径' },
  { name: 'fit', css: 'object-fit', type: 'kw', desc: '图片填充：cover / contain / fill' },
  { name: 'opacity', css: 'opacity', type: 'num', desc: '不透明度 0~1' },
  { name: 'shadow', css: 'box-shadow', type: 'shadow', desc: '投影，如 shadow 0 2 8 0 ghost' },
  { name: 'glow', css: 'box-shadow', type: 'shadow', desc: '外发光（与 shadow 同槽）' },
  { name: 'blur', css: 'filter', type: 'len', desc: '模糊半径' },
  { name: 'filter', css: 'filter', type: 'any', multi: true, desc: '滤镜链，如 filter blur(4) brightness(1.2)' },

  /* ── 变换 ── */
  { name: 'move', css: 'translate', type: 'any', multi: true, desc: '平移，如 move 4 -2' },
  { name: 'scale', css: 'scale', type: 'num', multi: true, desc: '缩放' },
  { name: 'rotate', css: 'rotate', type: 'any', desc: '旋转，如 rotate 45' },
  { name: 'origin', css: 'transform-origin', type: 'kw', desc: '变换原点' },

  /* ── 动效 ── */
  { name: 'transition', css: 'transition-property', type: 'kw', multi: true, desc: '参与过渡的属性名' },
  { name: 'duration', css: 'transition-duration', type: 'any', desc: '过渡时长，如 duration 160' },
  { name: 'ease', css: 'transition-timing-function', type: 'kw', desc: '缓动曲线' }
];

/** 别名（旧缩写 + 英式写法）→ 主名。matchProp 按这里归一化。 */
export const PROP_ALIASES: Record<string, string> = {
  /* 旧缩写（v2 及更早） */
  pad: 'padding',
  mar: 'margin',
  bd: 'border',
  'bd color': 'border color',
  'bd width': 'border width',
  rad: 'radius',
  lay: 'layout',
  dir: 'direction',
  pos: 'position',
  ins: 'inset',
  z: 'depth',
  ovf: 'overflow',
  op: 'opacity',
  bg: 'background',
  'bg color': 'background',
  src: 'source',
  dur: 'duration',
  padding_top: 'padding',
  /* 英式与常见变体 */
  colour: 'color',
  centre: 'center',
  grey: 'gray',
  'background color': 'background',
  'background colour': 'background',
  'border colour': 'border color',
  display: 'layout',
  'gap-px': 'gap',
  'font size': 'size',
  'font weight': 'weight',
  'text colour': 'color'
};

/** 属性名长度降序，保证 `multi word` 先于单词匹配 */
export const PROP_BY_NAME = new Map(PROPS.map((p) => [p.name, p]));

const CJK = /[\u3000-\u9fff\uff00-\uffef]/;

/** 判断一个 token 是否可能是属性名的一部分（只允许字母、下划线、中文） */
export const isNameToken = (s: string): boolean => /^[A-Za-z_][A-Za-z0-9_]*$/.test(s) || CJK.test(s);

/**
 * 把一行开头的属性名归一化。
 * 返回命中的主名与消耗掉的词数（多词属性会消耗 2~3 个词）。
 */
export function matchProp(words: string[]): { prop: PropDef; used: number; raw: string } | null {
  for (let n = Math.min(3, words.length); n >= 1; n--) {
    const raw = words.slice(0, n).join(' ');
    if (!isNameToken(words[0])) return null;
    const key = raw.toLowerCase();
    const main = PROP_ALIASES[key] ?? key;
    const def = PROP_BY_NAME.get(main);
    if (def) return { prop: def, used: n, raw };
  }
  return null;
}
