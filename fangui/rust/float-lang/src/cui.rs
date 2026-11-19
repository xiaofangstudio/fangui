//! Copper UI（.cui）编译器：词法 → 缩进树 → 选择器规则 → CSS。
//!
//! 与前端 TS 版（`src/cui/`）行为一致，是那份实现的 Rust 权威版本：
//! IDE 预览改走这里，AOT 构建也能用它校验并产出样式。
//!
//! 三条硬规矩：
//!   1. 一行一句，`/*` 注释到行尾，不用闭合；
//!   2. 缩进成块，全小写，属性空格分参；
//!   3. **永不 panic**——任何一条写坏了只丢这一条并记诊断，其余照常输出。

/* ───────────────────────── 诊断与产物 ───────────────────────── */

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Level {
    Warn,
    Error,
}

#[derive(Clone, Debug)]
pub struct Diag {
    pub line: usize,
    pub col: usize,
    pub level: Level,
    pub msg: String,
}

impl Diag {
    fn warn(line: usize, msg: impl Into<String>) -> Self {
        Diag { line, col: 1, level: Level::Warn, msg: msg.into() }
    }
    fn error(line: usize, msg: impl Into<String>) -> Self {
        Diag { line, col: 1, level: Level::Error, msg: msg.into() }
    }
}

#[derive(Clone, Debug)]
pub struct TextDecl {
    pub sel: String,
    pub text: String,
}

#[derive(Clone, Debug)]
pub struct ImgDecl {
    pub sel: String,
    pub src: String,
}

#[derive(Clone, Debug, Default)]
pub struct CompileResult {
    pub css: String,
    pub diags: Vec<Diag>,
    pub texts: Vec<TextDecl>,
    pub imgs: Vec<ImgDecl>,
    pub decl_count: usize,
    pub rule_count: usize,
}

impl CompileResult {
    pub fn has_error(&self) -> bool {
        self.diags.iter().any(|d| d.level == Level::Error)
    }
}

/* ───────────────────────── 词法 ───────────────────────── */

#[derive(Clone, Debug, PartialEq)]
enum Tok {
    /// 数字 + 单位（单位可能为空）
    Num(f64, String),
    /// 字符串字面量（已去引号）
    Text(String),
    /// #rrggbb
    Hex(String),
    /// #id
    Id(String),
    /// 标识符 / 中文
    Word(String),
    Punc(char),
}

fn is_word_start(c: char) -> bool {
    c.is_ascii_alphabetic() || c == '_' || ('\u{3400}'..='\u{9fff}').contains(&c)
}

fn is_word_part(c: char) -> bool {
    is_word_start(c) || c.is_ascii_digit()
}

fn is_hex_char(c: char) -> bool {
    c.is_ascii_hexdigit()
}

/// 去掉 `/*` 到行尾（Copper 风格：注释不闭合）
fn strip_comment(line: &str) -> &str {
    match line.find("/*") {
        Some(i) => &line[..i],
        None => line,
    }
}

/// 缩进宽度：tab 记 4 个空格
fn indent_of(line: &str) -> usize {
    let mut n = 0;
    for c in line.chars() {
        match c {
            ' ' => n += 1,
            '\t' => n += 4,
            _ => break,
        }
    }
    n
}

/// 把一行切成 token。不认识的字符直接跳过——样式层不能因为一个怪字符整体失效。
fn tokenize(line: &str) -> Vec<Tok> {
    let chars: Vec<char> = line.chars().collect();
    let mut out = Vec::new();
    let mut i = 0;

    while i < chars.len() {
        let c = chars[i];

        if c == ' ' || c == '\t' || c == '\u{3000}' {
            i += 1;
            continue;
        }

        /* 字符串 */
        if c == '"' || c == '\'' {
            let quote = c;
            let mut j = i + 1;
            let mut s = String::new();
            while j < chars.len() && chars[j] != quote {
                if chars[j] == '\\' && j + 1 < chars.len() {
                    s.push(chars[j + 1]);
                    j += 2;
                    continue;
                }
                s.push(chars[j]);
                j += 1;
            }
            out.push(Tok::Text(s));
            i = j + 1;
            continue;
        }

        /* #颜色 或 #实例 */
        if c == '#' {
            let mut j = i + 1;
            let mut body = String::new();
            while j < chars.len() && (chars[j].is_ascii_alphanumeric() || chars[j] == '_' || chars[j] == '-') {
                body.push(chars[j]);
                j += 1;
            }
            let all_hex = (3..=8).contains(&body.chars().count()) && body.chars().all(is_hex_char);
            if all_hex {
                out.push(Tok::Hex(format!("#{body}")));
            } else {
                out.push(Tok::Id(body));
            }
            i = j;
            continue;
        }

        /* 数字：允许负号、小数、单位 */
        let next_is_digit = chars.get(i + 1).map(|c| c.is_ascii_digit() || *c == '.').unwrap_or(false);
        if c.is_ascii_digit() || (c == '-' && next_is_digit) || (c == '.' && chars.get(i + 1).map(|c| c.is_ascii_digit()).unwrap_or(false)) {
            let mut j = i;
            if chars[j] == '-' {
                j += 1;
            }
            while j < chars.len() && (chars[j].is_ascii_digit() || chars[j] == '.') {
                j += 1;
            }
            let raw: String = chars[i..j].iter().collect();
            let mut unit = String::new();
            while j < chars.len() && (chars[j].is_ascii_alphabetic() || chars[j] == '%') {
                unit.push(chars[j]);
                j += 1;
            }
            let v = raw.parse::<f64>().unwrap_or(0.0);
            out.push(Tok::Num(v, unit));
            i = j;
            continue;
        }

        /* 标识符：词内允许连字符（linear-gradient、space-between），
         * 但后面必须紧跟词字符，否则归标点（calc(100% - 20px) 的减号）。 */
        if is_word_start(c) {
            let mut j = i;
            let mut w = String::new();
            while j < chars.len() {
                if is_word_part(chars[j]) {
                    w.push(chars[j]);
                    j += 1;
                    continue;
                }
                if chars[j] == '-' && chars.get(j + 1).map(|c| is_word_start(*c)).unwrap_or(false) {
                    w.push('-');
                    j += 1;
                    continue;
                }
                break;
            }
            out.push(Tok::Word(w));
            i = j;
            continue;
        }

        if "(),./:*>+-".contains(c) {
            out.push(Tok::Punc(c));
            i += 1;
            continue;
        }

        i += 1;
    }

    out
}

/* ───────────────────────── 词汇表 ───────────────────────── */

#[derive(Clone, Copy, PartialEq, Eq)]
enum Ty {
    Len,
    Num,
    Color,
    Kw,
    Text,
    Shadow,
    Any,
}

struct PropDef {
    name: &'static str,
    css: &'static str,
    ty: Ty,
    multi: bool,
}

const fn p(name: &'static str, css: &'static str, ty: Ty, multi: bool) -> PropDef {
    PropDef { name, css, ty, multi }
}

/// 属性总表。跟 `src/cui/props.ts` 一一对应，改一处就要改另一处。
const PROPS: &[PropDef] = &[
    /* 尺寸 */
    p("width", "width", Ty::Len, false),
    p("height", "height", Ty::Len, false),
    p("min width", "min-width", Ty::Len, false),
    p("max width", "max-width", Ty::Len, false),
    p("min height", "min-height", Ty::Len, false),
    p("max height", "max-height", Ty::Len, false),
    p("padding", "padding", Ty::Len, true),
    p("margin", "margin", Ty::Len, true),
    p("border", "border", Ty::Any, false),
    p("border color", "border-color", Ty::Color, false),
    p("border width", "border-width", Ty::Len, false),
    p("radius", "border-radius", Ty::Len, false),
    p("radius top", "border-radius", Ty::Len, false),
    p("radius bottom", "border-radius", Ty::Len, false),
    p("border style", "border-style", Ty::Kw, false),
    p("padding top", "padding-top", Ty::Len, false),
    p("padding bottom", "padding-bottom", Ty::Len, false),
    p("padding left", "padding-left", Ty::Len, false),
    p("padding right", "padding-right", Ty::Len, false),
    p("margin top", "margin-top", Ty::Len, false),
    p("margin bottom", "margin-bottom", Ty::Len, false),
    p("margin left", "margin-left", Ty::Len, false),
    p("margin right", "margin-right", Ty::Len, false),
    p("boxing", "box-sizing", Ty::Kw, false),
    /* 布局 */
    p("layout", "display", Ty::Kw, false),
    p("direction", "flex-direction", Ty::Kw, false),
    p("justify", "justify-content", Ty::Kw, false),
    p("align", "align-items", Ty::Kw, false),
    p("self align", "align-self", Ty::Kw, false),
    p("gap", "gap", Ty::Len, false),
    p("wrap", "flex-wrap", Ty::Kw, false),
    p("grow", "flex-grow", Ty::Num, false),
    p("shrink", "flex-shrink", Ty::Num, false),
    p("basis", "flex-basis", Ty::Len, false),
    p("position", "position", Ty::Kw, false),
    p("inset", "inset", Ty::Len, true),
    p("depth", "z-index", Ty::Num, false),
    p("overflow", "overflow", Ty::Kw, false),
    p("columns", "grid-template-columns", Ty::Any, true),
    p("rows", "grid-template-rows", Ty::Any, true),
    p("align content", "align-content", Ty::Kw, false),
    p("order", "order", Ty::Num, false),
    p("aspect", "aspect-ratio", Ty::Any, true),
    p("cursor", "cursor", Ty::Kw, false),
    p("gap row", "row-gap", Ty::Len, false),
    p("gap column", "column-gap", Ty::Len, false),
    p("justify items", "justify-items", Ty::Kw, false),
    p("justify self", "justify-self", Ty::Kw, false),
    p("auto flow", "grid-auto-flow", Ty::Kw, false),
    p("auto rows", "grid-auto-rows", Ty::Any, true),
    p("auto columns", "grid-auto-columns", Ty::Any, true),
    p("area", "grid-area", Ty::Any, true),
    p("float", "float", Ty::Kw, false),
    p("clear", "clear", Ty::Kw, false),
    /* 文本 */
    p("text", "", Ty::Text, false),
    p("hint", "", Ty::Text, false),
    p("type", "", Ty::Text, false),
    p("font", "font-family", Ty::Kw, false),
    p("size", "font-size", Ty::Len, false),
    p("weight", "font-weight", Ty::Kw, false),
    p("color", "color", Ty::Color, false),
    p("line height", "line-height", Ty::Num, false),
    p("text align", "text-align", Ty::Kw, false),
    p("letter spacing", "letter-spacing", Ty::Len, false),
    p("lines", "-webkit-line-clamp", Ty::Num, false),
    p("ellipsis", "text-overflow", Ty::Kw, false),
    p("text transform", "text-transform", Ty::Kw, false),
    p("white space", "white-space", Ty::Kw, false),
    p("decoration", "text-decoration", Ty::Kw, false),
    p("decoration color", "text-decoration-color", Ty::Color, false),
    p("indent", "text-indent", Ty::Len, false),
    p("word space", "word-spacing", Ty::Len, false),
    p("font style", "font-style", Ty::Kw, false),
    p("vertical align", "vertical-align", Ty::Kw, false),
    p("list style", "list-style", Ty::Kw, false),
    p("break", "word-break", Ty::Kw, false),
    p("overflow wrap", "overflow-wrap", Ty::Kw, false),
    p("select", "user-select", Ty::Kw, false),
    p("writing", "writing-mode", Ty::Kw, false),
    p("text shadow", "text-shadow", Ty::Shadow, false),
    p("content", "", Ty::Text, false),
    /* 背景与视觉 */
    p("background", "background", Ty::Color, false),
    p("source", "", Ty::Text, false),
    p("fit", "object-fit", Ty::Kw, false),
    p("opacity", "opacity", Ty::Num, false),
    p("shadow", "box-shadow", Ty::Shadow, false),
    p("glow", "box-shadow", Ty::Shadow, false),
    p("blur", "filter", Ty::Len, false),
    p("filter", "filter", Ty::Any, true),
    p("backdrop", "backdrop-filter", Ty::Any, true),
    p("background size", "background-size", Ty::Any, true),
    p("background position", "background-position", Ty::Any, true),
    p("background repeat", "background-repeat", Ty::Kw, false),
    p("background clip", "background-clip", Ty::Kw, false),
    p("blend", "mix-blend-mode", Ty::Kw, false),
    p("outline", "outline", Ty::Any, true),
    p("visibility", "visibility", Ty::Kw, false),
    p("pointer", "pointer-events", Ty::Kw, false),
    p("clip", "clip-path", Ty::Any, true),
    p("scroll behavior", "scroll-behavior", Ty::Kw, false),
    /* 变换 */
    p("move", "translate", Ty::Any, true),
    p("scale", "scale", Ty::Num, true),
    p("rotate", "rotate", Ty::Any, false),
    p("origin", "transform-origin", Ty::Kw, false),
    p("skew", "skew", Ty::Any, true),
    p("perspective", "perspective", Ty::Len, false),
    p("backface", "backface-visibility", Ty::Kw, false),
    /* 动效 */
    p("transition", "transition-property", Ty::Kw, true),
    p("duration", "transition-duration", Ty::Any, false),
    p("ease", "transition-timing-function", Ty::Kw, false),
    p("delay", "transition-delay", Ty::Any, false),
    p("animation", "animation", Ty::Any, true),
    p("theme", "", Ty::Text, false),
    p("iteration", "animation-iteration-count", Ty::Any, false),
    p("fill mode", "animation-fill-mode", Ty::Kw, false),
    p("play state", "animation-play-state", Ty::Kw, false),
    p("resize", "resize", Ty::Kw, false),
    p("touch", "touch-action", Ty::Kw, false),
];

/* 元件名：全部是完整词。旧缩写走 ELEMENT_ALIASES，照样认识。 */
const ELEMENTS: &[&str] = &[
    "window", "box", "row", "column", "text", "button", "input", "textarea", "image", "list", "item",
    "checkbox", "radio", "slider", "progress", "scroll", "spacer",
    /* 页面骨架：一个完整应用就是这几块拼起来的 */
    "view", "header", "footer", "nav", "main", "aside", "section", "card", "grid", "toolbar",
    "divider", "heading", "tabs", "tab",
    /* 表单 */
    "form", "field", "label", "dropdown", "option", "switch",
    /* 数据展示 */
    "table", "cell", "badge", "avatar", "icon", "spinner", "tip",
    /* 浮层与链接 */
    "overlay", "modal", "menu", "menuitem", "link",
    /* 反馈 */
    "alert", "empty",
];

const ELEMENT_ALIASES: &[(&str, &str)] = &[
    ("win", "window"),
    ("col", "column"),
    ("btn", "button"),
    ("area", "textarea"),
    ("img", "image"),
    ("lst", "list"),
    ("chk", "checkbox"),
    ("prog", "progress"),
];

const STATES: &[&str] = &[
    "hover", "pressed", "disabled", "focus", "focus within", "checked", "empty",
    "even", "odd", "first", "last", "only",
    "before", "after", "placeholder", "narrow", "wide",
];

/// 选择器组合符：child → >，next → +，sibling → ~
const COMBINATORS: &[(&str, &str)] = &[("child", ">"), ("next", "+"), ("sibling", "~")];

fn combinator_css(s: &str) -> Option<&'static str> {
    COMBINATORS.iter().find(|(a, _)| *a == s).map(|(_, c)| *c)
}

/* 事件词：when 后面可以出现，但只进行为表，不进 CSS（本层只管样式，跳过即可） */
const EVENTS: &[&str] = &["click", "input", "change", "submit", "enter"];

/* 主题令牌：完整词。旧字母令牌走 TOKEN_ALIASES。 */
const TOKENS: &[&str] = &[
    "canvas", "surface", "card", "wash", "sunken",
    "hairline", "line", "edge",
    "ink", "soft", "faint", "ghost",
    "accent", "primary", "tint", "tone",
    "ok", "err", "warn", "info",
];

const TOKEN_ALIASES: &[(&str, &str)] = &[
    ("s0", "canvas"), ("s1", "surface"), ("s2", "card"), ("s3", "wash"), ("s4", "sunken"),
    ("b1", "hairline"), ("b2", "line"), ("b3", "edge"),
    ("t1", "ink"), ("t2", "soft"), ("t3", "faint"), ("t4", "ghost"),
    ("a1", "accent"), ("a2", "primary"), ("a3", "tint"), ("a4", "tone"),
];

fn is_element(s: &str) -> bool {
    ELEMENTS.contains(&s) || ELEMENT_ALIASES.iter().any(|(a, _)| *a == s)
}

/// 元件名归一化：旧缩写 → 完整词，其余原样
fn element_name(s: &str) -> String {
    for (a, main) in ELEMENT_ALIASES {
        if *a == s {
            return (*main).to_string();
        }
    }
    s.to_string()
}

fn is_event(s: &str) -> bool {
    EVENTS.contains(&s)
}

fn is_state(s: &str) -> bool {
    STATES.contains(&s)
}

fn is_token(s: &str) -> bool {
    TOKENS.contains(&s) || TOKEN_ALIASES.iter().any(|(a, _)| *a == s)
}

/// 令牌归一化：旧字母令牌 → 完整词
fn token_name(s: &str) -> String {
    for (a, main) in TOKEN_ALIASES {
        if *a == s {
            return (*main).to_string();
        }
    }
    s.to_string()
}

/// 英式 / 旧缩写 / 常见别名 → 主名
fn alias_of(name: &str) -> &str {
    match name {
        "colour" => "color",
        "centre" => "center",
        "grey" => "gray",
        /* v2 及更早的字母缩写 */
        "pad" => "padding",
        "mar" => "margin",
        "bd" => "border",
        "bd color" => "border color",
        "bd width" => "border width",
        "rad" => "radius",
        "lay" => "layout",
        "dir" => "direction",
        "pos" => "position",
        "ins" => "inset",
        "z" => "depth",
        "ovf" => "overflow",
        "op" => "opacity",
        "bg" | "bg color" | "background color" | "background colour" => "background",
        "src" => "source",
        "dur" => "duration",
        "border color" | "border colour" => "border color",
        "border width" => "border width",
        "border radius" => "radius",
        "display" => "layout",
        "font size" => "size",
        "font weight" => "weight",
        "text colour" => "color",
        "padding_top" => "padding",
        "gap-px" => "gap",
        /* 新属性的顺口别名（与 src/cui/props.ts 保持一致） */
        "bd style" => "border style",
        "pad top" => "padding top",
        "pad bottom" => "padding bottom",
        "pad left" => "padding left",
        "pad right" => "padding right",
        "mar top" => "margin top",
        "mar bottom" => "margin bottom",
        "mar left" => "margin left",
        "mar right" => "margin right",
        "bg size" => "background size",
        "bg position" => "background position",
        "bg repeat" => "background repeat",
        "radius_top" => "radius top",
        "radius_bottom" => "radius bottom",
        "text decoration" | "line decoration" => "decoration",
        "bg clip" => "background clip",
        "blend mode" => "blend",
        other => other,
    }
}

fn find_prop(name: &str) -> Option<&'static PropDef> {
    PROPS.iter().find(|d| d.name == name)
}

/// 匹配行首属性名，支持 1~3 个词（多词属性）。
fn match_prop(words: &[&str]) -> Option<(&'static PropDef, usize, String)> {
    if words.is_empty() {
        return None;
    }
    let max = words.len().min(3);
    for n in (1..=max).rev() {
        let raw = words[..n].join(" ");
        let lower = raw.to_ascii_lowercase();
        let key = alias_of(&lower);
        if let Some(def) = find_prop(key) {
            return Some((def, n, raw));
        }
    }
    None
}

/* ───────────────────────── 值 ───────────────────────── */

#[derive(Clone, Debug)]
enum Value {
    Num(f64, String),
    Color(String),
    Str(String),
    Ident(String),
    Token(String),
    Call(String, Vec<Value>),
}

fn tok_to_value(t: &Tok) -> Option<Value> {
    Some(match t {
        Tok::Num(v, u) => Value::Num(*v, u.clone()),
        Tok::Text(s) => Value::Str(s.clone()),
        Tok::Hex(h) => Value::Color(h.clone()),
        Tok::Id(id) => Value::Ident(format!("#{id}")),
        Tok::Word(w) => {
            if is_token(w) {
                Value::Token(token_name(w))
            } else {
                Value::Ident(w.clone())
            }
        }
        Tok::Punc(_) => return None,
    })
}

fn parse_values(toks: &[Tok]) -> Vec<Value> {
    let mut out = Vec::new();
    let mut i = 0;
    while i < toks.len() {
        let t = &toks[i];

        if let Tok::Punc(c) = t {
            if matches!(c, ',' | '/' | ':' | '.') {
                i += 1;
                continue;
            }
        }

        /* 函数调用：word 紧跟 ( */
        if let Tok::Word(name) = t {
            if matches!(toks.get(i + 1), Some(Tok::Punc('('))) {
                let mut depth = 0usize;
                let mut inner: Vec<Tok> = Vec::new();
                let mut j = i + 1;
                while j < toks.len() {
                    if let Tok::Punc(c) = &toks[j] {
                        if *c == '(' {
                            depth += 1;
                            if depth == 1 {
                                j += 1;
                                continue;
                            }
                        } else if *c == ')' {
                            depth -= 1;
                            if depth == 0 {
                                break;
                            }
                        }
                    }
                    inner.push(toks[j].clone());
                    j += 1;
                }
                out.push(Value::Call(name.clone(), split_args(&inner)));
                i = j + 1;
                continue;
            }
        }

        if let Some(v) = tok_to_value(t) {
            out.push(v);
        }
        i += 1;
    }
    out
}

fn split_args(toks: &[Tok]) -> Vec<Value> {
    let mut groups: Vec<Vec<Tok>> = vec![Vec::new()];
    let mut depth = 0i32;
    for t in toks {
        if let Tok::Punc(c) = t {
            match c {
                '(' => depth += 1,
                ')' => depth -= 1,
                ',' if depth == 0 => {
                    groups.push(Vec::new());
                    continue;
                }
                _ => {}
            }
        }
        groups.last_mut().unwrap().push(t.clone());
    }
    groups
        .iter()
        .map(|g| {
            let vs = parse_values(g);
            if vs.len() == 1 {
                vs.into_iter().next().unwrap()
            } else {
                Value::Ident(g.iter().map(tok_text).collect::<Vec<_>>().join(" "))
            }
        })
        .collect()
}

fn tok_text(t: &Tok) -> String {
    match t {
        Tok::Num(v, u) => format!("{v}{u}"),
        Tok::Text(s) | Tok::Id(s) => s.clone(),
        Tok::Hex(h) | Tok::Word(h) => h.clone(),
        Tok::Punc(c) => c.to_string(),
    }
}

/* ───────────────────────── 语法树 ───────────────────────── */

#[derive(Clone, Copy, PartialEq)]
enum SelKind {
    Type,
    Class,
    Id,
    When,
    Combine,
    All,
}

#[derive(Clone)]
struct Sel {
    kind: SelKind,
    value: String,
}

#[derive(Clone)]
struct Decl {
    prop: String,
    raw: String,
    values: Vec<Value>,
    line: usize,
}

#[derive(Clone, Default)]
struct Rule {
    sels: Vec<Sel>,
    decls: Vec<Decl>,
    children: Vec<usize>,
}

struct Doc {
    arena: Vec<Rule>,
    roots: Vec<usize>,
    diags: Vec<Diag>,
}

fn words_of(toks: &[Tok]) -> Vec<&str> {
    toks.iter()
        .filter_map(|t| match t {
            Tok::Word(w) => Some(w.as_str()),
            _ => None,
        })
        .collect()
}

fn looks_like_selector(toks: &[Tok]) -> bool {
    let first = match toks.first() {
        Some(t) => t,
        None => return false,
    };
    match first {
        Tok::Word(w) => {
            if is_element(w) {
                /* text 既是元件也是属性：后面跟字符串才算属性；
                 * text align / text transform 这类多词属性也算属性。 */
                if w == "text" {
                    if matches!(toks.get(1), Some(Tok::Text(_))) {
                        return false;
                    }
                    if matches!(match_prop(&words_of(toks)), Some((_, n, _)) if n >= 2) {
                        return false;
                    }
                }
                return true;
            }
            match_prop(&words_of(toks)).is_none()
        }
        _ => true,
    }
}

fn parse_selector(toks: &[Tok]) -> Vec<Sel> {
    let mut sels = Vec::new();
    if toks.is_empty() {
        return sels;
    }

    let mut i = 0;
    match &toks[0] {
        Tok::Word(w) if is_element(w) => {
            sels.push(Sel { kind: SelKind::Type, value: element_name(w) });
            i = 1;
        }
        Tok::Word(w) if w == "all" => {
            sels.push(Sel { kind: SelKind::All, value: "*".into() });
            i = 1;
        }
        Tok::Word(w) => {
            sels.push(Sel { kind: SelKind::Class, value: w.clone() });
            i = 1;
        }
        Tok::Id(id) => {
            sels.push(Sel { kind: SelKind::Id, value: id.clone() });
            i = 1;
        }
        Tok::Hex(h) => {
            sels.push(Sel { kind: SelKind::Id, value: h.trim_start_matches('#').to_string() });
            i = 1;
        }
        _ => i = 1,
    }

    while i < toks.len() {
        match &toks[i] {
            Tok::Word(w) if w == "when" => {
                i += 1;
                while i < toks.len() {
                    let st = match toks.get(i) {
                        Some(Tok::Word(x)) => x.clone(),
                        _ => break,
                    };
                    /* 事件词（click / enter…）属于行为层，这里只管样式，跳过 */
                    if is_event(&st) {
                        i += 1;
                        continue;
                    }
                    /* 两词状态：focus within */
                    if let Some(Tok::Word(next)) = toks.get(i + 1) {
                        let two = format!("{st} {next}");
                        if is_state(&two) {
                            sels.push(Sel { kind: SelKind::When, value: two });
                            i += 2;
                            continue;
                        }
                    }
                    if !is_state(&st) {
                        break;
                    }
                    sels.push(Sel { kind: SelKind::When, value: st });
                    i += 1;
                }
            }
            /* child / next / sibling：选择器组合符 */
            Tok::Word(w) if combinator_css(w).is_some() => {
                sels.push(Sel { kind: SelKind::Combine, value: w.clone() });
                i += 1;
            }
            Tok::Word(w) => {
                sels.push(Sel { kind: SelKind::Class, value: w.clone() });
                i += 1;
            }
            Tok::Id(id) => {
                sels.push(Sel { kind: SelKind::Id, value: id.clone() });
                i += 1;
            }
            Tok::Hex(h) => {
                sels.push(Sel { kind: SelKind::Id, value: h.trim_start_matches('#').to_string() });
                i += 1;
            }
            _ => i += 1,
        }
    }

    sels
}

/// 解析整份 .cui：栈式缩进归块，规则之间是兄弟，属性挂当前规则。
fn parse_doc(src: &str) -> Doc {
    let mut arena: Vec<Rule> = Vec::new();
    let mut roots: Vec<usize> = Vec::new();
    let mut diags: Vec<Diag> = Vec::new();
    let mut stack: Vec<(usize, usize)> = Vec::new();

    for (ln, raw_line) in src.split('\n').enumerate() {
        let line_no = ln + 1;
        let line = strip_comment(raw_line.trim_end_matches('\r'));
        if line.trim().is_empty() {
            continue;
        }

        let indent = indent_of(line);
        let toks = tokenize(line);
        if toks.is_empty() {
            continue;
        }

        while let Some(&(top_indent, _)) = stack.last() {
            if indent <= top_indent {
                stack.pop();
            } else {
                break;
            }
        }

        let parent = stack.last().map(|&(_, idx)| idx);
        let hit = if looks_like_selector(&toks) {
            None
        } else {
            match_prop(&words_of(&toks))
        };

        if let Some((def, used, raw)) = hit {
            let mut values = parse_values(&toks[used..]);

            if values.is_empty() && def.ty != Ty::Text {
                if def.name == "ellipsis" {
                    values.push(Value::Ident("ellipsis".into()));
                } else {
                    diags.push(Diag::warn(line_no, format!("「{raw}」没有值，已忽略")));
                    continue;
                }
            }

            if !def.multi && values.len() > 1 && def.ty != Ty::Shadow && def.ty != Ty::Any {
                diags.push(Diag::warn(line_no, format!("「{raw}」只接受一个值，多写的部分被忽略")));
                values.truncate(1);
            }

            match parent {
                Some(idx) => arena[idx].decls.push(Decl {
                    prop: def.name.to_string(),
                    raw,
                    values,
                    line: line_no,
                }),
                None => diags.push(Diag::error(line_no, format!("「{raw}」前面缺少选择器"))),
            }
            continue;
        }

        let sels = parse_selector(&toks);
        if sels.is_empty() {
            diags.push(Diag::warn(line_no, "这一行既不是属性也不是选择器，已跳过"));
            continue;
        }

        let idx = arena.len();
        arena.push(Rule { sels, decls: Vec::new(), children: Vec::new() });
        match parent {
            Some(pidx) => arena[pidx].children.push(idx),
            None => roots.push(idx),
        }
        stack.push((indent, idx));
    }

    Doc { arena, roots, diags }
}

/* ───────────────────────── 生成 CSS ───────────────────────── */

fn token_var(name: &str) -> String {
    match name {
        "ok" | "err" | "warn" | "info" => format!("var(--sem-{name})"),
        other => format!("var(--{other})"),
    }
}

fn render_value(v: &Value) -> String {
    match v {
        Value::Num(n, u) => format!("{n}{u}"),
        Value::Color(c) => c.clone(),
        Value::Str(s) => s.clone(),
        Value::Ident(i) => i.clone(),
        Value::Token(t) => token_var(t),
        Value::Call(name, args) => render_call(name, args),
    }
}

fn render_call(name: &str, args: &[Value]) -> String {
    let a: Vec<String> = args.iter().map(render_value).collect();
    match name {
        "mix" => {
            if a.len() >= 3 {
                format!("color-mix(in srgb, {} {}%, {})", a[0], a[2], a[1])
            } else if a.len() == 2 {
                format!("color-mix(in srgb, {} 50%, {})", a[0], a[1])
            } else {
                a.first().cloned().unwrap_or_else(|| "transparent".into())
            }
        }
        "lighten" => format!(
            "color-mix(in srgb, {}, white {}%)",
            a.first().map(String::as_str).unwrap_or("white"),
            a.get(1).map(String::as_str).unwrap_or("20")
        ),
        "darken" => format!(
            "color-mix(in srgb, {}, black {}%)",
            a.first().map(String::as_str).unwrap_or("black"),
            a.get(1).map(String::as_str).unwrap_or("20")
        ),
        "alpha" | "fade" => {
            if a.len() >= 2 {
                let pct = (a[1].parse::<f64>().unwrap_or(0.0) * 100.0).round() as i64;
                format!("color-mix(in srgb, {} {}%, transparent)", a[0], pct)
            } else {
                a.first().cloned().unwrap_or_else(|| "transparent".into())
            }
        }
        "calc" => format!("calc({})", a.join(" ")),
        "gradient" => {
            /* gradient 90 accent primary → linear-gradient(90deg, var(--accent), var(--primary)) */
            let mut rest: Vec<String> = a.clone();
            let mut head = String::new();
            if let Some(Value::Num(n, u)) = args.first() {
                head = if u.is_empty() { format!("{n}deg") } else { format!("{n}{u}") };
                rest.remove(0);
            }
            let mut all = Vec::new();
            if !head.is_empty() {
                all.push(head);
            }
            all.extend(rest);
            format!("linear-gradient({})", all.join(", "))
        }
        "radial" => format!("radial-gradient(circle, {})", a.join(", ")),
        "shadow" => args
            .iter()
            .map(|v| match v {
                Value::Num(n, u) if u.is_empty() => format!("{n}px"),
                other => render_value(other),
            })
            .collect::<Vec<_>>()
            .join(" "),
        _ => format!("{}({})", name, a.join(", ")),
    }
}

fn as_length(v: &Value) -> String {
    match v {
        Value::Num(n, u) => {
            if u.is_empty() {
                format!("{n}px")
            } else {
                format!("{n}{u}")
            }
        }
        Value::Ident(i) if i == "fill" => "100%".into(),
        Value::Ident(i) if i == "fit" => "fit-content".into(),
        other => render_value(other),
    }
}

/// 关键字映射：cui 词 → CSS 词
fn kw_map(prop: &str, value: &str) -> String {
    let mapped = match prop {
        "layout" => match value {
            "flow" => "block",
            "row" | "hstack" => "flex",
            "column" | "vstack" => "flex",
            "stack" | "grid" => "grid",
            "none" => "none",
            other => other,
        },
        "direction" => match value {
            "row" => "row",
            "col" | "column" => "column",
            other => other,
        },
        "justify" => match value {
            "start" => "flex-start",
            "end" => "flex-end",
            "between" => "space-between",
            "around" => "space-around",
            "evenly" => "space-evenly",
            other => other,
        },
        "align" | "self align" => match value {
            "start" => "flex-start",
            "end" => "flex-end",
            other => other,
        },
        "align content" => match value {
            "start" => "flex-start",
            "end" => "flex-end",
            "between" => "space-between",
            "around" => "space-around",
            "evenly" => "space-evenly",
            other => other,
        },
        "cursor" => match value {
            "point" | "hand" => "pointer",
            "not" => "not-allowed",
            "cross" => "crosshair",
            other => other,
        },
        "text transform" => match value {
            "upper" => "uppercase",
            "lower" => "lowercase",
            "capital" => "capitalize",
            other => other,
        },
        "white space" => match value {
            "nowrap" => "nowrap",
            "wrap" => "pre-wrap",
            "normal" => "normal",
            other => other,
        },
        "wrap" => match value {
            "reverse" => "wrap-reverse",
            other => other,
        },
        "overflow" => match value {
            "show" => "visible",
            "hide" => "hidden",
            other => other,
        },
        "position" => match value {
            "flow" => "static",
            "abs" | "absolute" => "absolute",
            "fix" | "fixed" => "fixed",
            "rel" | "relative" => "relative",
            other => other,
        },
        "weight" => match value {
            "light" => "300",
            "regular" => "400",
            "medium" => "500",
            "semibold" => "600",
            "bold" => "700",
            "heavy" => "800",
            other => other,
        },
        "text align" => match value {
            "start" => "start",
            "end" => "end",
            other => other,
        },
        "boxing" => match value {
            "border" => "border-box",
            "content" => "content-box",
            other => other,
        },
        "fit" => match value {
            "scale" => "scale-down",
            other => other,
        },
        "ellipsis" => match value {
            "clip" => "clip",
            other => other,
        },
        "ease" => match value {
            "in" => "ease-in",
            "out" => "ease-out",
            "inout" => "ease-in-out",
            "spring" => "cubic-bezier(.2,.9,.25,1)",
            other => other,
        },
        "float" | "clear" => match value {
            "left" => "left",
            "right" => "right",
            "both" => "both",
            "none" => "none",
            other => other,
        },
        "decoration" => match value {
            "line" | "line through" => "line-through",
            "underline" => "underline",
            "overline" => "overline",
            "none" => "none",
            other => other,
        },
        "font style" => match value {
            "italic" => "italic",
            "oblique" => "oblique",
            "normal" => "normal",
            other => other,
        },
        "vertical align" => match value {
            "top" => "top",
            "middle" => "middle",
            "bottom" => "bottom",
            "baseline" => "baseline",
            other => other,
        },
        "list style" => match value {
            "none" => "none",
            "disc" => "disc",
            "circle" => "circle",
            "square" => "square",
            "decimal" => "decimal",
            other => other,
        },
        "break" => match value {
            "normal" => "normal",
            "break" => "break-all",
            "keep" => "keep-all",
            other => other,
        },
        "overflow wrap" => match value {
            "anywhere" => "anywhere",
            "break" => "break-word",
            "normal" => "normal",
            other => other,
        },
        "select" => match value {
            "none" => "none",
            "text" => "text",
            "all" => "all",
            other => other,
        },
        "writing" => match value {
            "horizontal" => "horizontal-tb",
            "vertical" => "vertical-rl",
            other => other,
        },
        "background repeat" => match value {
            "repeat" => "repeat",
            "none" => "no-repeat",
            "x" => "repeat-x",
            "y" => "repeat-y",
            other => other,
        },
        "background clip" => match value {
            "border" => "border-box",
            "padding" => "padding-box",
            "content" => "content-box",
            "text" => "text",
            other => other,
        },
        "blend" => match value {
            "normal" => "normal",
            "multiply" => "multiply",
            "screen" => "screen",
            "overlay" => "overlay",
            "darken" => "darken",
            "lighten" => "lighten",
            other => other,
        },
        "visibility" | "backface" => match value {
            "show" => "visible",
            "hide" => "hidden",
            other => other,
        },
        "pointer" => match value {
            "none" => "none",
            "auto" => "auto",
            other => other,
        },
        "scroll behavior" => match value {
            "smooth" => "smooth",
            "auto" => "auto",
            other => other,
        },
        "fill mode" => match value {
            "forwards" => "forwards",
            "backwards" => "backwards",
            "both" => "both",
            "none" => "none",
            other => other,
        },
        "play state" => match value {
            "running" => "running",
            "paused" => "paused",
            other => other,
        },
        "resize" => match value {
            "none" => "none",
            "both" => "both",
            "horizontal" => "horizontal",
            "vertical" => "vertical",
            other => other,
        },
        "touch" => match value {
            "none" => "none",
            "auto" => "auto",
            "pan" => "pan-x pan-y",
            other => other,
        },
        "justify items" | "justify self" => match value {
            "start" => "start",
            "end" => "end",
            "center" => "center",
            "stretch" => "stretch",
            other => other,
        },
        "auto flow" => match value {
            "row" => "row",
            "column" => "column",
            "dense" => "dense",
            other => other,
        },
        "border style" => match value {
            "solid" => "solid",
            "dashed" => "dashed",
            "dotted" => "dotted",
            "double" => "double",
            "none" => "none",
            other => other,
        },
        _ => value,
    };
    mapped.to_string()
}

fn join_values(values: &[Value], ty: Ty) -> String {
    if ty == Ty::Len || ty == Ty::Shadow {
        values.iter().map(as_length).collect::<Vec<_>>().join(" ")
    } else {
        values.iter().map(render_value).collect::<Vec<_>>().join(" ")
    }
}

fn decl_to_css(d: &Decl, def: &PropDef) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();

    if d.prop == "text" || d.prop == "source" || d.prop == "hint" || d.prop == "type" {
        return out;
    }

    match d.prop.as_str() {
        "content" => {
            /* 伪元素内容：content "→" */
            let text = d
                .values
                .first()
                .map(|v| match v {
                    Value::Str(s) => s.clone(),
                    other => render_value(other),
                })
                .unwrap_or_default();
            out.push(format!("content: \"{}\";", text.replace('"', "\\\"")));
        }
        "radius top" => {
            let r = d.values.first().map(as_length).unwrap_or_else(|| "0px".into());
            out.push(format!("border-top-left-radius: {r};"));
            out.push(format!("border-top-right-radius: {r};"));
        }
        "radius bottom" => {
            let r = d.values.first().map(as_length).unwrap_or_else(|| "0px".into());
            out.push(format!("border-bottom-left-radius: {r};"));
            out.push(format!("border-bottom-right-radius: {r};"));
        }
        "layout" => {
            let mode = d
                .values
                .first()
                .and_then(|v| match v {
                    Value::Ident(i) => Some(i.clone()),
                    _ => None,
                })
                .unwrap_or_else(|| "flow".to_string());
            out.push(format!("display: {};", kw_map("layout", &mode)));
            if mode == "row" || mode == "hstack" {
                out.push("flex-direction: row;".into());
            } else if mode == "column" || mode == "vstack" {
                out.push("flex-direction: column;".into());
            }
        }
        "aspect" => {
            /* aspect 16 9 → aspect-ratio: 16 / 9 */
            let one = |v: &Value| match v {
                Value::Num(n, _) => format!("{n}"),
                other => render_value(other),
            };
            if d.values.len() >= 2 {
                out.push(format!("aspect-ratio: {} / {};", one(&d.values[0]), one(&d.values[1])));
            } else if let Some(v) = d.values.first() {
                out.push(format!("aspect-ratio: {};", one(v)));
            }
        }
        "lines" => {
            out.push(format!("-webkit-line-clamp: {};", d.values.first().map(render_value).unwrap_or_default()));
            out.push("display: -webkit-box;".into());
            out.push("-webkit-box-orient: vertical;".into());
            out.push("overflow: hidden;".into());
        }
        "ellipsis" => {
            let v = d
                .values
                .first()
                .map(|v| match v {
                    Value::Ident(i) => kw_map("ellipsis", i),
                    other => render_value(other),
                })
                .unwrap_or_else(|| "ellipsis".into());
            out.push(format!("text-overflow: {v};"));
            out.push("overflow: hidden;".into());
            out.push("white-space: nowrap;".into());
        }
        "blur" => {
            let len = d.values.first().map(as_length).unwrap_or_else(|| "0px".into());
            out.push(format!("filter: blur({len});"));
        }
        "shadow" | "glow" => {
            let parts: Vec<String> = d
                .values
                .iter()
                .map(|v| match v {
                    Value::Num(n, u) if u.is_empty() => format!("{n}px"),
                    other => render_value(other),
                })
                .collect();
            out.push(format!("box-shadow: {};", parts.join(" ")));
        }
        "move" => {
            let parts: Vec<String> = d.values.iter().map(as_length).collect();
            out.push(format!("translate: {};", parts.join(" ")));
        }
        "rotate" => {
            let v = d
                .values
                .first()
                .map(|v| match v {
                    Value::Num(n, u) if u.is_empty() => format!("{n}deg"),
                    other => render_value(other),
                })
                .unwrap_or_default();
            out.push(format!("rotate: {v};"));
        }
        "border" => {
            if d.values.len() == 1 {
                out.push(format!("border: 1px solid {};", render_value(&d.values[0])));
            } else if !d.values.is_empty() {
                let w = match &d.values[0] {
                    Value::Num(..) => as_length(&d.values[0]),
                    _ => "1px".into(),
                };
                let style = d
                    .values
                    .iter()
                    .find_map(|v| match v {
                        Value::Ident(i) if matches!(i.as_str(), "solid" | "dashed" | "dotted" | "none") => Some(i.clone()),
                        _ => None,
                    })
                    .unwrap_or_else(|| "solid".into());
                let color = render_value(d.values.last().unwrap());
                out.push(format!("border: {w} {style} {color};"));
            }
        }
        "transition" => {
            let props: Vec<String> = d
                .values
                .iter()
                .map(|v| match v {
                    Value::Ident(i) => find_prop(alias_of(i)).map(|d| d.css.to_string()).unwrap_or_else(|| i.clone()),
                    other => render_value(other),
                })
                .collect();
            out.push(format!("transition-property: {};", props.join(", ")));
            out.push("transition-duration: var(--cui-dur, 160ms);".into());
        }
        "duration" => {
            let v = match d.values.first() {
                Some(Value::Num(n, u)) => {
                    if u.is_empty() {
                        format!("{n}ms")
                    } else {
                        format!("{n}{u}")
                    }
                }
                Some(other) => render_value(other),
                None => "160ms".into(),
            };
            out.push(format!("transition-duration: {v};"));
        }
        "animation" => {
            /* animation pop 400ms → animation: pop 400ms；
               只写动画名时补默认时长，与 TS 版 compile.ts 一致 */
            if d.values.is_empty() {
                return out;
            }
            let name = render_value(&d.values[0]);
            let rest = d.values[1..]
                .iter()
                .map(render_value)
                .collect::<Vec<_>>()
                .join(" ");
            let dur = if rest.is_empty() { "var(--cui-anim-dur, 300ms)".to_string() } else { rest };
            out.push(format!("animation: {name} {dur};"));
        }
        _ => {
            if def.css.is_empty() {
                return out;
            }
            let value = if d.values.len() == 1 {
                match &d.values[0] {
                    Value::Ident(i) => kw_map(&d.prop, i),
                    other => render_value(other),
                }
            } else {
                join_values(&d.values, def.ty)
            };
            if !value.is_empty() {
                out.push(format!("{}: {value};", def.css));
            }
        }
    }

    out
}

/// 状态词 → CSS 伪类。even/odd/first/last 要翻成 nth-child 系。
/// 断点词（narrow / wide）返回空串——它们由外层包 @media。
fn state_css(s: &str) -> String {
    match s {
        "even" => ":nth-child(even)".into(),
        "odd" => ":nth-child(odd)".into(),
        "first" => ":first-child".into(),
        "last" => ":last-child".into(),
        "only" => ":only-child".into(),
        "pressed" => ":active".into(),
        "focus within" => ":focus-within".into(),
        "before" => "::before".into(),
        "after" => "::after".into(),
        "placeholder" => "::placeholder".into(),
        "narrow" | "wide" => String::new(),
        other => format!(":{other}"),
    }
}

/// 规则上的断点：narrow / wide / 空
fn media_of(sels: &[Sel]) -> &'static str {
    for s in sels {
        if s.kind != SelKind::When {
            continue;
        }
        if s.value == "narrow" {
            return "narrow";
        }
        if s.value == "wide" {
            return "wide";
        }
    }
    ""
}

fn selector_of(sels: &[Sel]) -> String {
    /* 段式拼接：元件开新段，组合符（> + ~）单独占一格，最后用空格连接 */
    let mut segs: Vec<String> = Vec::new();
    let mut base = String::new();
    let mut classes = String::new();
    let mut states = String::new();
    let mut id = String::new();
    let mut open = false;

    macro_rules! flush {
        () => {
            if open {
                let head = if base.is_empty() { "*".to_string() } else { base.clone() };
                segs.push(format!("{head}{classes}{id}{states}"));
                base.clear();
                classes.clear();
                states.clear();
                id.clear();
                open = false;
            }
        };
    }

    for s in sels {
        match s.kind {
            SelKind::Type => {
                flush!();
                base = format!("[data-t=\"{}\"]", s.value);
                open = true;
            }
            SelKind::Class => {
                classes.push_str(&format!(".{}", s.value));
                open = true;
            }
            SelKind::Id => {
                id = format!("#{}", s.value);
                open = true;
            }
            SelKind::When => {
                let css = state_css(&s.value);
                if !css.is_empty() {
                    states.push_str(&css);
                    open = true;
                }
            }
            SelKind::Combine => {
                flush!();
                segs.push(combinator_css(&s.value).unwrap_or(">").to_string());
            }
            SelKind::All => {
                open = true;
            }
        }
    }
    flush!();

    if segs.is_empty() {
        "*".to_string()
    } else {
        segs.join(" ")
    }
}

struct Emitter<'a> {
    doc: &'a Doc,
    chunks: Vec<String>,
    /* 断点规则先单独收着，最后包进 @media */
    media_chunks: Vec<(String, String)>,
    diags: Vec<Diag>,
    texts: Vec<TextDecl>,
    imgs: Vec<ImgDecl>,
    decl_count: usize,
    rule_count: usize,
}

impl<'a> Emitter<'a> {
    fn walk(&mut self, idx: usize, parent: &str, inherited_media: &str) {
        let rule = &self.doc.arena[idx];
        let sel = selector_of(&rule.sels);
        let full = if parent.is_empty() { sel } else { format!("{parent} {sel}") };
        let own = media_of(&rule.sels);
        let media = if own.is_empty() { inherited_media } else { own };

        let mut body: Vec<String> = Vec::new();
        for d in &rule.decls {
            if d.prop == "text" {
                if let Some(v) = d.values.first() {
                    let text = match v {
                        Value::Str(s) => s.clone(),
                        other => render_value(other),
                    };
                    self.texts.push(TextDecl { sel: full.clone(), text });
                }
                continue;
            }
            if d.prop == "source" {
                if let Some(v) = d.values.first() {
                    let src = match v {
                        Value::Str(s) => s.clone(),
                        other => render_value(other),
                    };
                    self.imgs.push(ImgDecl { sel: full.clone(), src });
                }
                continue;
            }

            match find_prop(&d.prop) {
                Some(def) => {
                    let lines = decl_to_css(d, def);
                    if !lines.is_empty() {
                        body.extend(lines);
                        self.decl_count += 1;
                    }
                }
                None => {
                    self.diags.push(Diag::warn(d.line, format!("不认识的属性「{}」，已忽略", d.raw)));
                }
            }
        }

        if !body.is_empty() {
            let css = format!("{full} {{\n  {}\n}}", body.join("\n  "));
            if media.is_empty() {
                self.chunks.push(css);
            } else {
                self.media_chunks.push((media.to_string(), css));
            }
            self.rule_count += 1;
        }

        for &child in &rule.children {
            self.walk(child, &full, media);
        }
    }
}

/// 编译一份 .cui 源码。任何输入都不 panic。
pub fn compile(src: &str) -> CompileResult {
    let doc = parse_doc(src);
    let mut em = Emitter {
        doc: &doc,
        chunks: Vec::new(),
        media_chunks: Vec::new(),
        diags: doc.diags.clone(),
        texts: Vec::new(),
        imgs: Vec::new(),
        decl_count: 0,
        rule_count: 0,
    };

    for &root in &doc.roots {
        em.walk(root, "", "");
    }

    /* 断点收尾：窄屏 ≤ 720px，宽屏 > 720px */
    let narrow: Vec<String> = em
        .media_chunks
        .iter()
        .filter(|(k, _)| k == "narrow")
        .map(|(_, css)| css.clone())
        .collect();
    if !narrow.is_empty() {
        em.chunks.push(format!("@media (max-width: 720px) {{\n  {}\n}}", narrow.join("\n  ")));
    }
    let wide: Vec<String> = em
        .media_chunks
        .iter()
        .filter(|(k, _)| k == "wide")
        .map(|(_, css)| css.clone())
        .collect();
    if !wide.is_empty() {
        em.chunks.push(format!("@media (min-width: 721px) {{\n  {}\n}}", wide.join("\n  ")));
    }

    CompileResult {
        css: em.chunks.join("\n\n"),
        diags: em.diags,
        texts: em.texts,
        imgs: em.imgs,
        decl_count: em.decl_count,
        rule_count: em.rule_count,
    }
}

/// 只做语法校验：给 AOT / `lang_check` 用，不生成 CSS。
pub fn check(src: &str) -> Vec<Diag> {
    compile(src).diags
}

/* ───────────────────────── 测试 ───────────────────────── */

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn basic_rule() {
        let r = compile("button primary\n    background accent\n    padding 8 16\n");
        assert!(r.css.contains("[data-t=\"button\"].primary"));
        assert!(r.css.contains("background: var(--accent);"));
        assert!(r.css.contains("padding: 8px 16px;"));
        assert!(r.diags.is_empty());
        assert_eq!(r.rule_count, 1);
        assert_eq!(r.decl_count, 2);
    }

    /* v2 的字母缩写（btn / bg / pad / a1）仍当别名编译，产出归一化成完整词 */
    #[test]
    fn legacy_alias() {
        let r = compile("btn primary\n    bg a1\n    pad 8 16\n");
        assert!(r.css.contains("[data-t=\"button\"].primary"));
        assert!(r.css.contains("background: var(--accent);"));
        assert!(r.css.contains("padding: 8px 16px;"));
    }

    #[test]
    fn state_and_id() {
        let r = compile("button primary when hover\n    background primary\nbutton #go\n    radius 6\n");
        assert!(r.css.contains("[data-t=\"button\"].primary:hover"));
        assert!(r.css.contains("#go"));
    }

    #[test]
    fn text_and_src_collected() {
        let r = compile("text title\n    text \"你好\"\nimage logo\n    source \"a.png\"\n");
        assert_eq!(r.texts.len(), 1);
        assert_eq!(r.texts[0].text, "你好");
        assert_eq!(r.imgs.len(), 1);
        assert_eq!(r.imgs[0].src, "a.png");
        assert!(r.css.contains("[data-t=\"image\"].logo") == false); // 只有 source，没有 CSS 属性
    }

    #[test]
    fn nesting() {
        let r = compile("list\n    item when even\n        background wash\n");
        assert!(r.css.contains("[data-t=\"list\"] [data-t=\"item\"]:nth-child(even)"));
    }

    #[test]
    fn bad_input_never_panics() {
        let r = compile("    background accent\nbutton\n    background\n    %%%%\n    color ink\n");
        assert!(!r.css.is_empty());
        assert!(r.diags.iter().any(|d| d.level == Level::Error));
    }

    #[test]
    fn ellipsis_default() {
        let r = compile("text\n    ellipsis\n");
        assert!(r.css.contains("text-overflow: ellipsis;"));
    }

    #[test]
    fn transition_maps_prop() {
        let r = compile("button\n    transition background\n");
        assert!(r.css.contains("transition-property: background;"));
    }

    #[test]
    fn color_functions() {
        let r = compile("button\n    background mix(accent, primary, 30)\n");
        assert!(r.css.contains("color-mix(in srgb, var(--accent) 30%, var(--primary))"));
    }
}
