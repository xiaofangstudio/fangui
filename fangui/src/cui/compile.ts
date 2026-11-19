/* .cui → CSS 编译器。
 *
 * 关键取舍：选择器在编译期就拍平成具体选择器串，运行时浏览器不需要
 * 再拿规则去扫一遍 DOM —— 这是 Copper UI 相对 CSS 快的地方之一。
 *
 * 另一条硬规矩：**样式层永不抛错**。任何一条属性写坏了，只是这一条被丢弃并
 * 记一条诊断，其余照常输出，界面绝不白屏。
 */

import type { CuiBehavior, CuiCompileResult, CuiDecl, CuiDiag, CuiDocument, CuiRule, CuiSelector, CuiValue } from './ast';
import type { PropDef, PropType } from './props';
import { COMBINATOR_MAP, EVENT_MAP, KEYWORDS, PROPS, PROP_ALIASES, PROP_BY_NAME, STATE_MAP, tokenName } from './props';
import { parseCui } from './parser';

/** 令牌 → CSS 变量名。旧字母令牌（s0/a2…）先归一化成完整词。ok/err/warn/info 走语义前缀。 */
const SEM_TOKENS = new Set(['ok', 'err', 'warn', 'info']);

function tokenVar(name: string): string {
  const t = tokenName(name);
  return SEM_TOKENS.has(t) ? `var(--sem-${t})` : `var(--${t})`;
}

/** 关键字映射：Copper UI 的词 → CSS 的词。旧值（hstack / abs …）留在表里当别名。 */
const KW: Record<string, Record<string, string>> = {
  layout: { flow: 'block', row: 'flex', column: 'flex', stack: 'grid', grid: 'grid', none: 'none', hstack: 'flex', vstack: 'flex' },
  direction: { row: 'row', column: 'column', col: 'column' },
  justify: { start: 'flex-start', end: 'flex-end', center: 'center', between: 'space-between', around: 'space-around', evenly: 'space-evenly' },
  align: { start: 'flex-start', end: 'flex-end', center: 'center', stretch: 'stretch', baseline: 'baseline' },
  'align content': { start: 'flex-start', end: 'flex-end', center: 'center', stretch: 'stretch', between: 'space-between', around: 'space-around', evenly: 'space-evenly' },
  cursor: { pointer: 'pointer', point: 'pointer', hand: 'pointer', text: 'text', move: 'move', not: 'not-allowed', grab: 'grab', wait: 'wait', cross: 'crosshair', default: 'default' },
  'text transform': { upper: 'uppercase', lower: 'lowercase', capital: 'capitalize', none: 'none' },
  'white space': { wrap: 'pre-wrap', nowrap: 'nowrap', normal: 'normal', pre: 'pre', balance: 'balance' },
  'self align': { start: 'flex-start', end: 'flex-end', center: 'center', stretch: 'stretch' },
  wrap: { wrap: 'wrap', nowrap: 'nowrap', reverse: 'wrap-reverse' },
  overflow: { show: 'visible', hide: 'hidden', scroll: 'scroll', auto: 'auto', clip: 'clip' },
  position: { flow: 'static', absolute: 'absolute', fixed: 'fixed', relative: 'relative', sticky: 'sticky', abs: 'absolute', fix: 'fixed', rel: 'relative' },
  weight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700', heavy: '800' },
  'text align': { start: 'start', center: 'center', end: 'end', left: 'left', right: 'right', justify: 'justify' },
  boxing: { border: 'border-box', content: 'content-box' },
  fit: { cover: 'cover', contain: 'contain', fill: 'fill', none: 'none', scale: 'scale-down' },
  ellipsis: { clip: 'clip', ellipsis: 'ellipsis' },
  ease: { linear: 'linear', in: 'ease-in', out: 'ease-out', inout: 'ease-in-out', spring: 'cubic-bezier(.2,.9,.25,1)', smooth: 'cubic-bezier(.22,1,.36,1)' }
};

/* 新增属性的关键字表从 props.ts 合并进来——一处定义，编译与补全共用 */
for (const [k, v] of Object.entries(KEYWORDS)) {
  KW[k] = { ...(KW[k] ?? {}), ...v };
}

/** 长度值：数字没单位时补 px；fill / fit 翻译成布局关键字 */
function asLength(v: CuiValue): string {
  if (v.k === 'num') return v.unit ? `${v.v}${v.unit}` : `${v.v}px`;
  if (v.k === 'ident') {
    if (v.v === 'fill') return '100%';
    if (v.v === 'fit') return 'fit-content';
  }
  return renderValue(v);
}

/** 把一个值渲染成 CSS 片段 */
function renderValue(v: CuiValue): string {
  switch (v.k) {
    case 'num': return v.unit ? `${v.v}${v.unit}` : String(v.v);
    case 'color': return v.v;
    case 'str': return v.v;
    case 'token': return tokenVar(v.v);
    case 'ident': return v.v;
    case 'call': return renderCall(v.name, v.args);
    default: return '';
  }
}

/** 取值函数：少数做语义转换，其余原样透传给浏览器 */
function renderCall(name: string, args: CuiValue[]): string {
  const a = args.map(renderValue);
  switch (name) {
    case 'mix':
      if (a.length >= 3) return `color-mix(in srgb, ${a[0]} ${a[2]}%, ${a[1]})`;
      if (a.length === 2) return `color-mix(in srgb, ${a[0]} 50%, ${a[1]})`;
      return a[0] ?? 'transparent';
    case 'lighten':
      return `color-mix(in srgb, ${a[0] ?? 'white'}, white ${a[1] ?? '20'}%)`;
    case 'darken':
      return `color-mix(in srgb, ${a[0] ?? 'black'}, black ${a[1] ?? '20'}%)`;
    case 'alpha':
    case 'fade':
      if (a.length >= 2) return `color-mix(in srgb, ${a[0]} ${Math.round((Number(a[1]) || 0) * 100)}%, transparent)`;
      return a[0] ?? 'transparent';
    case 'calc':
      return `calc(${a.join(' ')})`;
    case 'gradient': {
      /* gradient 90 accent primary → linear-gradient(90deg, var(--accent), var(--primary)) */
      const first = args[0];
      let rest = a;
      let head = '';
      if (first && first.k === 'num') {
        head = first.unit ? `${first.v}${first.unit}` : `${first.v}deg`;
        rest = a.slice(1);
      }
      return `linear-gradient(${[head, ...rest].filter(Boolean).join(', ')})`;
    }
    case 'radial':
      return `radial-gradient(circle, ${a.join(', ')})`;
    case 'shadow': {
      const parts = args.map((v) => (v.k === 'num' ? (v.unit ? `${v.v}${v.unit}` : `${v.v}px`) : renderValue(v)));
      return parts.join(' ');
    }
    default:
      return `${name}(${a.join(', ')})`;
  }
}

/** 一组值 → CSS 值串（多值用空格连接） */
function joinValues(values: CuiValue[], type: PropType): string {
  return type === 'len' || type === 'shadow'
    ? values.map(asLength).join(' ').trim()
    : values.map(renderValue).join(' ').trim();
}

/**
 * 一条声明 → 零到多条 CSS 声明。
 * 返回的字符串形如 `background: var(--a1);`
 */
function declToCss(d: CuiDecl, def: PropDef): string[] {
  const out: string[] = [];
  const kw = (v: CuiValue, table: string): string =>
    v.k === 'ident' ? (KW[table]?.[v.v] ?? v.v) : renderValue(v);

  switch (d.prop) {
    /* 文本内容与图片地址都不归 CSS 管，由预览层写进 DOM */
    case 'text':
    case 'source':
    case 'hint':
    case 'type':
      return out;

    case 'layout': {
      const mode = d.values[0]?.k === 'ident' ? d.values[0].v : 'flow';
      out.push(`display: ${KW.layout[mode] ?? 'block'};`);
      if (mode === 'row' || mode === 'hstack') out.push('flex-direction: row;');
      if (mode === 'column' || mode === 'vstack') out.push('flex-direction: column;');
      return out;
    }

    case 'content': {
      /* 伪元素内容：content "→" */
      const v = d.values[0];
      const text = v && v.k === 'str' ? v.v : v ? renderValue(v) : '';
      out.push(`content: "${text.replace(/"/g, '\\"')}";`);
      return out;
    }

    case 'animation': {
      /* animation pop 400ms → animation: pop 400ms；
         只写动画名时补默认时长（走令牌），免得 0 秒看不出效果 */
      const v = d.values;
      if (v.length === 0) return out;
      const name = renderValue(v[0]);
      const rest = v.slice(1).map(renderValue).join(' ');
      out.push(`animation: ${name} ${rest || 'var(--cui-anim-dur, 300ms)'};`);
      return out;
    }

    case 'radius top': {
      const r = asLength(d.values[0]);
      out.push(`border-top-left-radius: ${r};`);
      out.push(`border-top-right-radius: ${r};`);
      return out;
    }

    case 'radius bottom': {
      const r = asLength(d.values[0]);
      out.push(`border-bottom-left-radius: ${r};`);
      out.push(`border-bottom-right-radius: ${r};`);
      return out;
    }

    case 'aspect': {
      /* 贴近 CSS 的 aspect-ratio：写 `aspect 16 9` 就是 16 / 9 */
      const v = d.values;
      const one = (x: CuiValue): string => (x.k === 'num' ? String(x.v) : renderValue(x));
      if (v.length >= 2) {
        out.push(`aspect-ratio: ${one(v[0])} / ${one(v[1])};`);
      } else if (v.length === 1) {
        out.push(`aspect-ratio: ${one(v[0])};`);
      }
      return out;
    }

    case 'lines':
      out.push(`-webkit-line-clamp: ${renderValue(d.values[0])};`);
      out.push('display: -webkit-box;');
      out.push('-webkit-box-orient: vertical;');
      out.push('overflow: hidden;');
      return out;

    case 'ellipsis':
      out.push(`text-overflow: ${kw(d.values[0], 'ellipsis')};`);
      out.push('overflow: hidden;');
      out.push('white-space: nowrap;');
      return out;

    case 'blur':
      out.push(`filter: blur(${asLength(d.values[0])});`);
      return out;

    case 'shadow':
    case 'glow': {
      const parts = d.values.map((v) => (v.k === 'num' ? (v.unit ? `${v.v}${v.unit}` : `${v.v}px`) : renderValue(v)));
      out.push(`box-shadow: ${parts.join(' ')};`);
      return out;
    }

    case 'move':
      out.push(`translate: ${d.values.map(asLength).join(' ')};`);
      return out;

    case 'rotate': {
      const v = d.values[0];
      out.push(`rotate: ${v && v.k === 'num' && !v.unit ? `${v.v}deg` : renderValue(v)};`);
      return out;
    }

    case 'border': {
      const vals = d.values;
      if (vals.length === 1) {
        out.push(`border: 1px solid ${renderValue(vals[0])};`);
      } else {
        const w = vals[0]?.k === 'num' ? asLength(vals[0]) : '1px';
        const style = vals.find((v) => v.k === 'ident' && ['solid', 'dashed', 'dotted', 'none'].includes(v.v));
        const color = vals[vals.length - 1];
        out.push(`border: ${w} ${style && style.k === 'ident' ? style.v : 'solid'} ${renderValue(color)};`);
      }
      return out;
    }

    case 'transition': {
      /* 值里写的可能是 cui 属性名（background / radius），要翻成真正的 CSS 名 */
      const props = d.values
        .map((v) => {
          if (v.k === 'ident') {
            const def = PROP_BY_NAME.get(PROP_ALIASES[v.v] ?? v.v);
            return def?.css || v.v;
          }
          return renderValue(v);
        })
        .join(', ');
      out.push(`transition-property: ${props};`);
      out.push('transition-duration: var(--cui-dur, 160ms);');
      return out;
    }

    case 'duration': {
      const v = d.values[0];
      const ms = v && v.k === 'num' ? (v.unit ? `${v.v}${v.unit}` : `${v.v}ms`) : renderValue(v);
      out.push(`transition-duration: ${ms};`);
      return out;
    }

    case 'radius': {
      /* 圆角写名字走令牌（xs / s / m / l / xl / full），写数字就是 px。
         多值（8 8 0 0）照旧逐个翻，不要因为第一个是名字就把后面丢了。 */
      const NAMES = new Set(['xs', 's', 'm', 'l', 'xl', 'full']);
      const out2: string[] = [];
      for (const v of d.values) {
        out2.push(v.k === 'ident' && NAMES.has(v.v) ? `var(--radius-${v.v})` : asLength(v));
      }
      out.push(`border-radius: ${out2.join(' ')};`);
      return out;
    }

    case 'columns': {
      /* `columns 3` 是"等分三列"，翻成 repeat(3, 1fr)；
         写全（repeat(3, 1fr) / 200 1fr）就原样透传。 */
      const v = d.values;
      if (v.length === 1 && v[0] && v[0].k === 'num' && !v[0].unit) {
        out.push(`grid-template-columns: repeat(${v[0].v}, 1fr);`);
        return out;
      }
      const raw = v.map(renderValue).join(' ');
      if (raw) out.push(`grid-template-columns: ${raw};`);
      return out;
    }

    default: {
      if (!def.css) return out;
      const table = KW[d.prop];
      const value = table && d.values.length === 1 ? kw(d.values[0], d.prop) : joinValues(d.values, def.type);
      if (!value) return out;
      out.push(`${def.css}: ${value};`);
      return out;
    }
  }
}

/* ─────────────────────── 选择器 ─────────────────────── */

function selectorOf(sels: CuiSelector[]): string {
  /* 一条规则里可以沿线写后代：`all item row +done text task`
     意思是「item.row.done 里面的 text.task」。每遇到一个新的元件名，
     就开一段新的后代选择器，段与段之间用空格连起来。 */
  const segs: string[] = [];
  let base = '';
  let classes: string[] = [];
  let states: string[] = [];
  let id = '';
  let open = false;

  const flush = (): void => {
    if (!open) return;
    segs.push((base || '*') + classes.join('') + id + states.join(''));
    base = ''; classes = []; states = []; id = ''; open = false;
  };

  for (const s of sels) {
    switch (s.kind) {
      case 'type':
        if (open) flush();
        base = `[data-t="${s.value}"]`;
        open = true;
        break;
      case 'class': classes.push('.' + s.value); open = true; break;
      case 'flag': classes.push('.' + s.value); open = true; break;
      case 'id': id = '#' + s.value; open = true; break;
      case 'child': {
        /* 组合符：先把当前段收尾，再单独占一格，最后 join 时用空格隔开 */
        flush();
        segs.push(COMBINATOR_MAP.get(s.value) ?? s.value);
        break;
      }
      case 'when': {
        /* 事件（click / input…）不是伪类，不能写进 CSS；
           它由 behaviors 交给预览层挂监听器。断点（narrow / wide）整条规则搬进 @media。 */
        if (EVENT_MAP.has(s.value)) break;
        const css = STATE_MAP.get(s.value) ?? `:${s.value}`;
        if (css.startsWith('@')) break;
        states.push(css);
        open = true;
        break;
      }
      case 'all': break;
      default: break;
    }
  }
  flush();

  if (segs.length === 0) return '*';
  return segs.join(' ');
}

/** 规则上的断点（when narrow / wide）；没有就返回空串 */
function mediaOf(rule: CuiRule): string {
  for (const s of rule.selectors) {
    if (s.kind !== 'when') continue;
    const css = STATE_MAP.get(s.value) ?? '';
    if (css === '@narrow') return 'narrow';
    if (css === '@wide') return 'wide';
  }
  return '';
}

/* ─────────────────────── 主流程 ─────────────────────── */

/** 规则上挂的事件（`when click` 这类）；没有就是纯样式规则 */
function eventOf(rule: CuiRule): CuiBehavior['event'] | null {
  for (const s of rule.selectors) {
    if (s.kind !== 'when') continue;
    const ev = EVENT_MAP.get(s.value);
    if (ev) return ev;
  }
  return null;
}

export function compileDocument(doc: CuiDocument): CuiCompileResult {
  const chunks: string[] = [];
  /* 断点规则单独收着，最后包进 @media；子规则继承父规则的断点 */
  const mediaChunks: { media: string; css: string }[] = [];
  const diags: CuiDiag[] = [...doc.diags];
  const texts: { sel: string; text: string }[] = [];
  const imgs: { sel: string; src: string }[] = [];
  const hints: { sel: string; text: string }[] = [];
  const behaviors: CuiBehavior[] = [];
  let declCount = 0;
  let ruleCount = 0;

  const walk = (rule: CuiRule, parentSel: string, inheritedMedia: string): void => {
    const sel = selectorOf(rule.selectors);
    const full = parentSel ? `${parentSel} ${sel}` : sel;
    const media = mediaOf(rule) || inheritedMedia;
    const body: string[] = [];
    /* icon 的 text 是图标名：已经写进 data-icon，运行时注入 SVG，不能再当文字写回元素 */
    const isIcon = rule.selectors.some((s) => s.kind === 'type' && s.value === 'icon');

    for (const d of rule.decls) {
      if (d.prop === 'text') {
        if (isIcon) continue;
        const v = d.values[0];
        if (v) texts.push({ sel: full, text: v.k === 'str' ? v.v : renderValue(v) });
        continue;
      }
      if (d.prop === 'source') {
        const v = d.values[0];
        if (v) imgs.push({ sel: full, src: v.k === 'str' ? v.v : renderValue(v) });
        continue;
      }
      if (d.prop === 'hint') {
        const v = d.values[0];
        if (v) hints.push({ sel: full, text: v.k === 'str' ? v.v : renderValue(v) });
        continue;
      }
      const def = PROP_BY_NAME.get(d.prop);
      if (!def) {
        diags.push({ line: d.span.line, col: d.span.col, level: 'warn', msg: `不认识的属性「${d.raw}」，已忽略` });
        continue;
      }
      const lines = declToCss(d, def);
      if (lines.length > 0) {
        body.push(...lines);
        declCount++;
      }
    }

    if (body.length > 0) {
      const css = `${full} {\n  ${body.join('\n  ')}\n}`;
      if (media === 'narrow' || media === 'wide') mediaChunks.push({ media, css });
      else chunks.push(css);
      ruleCount++;
    }

    /* 动作 → behaviors：预览层按这个挂监听器，点了就执行 */
    const event = eventOf(rule);
    if (event) {
      for (const a of rule.actions) {
        behaviors.push({
          sel: full,
          event,
          action: { kind: a.kind, target: a.target.length > 0 ? selectorOf(a.target) : '', arg: a.arg }
        });
      }
    } else if (rule.actions.length > 0) {
      diags.push({
        line: rule.actions[0].span.line,
        col: 1,
        level: 'warn',
        msg: 'act 要写在「when click」或「when input」的规则里才会执行'
      });
    }

    for (const child of rule.children) walk(child, full, media);
  };

  for (const r of doc.rules) walk(r, '', '');

  /* 断点规则收尾：窄屏 ≤ 720px，宽屏 > 720px */
  const narrow = mediaChunks.filter((m) => m.media === 'narrow').map((m) => m.css);
  if (narrow.length > 0) chunks.push(`@media (max-width: 720px) {\n  ${narrow.join('\n  ')}\n}`);
  const wide = mediaChunks.filter((m) => m.media === 'wide').map((m) => m.css);
  if (wide.length > 0) chunks.push(`@media (min-width: 721px) {\n  ${wide.join('\n  ')}\n}`);

  return { css: chunks.join('\n\n'), diags, behaviors, texts, imgs, hints, declCount, ruleCount };
}

export function compileCui(src: string): CuiCompileResult {
  const doc = parseCui(src);
  return compileDocument(doc);
}

/** 属性名 → CSS 名，编辑器悬停文档要用 */
export const cssNameOf = (cuiName: string): string => PROP_BY_NAME.get(cuiName)?.css ?? '';

/** 全部属性主名，补全用 */
export const PROP_NAMES = PROPS.map((p) => p.name);
