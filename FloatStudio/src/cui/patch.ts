/* 预览 ↔ 源码 的桥。
 *
 * 预览里点中的是 DOM 元素，源码里写的是 `.cui` 规则——两边得对上，
 * 用户才能在左边点一下、在下面改个值，右边文本自己更新。
 */

import type { CuiDocument, CuiRule, CuiValue } from './ast';
import { ELEMENT_NAMES, matchProp } from './props';
import { tokenize } from './parser';

/** 预览里点中的元素长什么样（iframe 采集后回传） */
export type CuiPick = { tag: string; cls: string; id: string };

function indentOf(line: string): number {
  let n = 0;
  for (const c of line) {
    if (c === ' ') n++;
    else if (c === '\t') n += 4;
    else break;
  }
  return n;
}

function flatten(rules: CuiRule[], out: CuiRule[]): void {
  for (const r of rules) {
    out.push(r);
    flatten(r.children, out);
  }
}

/** 找出最匹配这个元素的那条规则。
 *
 * 不做真正的选择器求值，只按「元件 + 类 + #实例」逐项比对，
 * 命中得越具体分数越高；带 when（hover/click）的规则让位给基础规则。
 */
export function findRuleForPick(doc: CuiDocument, pick: CuiPick): CuiRule | null {
  const all: CuiRule[] = [];
  flatten(doc.rules, all);
  const classes = new Set(pick.cls.split(/\s+/).filter(Boolean));
  let best: CuiRule | null = null;
  let bestScore = -1;

  for (const r of all) {
    let score = 0;
    let ok = true;
    for (const s of r.selectors) {
      if (s.kind === 'type') {
        if (!pick.tag || s.value !== pick.tag) { ok = false; break; }
        score += 4;
      } else if (s.kind === 'class') {
        if (!classes.has(s.value)) { ok = false; break; }
        score += 2;
      } else if (s.kind === 'id') {
        if (!pick.id || s.value !== pick.id) { ok = false; break; }
        score += 6;
      } else if (s.kind === 'flag') {
        /* +done 这类运行时类：没命中就不算这条规则 */
        if (!classes.has(s.value)) { ok = false; break; }
        score -= 6;
      } else if (s.kind === 'when') {
        score -= 8;
      }
    }
    if (!ok) continue;
    if (score > bestScore) { best = r; bestScore = score; }
  }
  return best;
}

/** 一行是不是属性声明（是就返回主属性名） */
function propOf(line: string): string | null {
  const toks = tokenize(line);
  if (toks.length === 0) return null;
  const first = toks[0];
  if (first.k === 'word' && ELEMENT_NAMES.has(first.v)) return null;
  const words = toks.filter((t) => t.k === 'word').map((t) => (t as { v: string }).v);
  const hit = matchProp(words);
  return hit ? hit.prop.name : null;
}

/** 把一条属性写进规则：已有就改那一行，没有就补在最后一条属性后面。
 *
 * 只改动目标行，其余原文一个字都不碰——所以注释、空行、缩进风格都保得住。
 */
export function patchCuiProp(src: string, rule: CuiRule, prop: string, value: string): string {
  const lines = src.split('\n');
  const start = rule.span.line - 1;
  if (start < 0 || start >= lines.length) return src;

  const ruleIndent = indentOf(lines[start]);
  let end = start;
  let lastDecl = -1;

  for (let i = start + 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    if (indentOf(lines[i]) <= ruleIndent) break;
    end = i;
    if (propOf(lines[i])) lastDecl = i;
  }

  for (let i = start + 1; i <= end; i++) {
    if (propOf(lines[i]) !== prop) continue;
    lines[i] = ' '.repeat(indentOf(lines[i])) + prop + ' ' + value;
    return lines.join('\n');
  }

  const at = (lastDecl >= 0 ? lastDecl : start) + 1;
  const indent = lastDecl >= 0 ? indentOf(lines[lastDecl]) : ruleIndent + 4;
  lines.splice(at, 0, ' '.repeat(indent) + prop + ' ' + value);
  return lines.join('\n');
}

/** 把声明里的值还原成能写回源码的样子 */
export function valueText(v: CuiValue | undefined): string {
  if (!v) return '';
  switch (v.k) {
    case 'num': return v.unit ? `${v.v}${v.unit}` : String(v.v);
    case 'color': return v.v;
    case 'str': return `"${v.v}"`;
    case 'token': return v.v;
    case 'ident': return v.v;
    default: return '';
  }
}
