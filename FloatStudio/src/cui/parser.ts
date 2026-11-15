/* .cui 解析器：词法 → 缩进树 → AST。
 *
 * 语法沿 Copper 的习惯：
 *   - 一行一句，`/*` 注释到行尾，不用闭合；
 *   - 缩进成块，块内是属性或子规则；
 *   - 属性用空格分参（padding 8 16），不用冒号、不用分号。
 *
 * 一条规则长这样：
 *   button primary when hover
 *       background accent
 * 选择器由「元件 + 类 + #实例 + when 状态」自由组合，顺序不限。
 */

import type { CuiAction, CuiActionKind, CuiDecl, CuiDiag, CuiDocument, CuiRule, CuiSelector, CuiValue } from './ast';
import type { OutlineItem } from '../lang/analyze';
import { ALL_ELEMENT_WORDS, ALL_TOKEN_WORDS, EVENT_MAP, STATE_MAP, elementName, matchProp } from './props';

/* ─────────────────────────── 词法 ─────────────────────────── */

type Tok =
  | { k: 'num'; v: number; unit: string; col: number }
  | { k: 'text'; v: string; col: number }
  | { k: 'hex'; v: string; col: number }
  | { k: 'id'; v: string; col: number }
  | { k: 'word'; v: string; col: number }
  | { k: 'punc'; v: string; col: number };

const isDigit = (c: string): boolean => c >= '0' && c <= '9';
const isWordStart = (c: string): boolean =>
  /[A-Za-z_]/.test(c) || (c >= '\u3400' && c <= '\u9fff') || /[\uff21-\uff5a]/.test(c);
const isWordPart = (c: string): boolean => isWordStart(c) || isDigit(c);
const isHexChar = (c: string): boolean => /[0-9a-fA-F]/.test(c);

/** 把一行切成 token。遇到不认识的字符直接跳过——样式层永不因为一个怪字符崩掉。 */
export function tokenize(line: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < line.length) {
    const c = line[i];
    if (c === ' ' || c === '\t' || c === '\u3000') { i++; continue; }
    const col = i + 1;

    /* 字符串：双引号或单引号 */
    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      let text = '';
      while (j < line.length && line[j] !== quote) {
        if (line[j] === '\\' && j + 1 < line.length) { text += line[j + 1]; j += 2; continue; }
        text += line[j];
        j++;
      }
      out.push({ k: 'text', v: text, col });
      i = j + 1;
      continue;
    }

    /* # 开头：全十六进制当颜色，否则当实例名 */
    if (c === '#') {
      let j = i + 1;
      let body = '';
      while (j < line.length && /[0-9A-Za-z_-]/.test(line[j])) { body += line[j]; j++; }
      if (body.length >= 3 && body.length <= 8 && body.split('').every(isHexChar)) {
        out.push({ k: 'hex', v: '#' + body, col });
      } else {
        out.push({ k: 'id', v: body, col });
      }
      i = j;
      continue;
    }

    /* 数字：允许负号、小数、单位 */
    if (isDigit(c) || (c === '-' && (isDigit(line[i + 1] ?? '') || line[i + 1] === '.')) || (c === '.' && isDigit(line[i + 1] ?? ''))) {
      let j = i;
      if (line[j] === '-') j++;
      while (j < line.length && /[0-9.]/.test(line[j])) j++;
      const raw = line.slice(i, j);
      let unit = '';
      while (j < line.length && /[a-zA-Z%]/.test(line[j])) { unit += line[j]; j++; }
      const v = Number.parseFloat(raw);
      out.push({ k: 'num', v: Number.isFinite(v) ? v : 0, unit, col });
      i = j;
      continue;
    }

    /* 标识符 / 中文 / 关键字。词内允许连字符（linear-gradient、space-between），
     * 但连字符后面必须紧跟词字符，否则它归标点（calc(100% - 20px) 的减号）。 */
    if (isWordStart(c)) {
      let j = i;
      let w = '';
      while (j < line.length) {
        if (isWordPart(line[j])) { w += line[j]; j++; continue; }
        if (line[j] === '-' && isWordStart(line[j + 1] ?? '')) { w += '-'; j++; continue; }
        break;
      }
      out.push({ k: 'word', v: w, col });
      i = j;
      continue;
    }

    if ('(),./:*>+-'.includes(c)) {
      out.push({ k: 'punc', v: c, col });
      i++;
      continue;
    }

    /* 其余字符跳过：宁可忽略，也不要让样式整体失效 */
    i++;
  }
  return out;
}

/* ─────────────────────── 值的解析 ─────────────────────── */

function tokToValue(t: Tok): CuiValue | null {
  switch (t.k) {
    case 'num': return { k: 'num', v: t.v, unit: t.unit };
    case 'text': return { k: 'str', v: t.v };
    case 'hex': return { k: 'color', v: t.v };
    case 'id': return { k: 'ident', v: '#' + t.v };
    case 'word':
      if (ALL_TOKEN_WORDS.has(t.v)) return { k: 'token', v: t.v };
      return { k: 'ident', v: t.v };
    default: return null;
  }
}

/** 把 token 序列切成值列表，处理 `name(...)` 形式的函数调用 */
function parseValues(toks: Tok[]): CuiValue[] {
  const out: CuiValue[] = [];
  let i = 0;
  while (i < toks.length) {
    const t = toks[i];
    if (t.k === 'punc' && (t.v === ',' || t.v === '/' || t.v === ':' || t.v === '.')) { i++; continue; }

    /* 函数调用：word 后面紧跟 ( */
    if (t.k === 'word' && toks[i + 1]?.k === 'punc' && (toks[i + 1] as { v: string }).v === '(') {
      let depth = 0;
      const inner: Tok[] = [];
      let j = i + 1;
      for (; j < toks.length; j++) {
        const q = toks[j];
        if (q.k === 'punc' && q.v === '(') { depth++; if (depth === 1) continue; }
        if (q.k === 'punc' && q.v === ')') { depth--; if (depth === 0) break; }
        inner.push(q);
      }
      out.push({ k: 'call', name: t.v, args: splitArgs(inner) });
      i = j + 1;
      continue;
    }

    const v = tokToValue(t);
    if (v) out.push(v);
    i++;
  }
  return out;
}

/** 按逗号切函数参数，每个参数内部再当普通值序列解析 */
function splitArgs(toks: Tok[]): CuiValue[] {
  const groups: Tok[][] = [[]];
  let depth = 0;
  for (const t of toks) {
    if (t.k === 'punc' && t.v === '(') depth++;
    if (t.k === 'punc' && t.v === ')') depth--;
    if (t.k === 'punc' && t.v === ',' && depth === 0) { groups.push([]); continue; }
    groups[groups.length - 1].push(t);
  }
  return groups.map((g) => {
    const vs = parseValues(g);
    if (vs.length === 1) return vs[0];
    /* 多 token 的参数（calc(100% - 20px) 这类）原样拼回去，单位和符号都不能丢 */
    const raw = g
      .map((x) => (x.k === 'num' ? `${x.v}${x.unit ?? ''}` : x.k === 'id' ? `#${x.v}` : String(x.v)))
      .join(' ');
    return { k: 'ident', v: raw } as CuiValue;
  });
}

/* ────────────────────── 选择器解析 ────────────────────── */

/** 一行是否像选择器：首词不是已知属性名
 *
 * 有个真实歧义要处理：`text` 既是元件名，也是属性名。
 *   - `text title`   → 元件 text + 类 title（选择器）
 *   - `text "你好"`  → 属性 text（值必须是字符串）
 * 所以遇见元件名一律优先当选择器，只有 `text` 后跟字符串时才当属性。
 * 旧缩写（btn / img …）也算元件名，编译时归一化成完整词。
 */
function looksLikeSelector(toks: Tok[]): boolean {
  if (toks.length === 0) return false;
  const first = toks[0];
  if (first.k !== 'word') return true;
  if (ALL_ELEMENT_WORDS.has(first.v)) {
    if (first.v === 'text') {
      if (toks[1]?.k === 'text') return false;
      /* text align / text transform 这类多词属性要当声明，text title 才是选择器 */
      const ws = toks.filter((t) => t.k === 'word').map((t) => (t as { v: string }).v);
      const m = matchProp(ws);
      if (m && m.used >= 2) return false;
    }
    return true;
  }
  const words = toks.filter((t) => t.k === 'word').map((t) => (t as { v: string }).v);
  return matchProp(words) === null;
}

function parseSelector(toks: Tok[], line: number): CuiSelector[] {
  const sels: CuiSelector[] = [];
  let i = 0;
  /* 刚写完 when / +flag：后面第一个元件名算「后代」，不算类 */
  let afterState = false;
  /* 首项：元件 > #实例 > 类 */
  const first = toks[0];
  if (!first) return sels;

  if (first.k === 'word' && ALL_ELEMENT_WORDS.has(first.v)) {
    sels.push({ kind: 'type', value: elementName(first.v) });
    i = 1;
  } else if (first.k === 'id' || first.k === 'hex') {
    sels.push({ kind: 'id', value: first.k === 'id' ? first.v : first.v.slice(1) });
    i = 1;
  } else if (first.k === 'punc' && first.v === '+') {
    /* 以 +done 开头：这条规则没写元件，只描述状态（下面会报诊断） */
    i = 0;
  } else if (first.k === 'word' && first.v === 'all') {
    sels.push({ kind: 'all', value: '*' });
    i = 1;
  } else if (first.k === 'word') {
    sels.push({ kind: 'class', value: first.v });
    i = 1;
  } else {
    i = 1;
  }

  while (i < toks.length) {
    const t = toks[i];
    /* +done：运行时才有的状态类，只进 CSS，不参与建元素 */
    if (t.k === 'punc' && t.v === '+') {
      const n = toks[i + 1];
      if (n && n.k === 'word') {
        sels.push({ kind: 'flag', value: n.v });
        /* 状态写完之后再出现元件名，就是「里面的」——开一段新的后代 */
        afterState = true;
        i += 2;
      } else {
        i++;
      }
      continue;
    }
    if (t.k === 'word' && t.v === 'when') {
      i++;
      while (i < toks.length && toks[i].k === 'word') {
        const st = (toks[i] as { v: string }).v;
        if (!STATE_MAP.has(st) && !EVENT_MAP.has(st)) break;
        sels.push({ kind: 'when', value: st });
        i++;
      }
      afterState = true;
      continue;
    }
    if (t.k === 'id' || t.k === 'hex') {
      sels.push({ kind: 'id', value: t.k === 'id' ? t.v : t.v.slice(1) });
      i++;
      continue;
    }
    if (t.k === 'word' && ALL_ELEMENT_WORDS.has(t.v) && (!sels.some((s) => s.kind === 'type') || afterState)) {
      /* `all row x`：all 后面的元件名仍是元件
         `item row +done text task`：+done 之后的 text 是后代元件，不是类 */
      sels.push({ kind: 'type', value: elementName(t.v) });
      afterState = false;
      i++;
      continue;
    }
    if (t.k === 'word') {
      sels.push({ kind: 'class', value: t.v });
      i++;
      continue;
    }
    i++;
  }
  void line;
  return sels;
}

/* ─────────────────────── 动作解析 ─────────────────────── */

const ACTION_KINDS = new Set<string>(['add', 'remove', 'toggle', 'text', 'say', 'go', 'call']);

/** `act toggle active on card` / `act say "已提交"` / `act call add_item`
 *
 * 动作是声明式的，不是随便一段脚本——所以预览里永远不会跑出一个死循环。
 * `call` 是唯一的例外通道：它调用 app/*.co 里的一个 Copper 函数，
 * 把被点元素的选择器传进去，界面之外的计算归 Copper。
 */
function parseAction(toks: Tok[], line: number, diags: CuiDiag[]): CuiAction | null {
  const span = { line, col: 1 };
  const kindTok = toks[1];
  if (!kindTok || kindTok.k !== 'word' || !ACTION_KINDS.has(kindTok.v)) {
    diags.push({ line, col: 1, level: 'warn', msg: 'act 后面要跟 add / remove / toggle / text / say / go / call' });
    return null;
  }
  const kind = kindTok.v as CuiActionKind;
  const rest = toks.slice(2);

  if (kind === 'call') {
    const fn = rest.find((t) => t.k === 'word');
    if (!fn) {
      diags.push({ line, col: 1, level: 'warn', msg: 'act call 后面要写 Copper 函数名，如 act call add_item' });
      return null;
    }
    return { kind, target: [], arg: (fn as { v: string }).v, span };
  }

  if (kind === 'say' || kind === 'go') {
    const s = rest.find((t) => t.k === 'text' || t.k === 'word' || t.k === 'num');
    if (!s) {
      diags.push({ line, col: 1, level: 'warn', msg: `act ${kind} 后面缺少内容` });
      return null;
    }
    const arg = s.k === 'num' ? String(s.v) : (s as { v: string }).v;
    return { kind, target: [], arg, span };
  }

  if (kind === 'text') {
    const strIdx = rest.findIndex((t) => t.k === 'text');
    if (strIdx <= 0) {
      diags.push({ line, col: 1, level: 'warn', msg: 'act text 要写成：act text 选择器 "文字"' });
      return null;
    }
    return { kind, target: parseSelector(rest.slice(0, strIdx), line), arg: (rest[strIdx] as { v: string }).v, span };
  }

  /* add / remove / toggle：<类名> on <选择器> */
  const cls = rest[0];
  if (!cls || (cls.k !== 'word' && cls.k !== 'id')) {
    diags.push({ line, col: 1, level: 'warn', msg: `act ${kind} 后面缺少类名` });
    return null;
  }
  const onIdx = rest.findIndex((t) => t.k === 'word' && t.v === 'on');
  return {
    kind,
    /* 不写 on 选择器就是"操作自己"：act toggle done */
    target: onIdx >= 0 ? parseSelector(rest.slice(onIdx + 1), line) : [],
    arg: (cls as { v: string }).v,
    span
  };
}

/* ─────────────────────── 文档解析 ─────────────────────── */

function indentOf(line: string): number {
  let n = 0;
  for (const c of line) {
    if (c === ' ') n++;
    else if (c === '\t') n += 4;
    else break;
  }
  return n;
}

/** 去掉 `/*` 到行尾的内容（Copper 风格：注释不闭合） */
function stripComment(line: string): string {
  const i = line.indexOf('/*');
  return i >= 0 ? line.slice(0, i) : line;
}

type Frame = { rule: CuiRule; indent: number };

export function parseCui(src: string): CuiDocument {
  const rules: CuiRule[] = [];
  const diags: CuiDiag[] = [];
  const stack: Frame[] = [];
  const lines = src.split('\n');

  for (let ln = 0; ln < lines.length; ln++) {
    const lineNo = ln + 1;
    const raw = stripComment(lines[ln].replace(/\r$/, ''));
    if (!raw.trim()) continue;

    const indent = indentOf(raw);
    const toks = tokenize(raw);
    if (toks.length === 0) continue;

    /* 出栈：缩进回到同级或更外层 */
    while (stack.length > 0 && indent <= stack[stack.length - 1].indent) stack.pop();

    const parent = stack.length > 0 ? stack[stack.length - 1].rule : null;
    const words = toks.filter((t) => t.k === 'word').map((t) => (t as { v: string }).v);

    /* ── 动作行（act …）：挂在当前规则上，点/输入时执行 ── */
    const t0 = toks[0];
    if (t0.k === 'word' && t0.v === 'act') {
      if (!parent) {
        diags.push({ line: lineNo, col: 1, level: 'error', msg: '「act」前面缺少选择器' });
        continue;
      }
      const act = parseAction(toks, lineNo, diags);
      if (act) parent.actions.push(act);
      continue;
    }

    const hit = looksLikeSelector(toks) ? null : matchProp(words);

    if (hit) {
      /* ── 属性行 ── */
      if (!parent) {
        diags.push({ line: lineNo, col: 1, level: 'error', msg: `「${hit.raw}」前面缺少选择器` });
        continue;
      }
      const rest = toks.slice(hit.used);
      const values = parseValues(rest);
      if (values.length === 0 && hit.prop.type !== 'text') {
        /* ellipsis 单独写一行就该生效，不必再重复一遍值 */
        if (hit.prop.name === 'ellipsis') {
          values.push({ k: 'ident', v: 'ellipsis' });
        } else {
          diags.push({ line: lineNo, col: 1, level: 'warn', msg: `「${hit.raw}」没有值，已忽略` });
          continue;
        }
      }
      if (!hit.prop.multi && values.length > 1 && hit.prop.type !== 'shadow' && hit.prop.type !== 'any') {
        diags.push({ line: lineNo, col: 1, level: 'warn', msg: `「${hit.raw}」只接受一个值，多写的部分被忽略` });
      }
      const decl: CuiDecl = {
        prop: hit.prop.name,
        raw: hit.raw,
        values: hit.prop.multi || hit.prop.type === 'shadow' || hit.prop.type === 'any' ? values : values.slice(0, 1),
        span: { line: lineNo, col: 1 }
      };
      parent.decls.push(decl);
      continue;
    }

    /* ── 选择器行 ── */
    const sels = parseSelector(toks, lineNo);
    if (sels.length === 0) {
      diags.push({ line: lineNo, col: 1, level: 'warn', msg: '这一行既不是属性也不是选择器，已跳过' });
      continue;
    }
    const rule: CuiRule = { selectors: sels, decls: [], actions: [], children: [], span: { line: lineNo, col: 1 } };
    if (parent) parent.children.push(rule);
    else rules.push(rule);
    stack.push({ rule, indent });
  }

  return { rules, diags };
}

/* ─────────────────────────── 大纲 ─────────────────────────── */

/** 选择器还原成标签：btn .submit when hover → btn .submit :hover */
function selLabel(sels: CuiSelector[]): string {
  const out: string[] = [];
  for (const s of sels) {
    if (s.kind === 'type') out.push(s.value);
    else if (s.kind === 'class') out.push('.' + s.value);
    else if (s.kind === 'id') out.push('#' + s.value);
    else if (s.kind === 'when') out.push(':' + s.value);
    else if (s.kind === 'all') out.push('*');
  }
  return out.join(' ');
}

/** .cui 的大纲：右侧面板拿它当导航，点一条就跳到那一行。
 *  带 when 事件或 act 的规则会标出来，一眼能看出哪儿是"活的"。 */
export function cuiOutline(code: string): OutlineItem[] {
  const items: OutlineItem[] = [];
  const walk = (rules: CuiRule[], depth: number): void => {
    for (const r of rules) {
      const live = r.actions.length > 0
        || r.selectors.some((s) => s.kind === 'when' && EVENT_MAP.has(s.value));
      items.push({
        line: r.span.line,
        text: `${selLabel(r.selectors)}${live ? '  ·行为' : ''}`,
        icon: 'section',
        depth
      });
      walk(r.children, depth + 1);
    }
  };
  walk(parseCui(code).rules, 0);
  return items;
}
