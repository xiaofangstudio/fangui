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
  list: 'div',
  item: 'div',
  scroll: 'div',
  spacer: 'div',
  button: 'button',
  input: 'input',
  textarea: 'textarea',
  image: 'img',
  checkbox: 'input',
  radio: 'input',
  slider: 'input',
  progress: 'progress'
};

const VOID_TAGS = new Set(['input', 'img']);

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

function keyOf(it: Identity): string {
  return `${it.kind}|${it.classes.join('.')}|${it.id}`;
}

function makeNode(rule: CuiRule, it: Identity): CuiNode {
  const tag = TAG_OF[it.kind] ?? 'div';
  const attrs: Record<string, string> = {};

  if (tag === 'button') attrs.type = 'button';
  if (it.kind === 'checkbox') attrs.type = 'checkbox';
  if (it.kind === 'radio') attrs.type = 'radio';
  if (it.kind === 'slider') attrs.type = 'range';

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

/** 把一条规则的属性填到节点上：text / src / hint 是内容，其余归 CSS。 */
function fill(node: CuiNode, rule: CuiRule): void {
  const text = declOf(rule, 'text');
  if (text) node.text = valueText(text.values[0]);

  const src = declOf(rule, 'src');
  if (src) node.attrs.src = valueText(src.values[0]);

  const hint = declOf(rule, 'hint');
  if (hint) node.attrs.placeholder = valueText(hint.values[0]);

  const type = declOf(rule, 'type');
  if (type && node.tag === 'input') node.attrs.type = valueText(type.values[0]);
}

export function buildCuiTree(doc: CuiDocument): CuiTreeResult {
  const roots: CuiNode[] = [];
  const rootIndex = new Map<string, CuiNode>();
  const childIndex = new WeakMap<CuiNode, Map<string, CuiNode>>();
  const diags: CuiDiag[] = [];

  const walk = (rule: CuiRule, parent: CuiNode | null): void => {
    const it = identityOf(rule);
    if (!it) return; // 状态规则不建元素

    const index = parent ? (childIndex.get(parent) ?? (() => {
      const m = new Map<string, CuiNode>();
      childIndex.set(parent, m);
      return m;
    })()) : rootIndex;
    const key = keyOf(it);

    let node = index.get(key);
    if (!node) {
      node = makeNode(rule, it);
      index.set(key, node);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    fill(node, rule);

    for (const child of rule.children) walk(child, node);
  };

  for (const r of doc.rules) walk(r, null);

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

  const inner = n.children.length > 0 ? n.children.map(nodeHtml).join('') : esc(n.text);
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
