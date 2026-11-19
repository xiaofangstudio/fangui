/* .cui 规则树 → 真实 DOM。
 *
 * 这是 CUI 和 CSS 最大的区别：.cui 不只是"给已有标签上色"，
 * 它本身就是界面的结构来源。一条规则就是一个元件：
 *
 *   item row#t1
 *       text task
 *           text "买牛奶"
 *
 * 上面三行会生成
 *   <div data-t="item" class="row" id="t1">
 *     <div data-t="text" class="task">买牛奶</div>
 *   </div>
 *
 * 身份 = 元件 + 类 + #实例。同身份的规则会合并（后写的属性覆盖先写的），
 * 所以样式规则可以拆成好几条写，不会多长出元素。
 *
 * `when`（状态/事件）和 `+done`（运行时类）都不参与建元素——
 * 它们只描述"已经存在的元素在某个时刻长什么样"。
 */

import type { CuiDecl, CuiDiag, CuiDocument, CuiRule, CuiValue } from './ast';
import { KUBAI_NAMES } from './kubai';
import { parseCui } from './parser';

export type CuiNode = {
  /** 元件名，写进 data-t，样式全靠它 */
  kind: string;
  /** 真正的 HTML 标签 */
  tag: string;
  classes: string[];
  id: string;
  attrs: Record<string, string>;
  text: string;
  children: CuiNode[];
  span: { line: number; col: number };
};

export type CuiTreeResult = {
  roots: CuiNode[];
  diags: CuiDiag[];
};

/** 元件 → 真正的 HTML 标签。没列出的按容器处理。
 *  data-t 里写的是完整词（解析器已把旧缩写归一化）。 */
const TAG_OF: Record<string, string> = {
  window: 'div',
  box: 'div',
  row: 'div',
  column: 'div',
  text: 'div',
  code: 'pre',
  list: 'div',
  item: 'div',
  scroll: 'div',
  spacer: 'div',
  button: 'button',
  input: 'input',
  textarea: 'textarea',
  image: 'img',
  video: 'video',
  audio: 'audio',
  frame: 'iframe',
  checkbox: 'input',
  radio: 'input',
  slider: 'input',
  progress: 'progress',

  /* 页面骨架 */
  view: 'div',
  header: 'header',
  footer: 'footer',
  nav: 'nav',
  main: 'main',
  aside: 'aside',
  section: 'section',
  card: 'div',
  grid: 'div',
  toolbar: 'div',
  divider: 'hr',
  heading: 'div',
  tabs: 'div',
  tab: 'button',

  /* 表单 */
  form: 'form',
  field: 'div',
  label: 'label',
  dropdown: 'select',
  option: 'option',
  switch: 'input',

  /* 数据展示 */
  table: 'table',
  cell: 'div',
  badge: 'span',
  tag: 'span',
  avatar: 'div',
  icon: 'span',
  spinner: 'div',
  skeleton: 'div',
  tip: 'span',

  /* 浮层与链接 */
  overlay: 'div',
  modal: 'div',
  drawer: 'aside',
  popover: 'div',
  toast: 'div',
  menu: 'div',
  menuitem: 'button',
  link: 'a',

  /* 反馈 */
  alert: 'div',
  empty: 'div'
};

const VOID_TAGS = new Set(['input', 'img', 'hr']);

/** 不进 CSS、直接写进 DOM 的属性。布尔属性单独一行就够（checked / disabled …）。 */
const ATTR_PROPS: Record<string, string> = {
  value: 'value',
  checked: 'checked',
  disabled: 'disabled',
  readonly: 'readonly',
  required: 'required',
  selected: 'selected',
  multiple: 'multiple',
  href: 'href',
  target: 'target',
  name: 'name',
  alt: 'alt',
  min: 'min',
  max: 'max',
  step: 'step',
  rows: 'rows',
  cols: 'cols',
  title: 'title',
  autofocus: 'autofocus',
  accept: 'accept',
  open: 'open',
  theme: 'data-theme',
  controls: 'controls',
  autoplay: 'autoplay',
  loop: 'loop',
  muted: 'muted',
  poster: 'poster',
  allow: 'allow',
  sandbox: 'sandbox',
  doc: 'srcdoc'
};

const BOOL_ATTRS = new Set(['checked', 'disabled', 'readonly', 'required', 'selected', 'multiple', 'open', 'autofocus', 'controls', 'autoplay', 'loop', 'muted']);

function valueText(v: CuiValue | undefined): string {
  if (!v) return '';
  switch (v.k) {
    case 'str':
    case 'color':
    case 'ident':
    case 'token':
      return v.v;
    case 'num':
      return v.unit ? `${v.v}${v.unit}` : String(v.v);
    case 'call':
      return `${v.name}(${v.args.map(valueText).join(', ')})`;
    default:
      return '';
  }
}

function declOf(rule: CuiRule, prop: string): CuiDecl | undefined {
  return rule.decls.find((d) => d.prop === prop);
}

type Identity = { kind: string; classes: string[]; id: string };

/** 这条规则要不要长出一个元素。状态规则、事件规则、`+done` 都不长。 */
function identityOf(rule: CuiRule): Identity | null {
  let kind = '';
  let id = '';
  let stateful = false;
  let types = 0;
  const classes: string[] = [];

  for (const s of rule.selectors) {
    if (s.kind === 'type') { kind = s.value; types++; }
    else if (s.kind === 'id') id = s.value;
    else if (s.kind === 'class') classes.push(s.value);
    else if (s.kind === 'flag') stateful = true;
    else if (s.kind === 'when') stateful = true;
    /* all 开头 = 只写样式，不建元件 */
    else if (s.kind === 'all') stateful = true;
  }

  /* 写了两个元件名 = 后代选择器（「item 里的 text」），本身不长元素 */
  if (types > 1) stateful = true;

  if (!kind || stateful) return null;
  return { kind, classes: [...new Set(classes)], id };
}

function makeNode(rule: CuiRule, it: Identity, parentTag: string): CuiNode {
  let tag = TAG_OF[it.kind] ?? 'div';

  /* 表格里的 row / cell / heading 换成真正的表格标签：浏览器才会按行列表排 */
  if (parentTag === 'table') {
    if (it.kind === 'row') tag = 'tr';
    else if (it.kind === 'cell') tag = 'td';
    else if (it.kind === 'heading') tag = 'th';
  } else if (parentTag === 'tr') {
    if (it.kind === 'cell') tag = 'td';
    else if (it.kind === 'heading') tag = 'th';
  }

  const attrs: Record<string, string> = {};

  if (tag === 'button' || it.kind === 'menuitem' || it.kind === 'tab') attrs.type = 'button';
  if (it.kind === 'checkbox') attrs.type = 'checkbox';
  if (it.kind === 'radio') attrs.type = 'radio';
  if (it.kind === 'slider') attrs.type = 'range';
  if (it.kind === 'switch') {
    attrs.type = 'checkbox';
    attrs.role = 'switch';
  }
  if (it.kind === 'tip') attrs.role = 'tooltip';
  if (it.kind === 'toast') { attrs.role = 'status'; attrs['aria-live'] = 'polite'; }

  /* view 靠 data-view 认页：先写 #实例名，没有就用第一个类名 */
  if (it.kind === 'view') {
    const name = it.id || it.classes[0] || '';
    if (name) attrs['data-view'] = name;
  }

  return {
    kind: it.kind,
    tag,
    classes: it.classes,
    id: it.id,
    attrs,
    text: '',
    children: [],
    span: rule.span
  };
}

/** 把一条规则的属性填到节点上：text / source / hint 是内容，表单属性进 DOM，其余归 CSS。 */
function fill(node: CuiNode, rule: CuiRule): void {
  const text = declOf(rule, 'text');
  if (text) node.text = valueText(text.values[0]);

  /* 图标有两套来源：
     ① 内置字形：icon / text "home"  → data-icon，单色描边
     ② Kubai 两态资产：icon + name "文件夹" → 两张图 + data-motion
     判定方式：写了 motion / palette / base，或名字在 Kubai 名册里，就走资产。 */
  if (node.kind === 'icon') {
    const nameDecl = declOf(rule, 'name');
    const name = nameDecl ? valueText(nameDecl.values[0]) : node.text.trim();
    node.text = '';
    const assetMode = !!declOf(rule, 'motion') || !!declOf(rule, 'palette') || !!declOf(rule, 'base') || KUBAI_NAMES.has(name);
    if (assetMode && name) {
      const pal = declOf(rule, 'palette');
      const palette = pal ? valueText(pal.values[0]) : 'color';
      const baseDecl = declOf(rule, 'base');
      const base = baseDecl ? valueText(baseDecl.values[0]) : 'assets';
      const mo = declOf(rule, 'motion');
      const motion = mo ? valueText(mo.values[0]) : 'hover';
      /* 只会进 style 属性，清掉能改写 CSS 的字符 */
      const clean = (s: string) => s.replace(/["\\];()/g, '').replace(/ /g, '%20');
      const path = (state: string) => clean(`${base}/${palette}/${state}/${name}.svg`);
      node.attrs['data-motion'] = motion;
      node.attrs.class = (node.attrs.class ? node.attrs.class + ' ' : '') + 'm-' + motion;
      node.attrs['data-palette'] = palette;
      node.attrs.style = `--icon-rest:url("${path('rest')}");--icon-hover:url("${path('hover')}")`;
    } else if (name) {
      node.attrs['data-icon'] = name;
    }
  }

  const src = declOf(rule, 'source');
  if (src) node.attrs.src = valueText(src.values[0]);

  const hint = declOf(rule, 'hint');
  if (hint) node.attrs.placeholder = valueText(hint.values[0]);

  const type = declOf(rule, 'type');
  if (type && node.tag === 'input') node.attrs.type = valueText(type.values[0]);

  for (const [prop, attr] of Object.entries(ATTR_PROPS)) {
    if (prop === 'name' && node.kind === 'icon') continue;
    const d = declOf(rule, prop);
    if (!d) continue;
    const v = valueText(d.values[0]);
    node.attrs[attr] = BOOL_ATTRS.has(attr) && !v ? attr : v;
  }
}

/* ─────────────────────── 结构修正 ─────────────────────── */

/** 多页界面首屏：没有 .active 时，第一页就是首屏。
 *  静态预览不会跑运行时，这一步不做的话所有页会一起铺出来。 */
function activateFirstView(nodes: CuiNode[]): boolean {
  for (const n of nodes) {
    if (n.kind === 'view') {
      if (!(n.attrs.class ?? '').split(/\s+/).includes('active')) {
        n.attrs.class = ((n.attrs.class ?? '') + ' active').trim();
      }
      return true;
    }
    if (activateFirstView(n.children)) return true;
  }
  return false;
}

/** 浮层类元件：它们不该待在 <button> 里（HTML 不允许）。 */
const PANEL_LIKE = new Set(['menu', 'popover', 'overlay', 'drawer', 'toast', 'modal']);

/** 块级标签：同样不能出现在 <button> 里。 */
const BLOCK_TAGS = new Set([
  'div', 'pre', 'table', 'section', 'aside', 'header', 'footer', 'nav', 'main',
  'form', 'hr', 'ul', 'ol', 'li', 'figure', 'article'
]);

/**
 * 按钮里塞菜单是 .cui 里最常见的写法：
 *
 *   button more
 *       text "更多"
 *       menu
 *           menuitem …
 *
 * 但 `<button><div>…</div></button>` 是非法嵌套，浏览器会在遇到 div 时
 * 强行把 button 关掉，菜单整个被抖到外面去——看上去就是"菜单自己展开了"。
 * 所以只要有块级 / 浮层子元素，就把这个按钮换成 div + role=button：
 * 外观、行为、aria 全不变，键盘由运行时补一条 Enter / Space。
 */
function normalizeContainers(node: CuiNode): void {
  for (const c of node.children) normalizeContainers(c);
  if (node.tag !== 'button') return;
  const needsDiv = node.children.some((c) => BLOCK_TAGS.has(c.tag) || PANEL_LIKE.has(c.kind));
  if (!needsDiv) return;
  node.tag = 'div';
  node.attrs.role = 'button';
  node.attrs.tabindex = '0';
}

export function buildCuiTree(doc: CuiDocument): CuiTreeResult {
  const roots: CuiNode[] = [];
  const diags: CuiDiag[] = [];

  /* 一个块 = 一个元素。同元件同类的兄弟块各长各的：列表、图标墙、表格行都靠这个，
     绝不能按「身份」合并，否则 96 个 tile 会被压成 1 个。 */
  const walk = (rule: CuiRule, parent: CuiNode | null): void => {
    const it = identityOf(rule);
    if (!it) return; // 状态规则不建元素

    const node = makeNode(rule, it, parent?.tag ?? '');
    if (parent) parent.children.push(node);
    else roots.push(node);
    fill(node, rule);

    for (const child of rule.children) walk(child, node);
  };

  for (const r of doc.rules) walk(r, null);

  /* 收尾：修掉非法的嵌套（按钮里装菜单 / 卡片，浏览器会把子树抖散） */
  for (const r of roots) normalizeContainers(r);

  /* 首屏：多页界面里第一页默认就是 active */
  activateFirstView(roots);

  /* 一条元素规则都没有时给个提示：多半是忘了写元件名 */
  if (roots.length === 0 && doc.rules.length > 0) {
    diags.push({ line: doc.rules[0].span.line, col: 1, level: 'warn', msg: '没有可生成的元件：规则要以元件名开头（window / row / text …）' });
  }

  return { roots, diags };
}

/* ─────────────────────── 序列化成 HTML ─────────────────────── */

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 节点 → HTML 字符串。text 用文本节点，其余属性照写。 */
function nodeHtml(n: CuiNode): string {
  const parts: string[] = [`data-t="${esc(n.kind)}"`];
  if (n.classes.length > 0) parts.push(`class="${esc(n.classes.join(' '))}"`);
  if (n.id) parts.push(`id="${esc(n.id)}"`);
  for (const [k, v] of Object.entries(n.attrs)) {
    parts.push(`${k}="${esc(v)}"`);
  }

  const head = `<${n.tag} ${parts.join(' ')}`;
  if (VOID_TAGS.has(n.tag)) return `${head}>`;

  /* 有子元素时也要保留本节点的文字：按钮里写「文字 + 图标」是常见组合 */
  const inner = [n.text ? esc(n.text) : '', ...n.children.map(nodeHtml)].join('');
  return `${head}>${inner}</${n.tag}>`;
}

export function renderCuiTree(tree: CuiTreeResult): string {
  return tree.roots.map(nodeHtml).join('\n');
}

export function renderCuiHtml(src: string): { html: string; diags: CuiDiag[] } {
  const doc = parseCui(src);
  const tree = buildCuiTree(doc);
  return { html: renderCuiTree(tree), diags: tree.diags };
}






