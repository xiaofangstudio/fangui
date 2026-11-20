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

/* 令牌清单来自主题层（唯一真相源） */
import { TOKEN_NAMES, colorValue } from '../theme/tokens';

/** 元件类型。全部小写完整词，能当选择器用。 */
export const ELEMENTS: { name: string; desc: string }[] = [
  { name: 'window', desc: '窗口根容器' },
  { name: 'box', desc: '通用容器（分组、卡片）' },
  { name: 'row', desc: '横向排列容器' },
  { name: 'column', desc: '纵向排列容器' },
  { name: 'text', desc: '文本' },
  { name: 'code', desc: '等宽代码块（inline 类退化成行内片段）' },
  /* 行内语义：CUI 自己的词，不再需要 <b> <mark> 这些标签 */
  { name: 'strong', desc: '强调（加粗）' },
  { name: 'italic', desc: '侧重（斜体）' },
  { name: 'mark', desc: '高亮片段（底色随主题）' },
  { name: 'key', desc: '按键（等宽 + 下边框，像个键帽）' },
  { name: 'quote', desc: '引用块（左侧竖线）' },
  /* 结构：可折叠面板与画布 */
  { name: 'details', desc: '可折叠面板' },
  { name: 'summary', desc: '折叠面板的标题行' },
  { name: 'canvas', desc: '画布（图表 / 自绘图形，交给 CO 驱动）' },
  { name: 'button', desc: '按钮' },
  { name: 'input', desc: '单行输入框' },
  { name: 'textarea', desc: '多行输入框' },
  { name: 'image', desc: '图片' },
  { name: 'video', desc: '视频' },
  { name: 'audio', desc: '音频' },
  { name: 'frame', desc: '内嵌网页（iframe，可用 doc 写内联标记）' },
  { name: 'list', desc: '列表容器' },
  { name: 'item', desc: '列表项' },
  { name: 'checkbox', desc: '复选框' },
  { name: 'radio', desc: '单选框' },
  { name: 'slider', desc: '滑块' },
  { name: 'progress', desc: '进度条' },
  { name: 'scroll', desc: '滚动容器' },
  { name: 'spacer', desc: '弹性占位' },

  /* ── 页面骨架：一个完整应用由这几块拼起来 ── */
  { name: 'view', desc: '一页：配合 act go 切换的多页容器' },
  { name: 'header', desc: '页头' },
  { name: 'footer', desc: '页脚' },
  { name: 'navigation', desc: '导航栏（横排链接）' },
  { name: 'main', desc: '主内容区' },
  { name: 'aside', desc: '侧栏' },
  { name: 'section', desc: '带标题的内容分区' },
  { name: 'card', desc: '卡片（白底、圆角、发丝边）' },
  { name: 'grid', desc: '网格容器（自动等分列）' },
  { name: 'toolbar', desc: '工具栏（横排、可换行）' },
  { name: 'divider', desc: '分割线' },
  { name: 'heading', desc: '小标题' },
  { name: 'tabs', desc: '标签栏（装一排 tab）' },
  { name: 'tab', desc: '标签项（按钮）' },

  /* ── 表单 ── */
  { name: 'form', desc: '表单容器（when submit 收整张表）' },
  { name: 'field', desc: '一个字段（标签 + 控件）' },
  { name: 'label', desc: '字段标签' },
  { name: 'dropdown', desc: '下拉选择（option 装在里面）' },
  { name: 'option', desc: '下拉选项' },
  { name: 'switch', desc: '开关（默认关，加 checked 打开）' },

  /* ── 数据展示 ── */
  { name: 'table', desc: '表格（里面用 row / cell）' },
  { name: 'cell', desc: '表格单元格（table 里是 td）' },
  { name: 'badge', desc: '小徽标 / 计数' },
  { name: 'tag', desc: '标签（筛选条件、分类）' },
  { name: 'avatar', desc: '头像（圆形）' },
  { name: 'icon', desc: '图标：内置字形（写单词）或 Kubai 两态资产（name + motion）' },
  { name: 'spinner', desc: '加载指示' },
  { name: 'skeleton', desc: '骨架占位（加载中的灰条）' },
  { name: 'tooltip', desc: '悬停提示（父元素 hover 时出现）' },

  /* ── 浮层与链接 ── */
  { name: 'overlay', desc: '遮罩层（铺满、半透明）' },
  { name: 'modal', desc: '对话框面板' },
  { name: 'drawer', desc: '抽屉面板（从右滑入，加 open 打开）' },
  { name: 'popover', desc: '锚定浮层（比菜单自由，能装任意内容）' },
  { name: 'toast', desc: '轻提示（底部浮现，加 open 显示）' },
  { name: 'menu', desc: '菜单容器' },
  { name: 'menuitem', desc: '菜单项' },
  { name: 'link', desc: '超链接' },
  { name: 'alert', desc: '提示横幅：加类 info / ok / warn / err 换语义色' },
  { name: 'empty', desc: '空状态：图标 + 一句话' }
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

/** 交互与位置状态，写在 `when` 后面。
 *
 * `before` / `after` 是伪元素，配 `content` 用（CSS 的 ::before / ::after）。
 * `narrow` / `wide` 是响应式断点，整条规则会被包进 @media。
 */
export const STATES: { name: string; desc: string; css: string }[] = [
  { name: 'hover', desc: '鼠标悬停', css: ':hover' },
  { name: 'pressed', desc: '按下', css: ':active' },
  { name: 'disabled', desc: '禁用', css: ':disabled' },
  { name: 'focus', desc: '获得焦点', css: ':focus' },
  { name: 'focus visible', desc: '键盘聚焦（只在键盘操作时出环）', css: ':focus-visible' },
  { name: 'focus within', desc: '内部元素获得焦点', css: ':focus-within' },
  { name: 'checked', desc: '已勾选', css: ':checked' },
  { name: 'selected', desc: '选中（.selected 类）', css: '.selected' },
  { name: 'active', desc: '当前项（.active 类，页签 / 分页）', css: '.active' },
  { name: 'open', desc: '已展开（.open 类，弹层 / 菜单）', css: '.open' },
  { name: 'loading', desc: '加载中（.loading 类）', css: '.loading' },
  { name: 'empty', desc: '空元素', css: ':empty' },
  { name: 'even', desc: '偶数项', css: ':nth-child(even)' },
  { name: 'odd', desc: '奇数项', css: ':nth-child(odd)' },
  { name: 'first', desc: '第一项', css: ':first-child' },
  { name: 'last', desc: '最后一项', css: ':last-child' },
  { name: 'only', desc: '独生子', css: ':only-child' },
  { name: 'before', desc: '伪元素：元素前面', css: '::before' },
  { name: 'after', desc: '伪元素：元素后面', css: '::after' },
  { name: 'placeholder', desc: '占位文字', css: '::placeholder' },
  { name: 'narrow', desc: '窄屏（≤ 720px）', css: '@narrow' },
  { name: 'wide', desc: '宽屏（> 720px）', css: '@wide' }
];

/** 选择器组合符：`row child text` → `row > text`。
 *  `next` 是相邻兄弟，`sibling` 是后续所有兄弟。 */
export const COMBINATORS: { name: string; css: string; desc: string }[] = [
  { name: 'child', css: '>', desc: '直接子元素' },
  { name: 'next', css: '+', desc: '紧挨着的下一个兄弟' },
  { name: 'sibling', css: '~', desc: '后面的所有兄弟' }
];

export const COMBINATOR_MAP = new Map(COMBINATORS.map((c) => [c.name, c.css]));

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

/** 主题令牌：编译成 var(--xxx)。词表由 src/theme/tokens.ts 统一维护，
 *  这里只做转发——解析器、补全、文档、测试看到的永远是同一份清单。
 *
 *  分五组：表面（背景由浅到深）、线（边框由浅到深）、文字（由深到浅）、
 *  品牌（主色 / 强调 / 浅底 / 浅线）、语义色（ok / err / warn / info），
 *  外加结构色（focus 焦点环 / track 轨道 / overlay 遮罩）。
 */
export const TOKENS: string[] = TOKEN_NAMES;

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

/** 令牌在预览里的实际色值（浅色主题 + 默认强调色）。
 *  编辑器色块、内建示例、文档表格都从这里取，不再各写一份。 */
export const TOKEN_COLORS: Record<string, string> = Object.fromEntries([
  ...TOKENS.map((t) => [t, colorValue(t, 'light', 'green')]),
  ...Object.entries(TOKEN_ALIAS).map(([old, cur]) => [old, colorValue(cur, 'light', 'green')])
]);

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
  /* 无极缩放：整棵子树连同字体、间距、圆角一起放大缩小，矢量图标不掉清晰度 */
  { name: 'zoom', css: 'zoom', type: 'num', desc: '整体缩放倍率（0.5–4），像浏览器缩放一样连续' },
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
  { name: 'radius', css: 'border-radius', type: 'len', multi: true, desc: '圆角' },
  { name: 'radius top', css: 'border-radius', type: 'len', desc: '上边两个角的圆角' },
  { name: 'radius bottom', css: 'border-radius', type: 'len', desc: '下边两个角的圆角' },
  { name: 'border style', css: 'border-style', type: 'kw', desc: '边框线型：solid / dashed / dotted / none' },
  { name: 'padding top', css: 'padding-top', type: 'len', desc: '上内边距' },
  { name: 'padding bottom', css: 'padding-bottom', type: 'len', desc: '下内边距' },
  { name: 'padding left', css: 'padding-left', type: 'len', desc: '左内边距' },
  { name: 'padding right', css: 'padding-right', type: 'len', desc: '右内边距' },
  { name: 'margin top', css: 'margin-top', type: 'len', desc: '上外边距' },
  { name: 'margin bottom', css: 'margin-bottom', type: 'len', desc: '下外边距' },
  { name: 'margin left', css: 'margin-left', type: 'len', desc: '左外边距' },
  { name: 'margin right', css: 'margin-right', type: 'len', desc: '右外边距' },
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
  { name: 'top', css: 'top', type: 'len', desc: '距顶部偏移（绝对 / 固定定位时）' },
  { name: 'right', css: 'right', type: 'len', desc: '距右侧偏移' },
  { name: 'bottom', css: 'bottom', type: 'len', desc: '距底部偏移' },
  { name: 'left', css: 'left', type: 'len', desc: '距左侧偏移' },
  { name: 'depth', css: 'z-index', type: 'num', desc: '层叠顺序，大的在上面' },
  { name: 'overflow', css: 'overflow', type: 'kw', desc: '溢出处理：show / hide / scroll / auto' },
  { name: 'columns', css: 'grid-template-columns', type: 'any', multi: true, desc: '网格列，如 columns repeat(3, 1fr)' },
  { name: 'grid rows', css: 'grid-template-rows', type: 'any', multi: true, desc: '网格行，如 grid rows 40 1fr' },
  { name: 'align content', css: 'align-content', type: 'kw', desc: '多行时的交叉轴分布：start / center / between' },
  { name: 'order', css: 'order', type: 'num', desc: '排列顺序，小的在前' },
  { name: 'aspect', css: 'aspect-ratio', type: 'any', multi: true, desc: '宽高比，如 aspect 16 9' },
  { name: 'cursor', css: 'cursor', type: 'kw', desc: '鼠标形状：pointer / text / move / not / grab' },
  { name: 'gap row', css: 'row-gap', type: 'len', desc: '行间距' },
  { name: 'gap column', css: 'column-gap', type: 'len', desc: '列间距' },
  { name: 'justify items', css: 'justify-items', type: 'kw', desc: '网格单元里的水平对齐' },
  { name: 'justify self', css: 'justify-self', type: 'kw', desc: '自身在网格单元里的水平对齐' },
  { name: 'auto flow', css: 'grid-auto-flow', type: 'kw', desc: '自动排布方向：row / column / dense' },
  { name: 'auto rows', css: 'grid-auto-rows', type: 'any', multi: true, desc: '自动行高' },
  { name: 'auto columns', css: 'grid-auto-columns', type: 'any', multi: true, desc: '自动列宽' },
  { name: 'area', css: 'grid-area', type: 'any', multi: true, desc: '网格区域，如 area 1 1 2 2' },
  { name: 'float', css: 'float', type: 'kw', desc: '浮动：left / right / none' },
  { name: 'clear', css: 'clear', type: 'kw', desc: '清除浮动：left / right / both' },

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
  { name: 'decoration', css: 'text-decoration', type: 'kw', desc: '文字装饰：underline / overline / line / none' },
  { name: 'decoration color', css: 'text-decoration-color', type: 'color', desc: '装饰线颜色' },
  { name: 'indent', css: 'text-indent', type: 'len', desc: '首行缩进' },
  { name: 'word space', css: 'word-spacing', type: 'len', desc: '词间距' },
  { name: 'font style', css: 'font-style', type: 'kw', desc: '字体样式：normal / italic / oblique' },
  { name: 'vertical align', css: 'vertical-align', type: 'kw', desc: '行内垂直对齐：top / middle / bottom / baseline' },
  { name: 'list style', css: 'list-style', type: 'kw', desc: '列表符号：none / disc / circle / square / decimal' },
  { name: 'break', css: 'word-break', type: 'kw', desc: '断词规则：normal / break / keep' },
  { name: 'overflow wrap', css: 'overflow-wrap', type: 'kw', desc: '长词换行：normal / anywhere / break' },
  { name: 'select', css: 'user-select', type: 'kw', desc: '能否选中文字：none / text / all' },
  { name: 'writing', css: 'writing-mode', type: 'kw', desc: '书写方向：horizontal / vertical' },
  { name: 'text shadow', css: 'text-shadow', type: 'shadow', desc: '文字阴影，如 text shadow 0 1 2 ghost' },
  { name: 'content', css: '', type: 'text', desc: '伪元素内容（when before / after 用）' },

  /* ── 背景与视觉 ── */
  { name: 'background', css: 'background', type: 'color', desc: '背景色 / 渐变' },
  { name: 'source', css: '', type: 'text', desc: '图片 / 视频 / 音频 / 网页地址，支持 data: / http: / 工程内相对路径' },

  /* ── 图标资产 ── */
  { name: 'motion', css: '', type: 'kw', desc: '图标动画开关：hover 悬停 / always 常驻 / still 静止' },
  { name: 'palette', css: '', type: 'kw', desc: '配色：color / black' },
  { name: 'base', css: '', type: 'text', desc: '图标资产根目录，默认 assets' },

  /* ── 媒体与嵌入 ── */
  { name: 'controls', css: '', type: 'kw', desc: '显示播放控件（video / audio）' },
  { name: 'autoplay', css: '', type: 'kw', desc: '自动播放（多数浏览器要求 muted）' },
  { name: 'loop', css: '', type: 'kw', desc: '循环播放' },
  { name: 'muted', css: '', type: 'kw', desc: '静音' },
  { name: 'poster', css: '', type: 'text', desc: '视频封面图地址' },
  { name: 'doc', css: '', type: 'text', desc: 'frame 的内联网页内容（写进 srcdoc，适合内嵌小页面）' },
  { name: 'allow', css: '', type: 'text', desc: 'frame 的权限白名单' },
  { name: 'sandbox', css: '', type: 'text', desc: 'frame 的沙箱策略' },
  { name: 'fit', css: 'object-fit', type: 'kw', desc: '图片填充：cover / contain / fill' },
  { name: 'opacity', css: 'opacity', type: 'num', desc: '不透明度 0~1' },
  { name: 'shadow', css: 'box-shadow', type: 'shadow', desc: '投影，如 shadow 0 2 8 0 ghost' },
  { name: 'glow', css: 'box-shadow', type: 'shadow', desc: '外发光（与 shadow 同槽）' },
  { name: 'blur', css: 'filter', type: 'len', desc: '模糊半径' },
  { name: 'filter', css: 'filter', type: 'any', multi: true, desc: '滤镜链，如 filter blur(4) brightness(1.2)' },
  { name: 'backdrop', css: 'backdrop-filter', type: 'any', multi: true, desc: '背景滤镜，如 backdrop blur(8)' },
  { name: 'background size', css: 'background-size', type: 'any', multi: true, desc: '背景尺寸：cover / contain / 宽 高' },
  { name: 'background position', css: 'background-position', type: 'any', multi: true, desc: '背景位置：center / 左 上' },
  { name: 'background repeat', css: 'background-repeat', type: 'kw', desc: '背景平铺：repeat / none / x / y' },
  { name: 'background clip', css: 'background-clip', type: 'kw', desc: '背景裁剪：border / padding / content / text' },
  { name: 'blend', css: 'mix-blend-mode', type: 'kw', desc: '混合模式：normal / multiply / screen / overlay' },
  { name: 'outline', css: 'outline', type: 'any', multi: true, desc: '轮廓，如 outline 2 solid accent' },
  { name: 'visibility', css: 'visibility', type: 'kw', desc: '可见性：show / hide' },
  { name: 'pointer', css: 'pointer-events', type: 'kw', desc: '是否接收鼠标：auto / none' },
  { name: 'clip', css: 'clip-path', type: 'any', multi: true, desc: '裁剪路径，如 clip circle(50%)' },
  { name: 'mask', css: 'mask-image', type: 'any', multi: true, desc: '遮罩，如 mask gradient(90deg, black, transparent)' },
  { name: 'scroll behavior', css: 'scroll-behavior', type: 'kw', desc: '滚动方式：auto / smooth' },
  { name: 'snap', css: 'scroll-snap-type', type: 'kw', desc: '滚动吸附：x / y / both，可加 mandatory' },
  { name: 'snap align', css: 'scroll-snap-align', type: 'kw', desc: '吸附点：start / center / end' },
  { name: 'object position', css: 'object-position', type: 'kw', desc: '图片裁切位置：center / top / bottom / left / right' },
  { name: 'caret', css: 'caret-color', type: 'color', desc: '输入光标颜色' },
  { name: 'mask size', css: 'mask-size', type: 'any', multi: true, desc: '遮罩尺寸：cover / contain / 宽 高' },
  { name: 'mask repeat', css: 'mask-repeat', type: 'kw', desc: '遮罩平铺：repeat / none / x / y' },
  { name: 'mask position', css: 'mask-position', type: 'any', multi: true, desc: '遮罩位置：center / 左 上' },
  { name: 'background attachment', css: 'background-attachment', type: 'kw', desc: '背景滚动：scroll / fixed / local' },
  { name: 'background origin', css: 'background-origin', type: 'kw', desc: '背景起点：border / padding / content' },
  { name: 'border collapse', css: 'border-collapse', type: 'kw', desc: '表格边框：collapse / separate' },
  { name: 'table layout', css: 'table-layout', type: 'kw', desc: '表格布局：auto / fixed' },
  { name: 'caption side', css: 'caption-side', type: 'kw', desc: '表题位置：top / bottom' },
  { name: 'empty cells', css: 'empty-cells', type: 'kw', desc: '空单元格：show / hide' },
  { name: 'list style position', css: 'list-style-position', type: 'kw', desc: '列表符号位置：inside / outside' },
  { name: 'font variant', css: 'font-variant', type: 'kw', desc: '字形变体：normal / small-caps' },
  { name: 'hyphens', css: 'hyphens', type: 'kw', desc: '断词：none / manual / auto' },
  { name: 'tab size', css: 'tab-size', type: 'num', desc: '制表符宽度（字符数）' },
  { name: 'color scheme', css: 'color-scheme', type: 'any', multi: true, desc: '系统控件配色：light / dark / light dark' },
  { name: 'accent color', css: 'accent-color', type: 'color', desc: '原生控件强调色（勾选框、滑块）' },
  { name: 'will change', css: 'will-change', type: 'any', multi: true, desc: '提前告诉浏览器会变什么，如 will change transform' },
  { name: 'isolation', css: 'isolation', type: 'kw', desc: '是否新建层叠上下文：auto / isolate' },
  { name: 'contain', css: 'contain', type: 'kw', desc: '渲染隔离：none / strict / content / size / layout' },
  { name: 'touch action', css: 'touch-action', type: 'kw', desc: '触摸手势：auto / none / pan-x / pan-y' },
  { name: 'text decoration style', css: 'text-decoration-style', type: 'kw', desc: '下划线样式：solid / double / dotted / dashed / wavy' },
  { name: 'text decoration thickness', css: 'text-decoration-thickness', type: 'any', desc: '下划线粗细，如 text decoration thickness 2' },
  { name: 'scroll margin', css: 'scroll-margin', type: 'len', multi: true, desc: '滚动落脚留白' },
  { name: 'scroll padding', css: 'scroll-padding', type: 'len', multi: true, desc: '滚动容器内边距（吸附用）' },

  /* ── 滤镜分量（单独写时和 blur 叠加成一条 filter） ── */
  { name: 'grayscale', css: 'filter', type: 'num', desc: '去色百分比 0–100' },
  { name: 'saturate', css: 'filter', type: 'num', desc: '饱和度百分比，100 为原始' },
  { name: 'contrast', css: 'filter', type: 'num', desc: '对比度百分比，100 为原始' },
  { name: 'brightness', css: 'filter', type: 'num', desc: '亮度百分比，100 为原始' },
  { name: 'hue', css: 'filter', type: 'any', desc: '色相旋转角度，如 hue 90' },

  /* ── 变换 ── */
  { name: 'move', css: 'translate', type: 'any', multi: true, desc: '平移，如 move 4 -2' },
  { name: 'scale', css: 'scale', type: 'num', multi: true, desc: '缩放' },
  { name: 'rotate', css: 'rotate', type: 'any', desc: '旋转，如 rotate 45' },
  { name: 'origin', css: 'transform-origin', type: 'kw', desc: '变换原点' },
  { name: 'skew', css: 'skew', type: 'any', multi: true, desc: '倾斜，如 skew 6' },
  { name: 'perspective', css: 'perspective', type: 'len', desc: '透视距离' },
  { name: 'backface', css: 'backface-visibility', type: 'kw', desc: '背面可见性：show / hide' },

  /* ── 动效 ── */
  { name: 'transition', css: 'transition-property', type: 'kw', multi: true, desc: '参与过渡的属性名' },
  { name: 'duration', css: 'transition-duration', type: 'any', desc: '过渡时长，如 duration 160' },
  { name: 'ease', css: 'transition-timing-function', type: 'kw', desc: '缓动曲线' },
  { name: 'delay', css: 'transition-delay', type: 'any', desc: '延迟时长' },
  { name: 'animation', css: 'animation', type: 'any', multi: true, desc: '动画预设：fade-in / fade-out / slide-up / slide-down / pop / pulse / shake / float / spin，可跟时长（animation pop 400ms）' },
  { name: 'theme', css: '', type: 'text', desc: '主题：light / dark（写在 window 上，整棵界面换令牌）' },
  { name: 'iteration', css: 'animation-iteration-count', type: 'any', desc: '播放次数：1 / infinite' },
  { name: 'fill mode', css: 'animation-fill-mode', type: 'kw', desc: '动画结束后的状态：none / forwards / backwards / both' },
  { name: 'play state', css: 'animation-play-state', type: 'kw', desc: '播放状态：running / paused' },
  { name: 'resize', css: 'resize', type: 'kw', desc: '可否拖拽改变大小：none / both / horizontal / vertical' },
  { name: 'touch', css: 'touch-action', type: 'kw', desc: '触摸手势：auto / none / pan' },

  /* ── 元素属性：不进 CSS，直接写进 DOM（表单、链接、图片用） ── */
  { name: 'value', css: '', type: 'text', desc: '初始值：input / textarea / dropdown / progress / slider' },
  { name: 'checked', css: '', type: 'text', desc: '默认勾选：checkbox / radio / switch（单独一行即可）' },
  { name: 'disabled', css: '', type: 'text', desc: '禁用（单独一行即可）' },
  { name: 'readonly', css: '', type: 'text', desc: '只读' },
  { name: 'required', css: '', type: 'text', desc: '必填' },
  { name: 'selected', css: '', type: 'text', desc: '默认选中（option 用）' },
  { name: 'multiple', css: '', type: 'text', desc: '多选（dropdown 用）' },
  { name: 'href', css: '', type: 'text', desc: '链接地址（link 用）' },
  { name: 'target', css: '', type: 'text', desc: '打开方式：_blank 新窗口' },
  { name: 'name', css: '', type: 'text', desc: '表单字段名（提交时用它取值）；icon 里写图标名' },
  { name: 'alt', css: '', type: 'text', desc: '图片替代文字' },
  { name: 'min', css: '', type: 'text', desc: '最小值（slider / progress）' },
  { name: 'max', css: '', type: 'text', desc: '最大值（slider / progress）' },
  { name: 'step', css: '', type: 'text', desc: '步长（slider）' },
  { name: 'rows', css: '', type: 'text', desc: '可见行数（textarea）' },
  { name: 'cols', css: '', type: 'text', desc: '可见列数（textarea）' },
  { name: 'title', css: '', type: 'text', desc: '悬停时浏览器原生提示（无障碍也读它）' },
  { name: 'autofocus', css: '', type: 'text', desc: '页面打开就聚焦（单独一行即可）' },
  { name: 'accept', css: '', type: 'text', desc: '可选的文件夹型（input type=file 用）' },
  { name: 'open', css: '', type: 'text', desc: '默认展开（modal / menu）' }
];

/** 关键字值 → CSS 值。表里没有的原样透传（浏览器认什么就写什么）。 */
export const KEYWORDS: Record<string, Record<string, string>> = {
  'border style': { solid: 'solid', dashed: 'dashed', dotted: 'dotted', none: 'none', double: 'double' },
  float: { left: 'left', right: 'right', none: 'none' },
  clear: { left: 'left', right: 'right', both: 'both', none: 'none' },
  decoration: { underline: 'underline', overline: 'overline', line: 'line-through', none: 'none' },
  'font style': { normal: 'normal', italic: 'italic', oblique: 'oblique' },
  'vertical align': { top: 'top', middle: 'middle', bottom: 'bottom', baseline: 'baseline' },
  'list style': { none: 'none', disc: 'disc', circle: 'circle', square: 'square', decimal: 'decimal' },
  break: { normal: 'normal', break: 'break-all', keep: 'keep-all' },
  'overflow wrap': { normal: 'normal', anywhere: 'anywhere', break: 'break-word' },
  select: { none: 'none', text: 'text', all: 'all' },
  writing: { horizontal: 'horizontal-tb', vertical: 'vertical-rl' },
  'background repeat': { repeat: 'repeat', none: 'no-repeat', x: 'repeat-x', y: 'repeat-y' },
  'background clip': { border: 'border-box', padding: 'padding-box', content: 'content-box', text: 'text' },
  blend: { normal: 'normal', multiply: 'multiply', screen: 'screen', overlay: 'overlay', darken: 'darken', lighten: 'lighten' },
  visibility: { show: 'visible', hide: 'hidden' },
  pointer: { auto: 'auto', none: 'none' },
  'scroll behavior': { auto: 'auto', smooth: 'smooth' },
  backface: { show: 'visible', hide: 'hidden' },
  'fill mode': { none: 'none', forwards: 'forwards', backwards: 'backwards', both: 'both' },
  'play state': { running: 'running', paused: 'paused' },
  resize: { none: 'none', both: 'both', horizontal: 'horizontal', vertical: 'vertical' },
  touch: { auto: 'auto', none: 'none', pan: 'pan-x pan-y' },
  'justify items': { start: 'start', end: 'end', center: 'center', stretch: 'stretch' },
  'justify self': { start: 'start', end: 'end', center: 'center', stretch: 'stretch' },
  'auto flow': { row: 'row', column: 'column', dense: 'dense' }
};

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
  'text colour': 'color',
  /* 新属性的顺口别名 */
  'bd style': 'border style',
  'pad top': 'padding top',
  'pad bottom': 'padding bottom',
  'pad left': 'padding left',
  'pad right': 'padding right',
  'mar top': 'margin top',
  'mar bottom': 'margin bottom',
  'mar left': 'margin left',
  'mar right': 'margin right',
  'bg size': 'background size',
  'bg position': 'background position',
  'bg repeat': 'background repeat',
  radius_top: 'radius top',
  radius_bottom: 'radius bottom',
  'text decoration': 'decoration',
  'line decoration': 'decoration',
  'bg clip': 'background clip',
  'blend mode': 'blend'
};

/** 属性名长度降序，保证 `multi word` 先于单词匹配 */
export const PROP_BY_NAME = new Map(PROPS.map((p) => [p.name, p]));

const CJK = /[\u3000-\u9fff\uff00-\uffef]/;

/** 判断一个 token 是否可能是属性名的一部分（字母、下划线、连字符、中文） */
export const isNameToken = (s: string): boolean => /^[A-Za-z_][A-Za-z0-9_-]*$/.test(s) || CJK.test(s);

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

/* ── 自动别名：CSS 写法直接能用 ──
 *
 * 写惯 CSS 的人会顺手写 min-width / line-height / z-index / font-size，
 * 这些不该报"不认识的属性"。规则：
 *   · 多词属性的连字符写法一律当别名（min-width → min width）；
 *   · 某个属性的 CSS 名只对应它一个时，CSS 名也当别名（z-index → depth、font-size → size）；
 *   · 一个 CSS 名对应多个属性时不加（border-radius 同时是 radius / radius top / radius bottom）。
 */
const CSS_OWNERS = new Map<string, string[]>();
for (const p of PROPS) {
  if (!p.css) continue;
  CSS_OWNERS.set(p.css, [...(CSS_OWNERS.get(p.css) ?? []), p.name]);
}
for (const p of PROPS) {
  const kebab = p.name.replace(/ /g, '-');
  if (kebab !== p.name && !PROP_ALIASES[kebab]) PROP_ALIASES[kebab] = p.name;
  if (p.css && !PROP_BY_NAME.has(p.css) && !PROP_ALIASES[p.css]) {
    const owners = CSS_OWNERS.get(p.css) ?? [];
    if (owners.length === 1) PROP_ALIASES[p.css] = p.name;
  }
}



