/* Copper UI（.cui）的 AST 与诊断类型。
 *
 * 设计原则与 Copper 一致：一行一句、缩进成块、`/*` 注释到行尾。
 * 选择器 + 声明块 + 嵌套，编译期一次性拍平成 CSS —— 运行时不做选择器匹配。
 */

/** 源码位置：行号 1 基，列号 1 基 */
export type CuiSpan = { line: number; col: number };

/** 诊断级别：warn 只提示、样式照常生效；error 表示这一条被丢弃 */
export type CuiDiagLevel = 'warn' | 'error';

export type CuiDiag = CuiSpan & {
  level: CuiDiagLevel;
  msg: string;
};

/** 一个值。`num` 带可选单位，`token` 指主题令牌（s0/a1/t2…） */
export type CuiValue =
  | { k: 'num'; v: number; unit: string }
  | { k: 'color'; v: string }
  | { k: 'str'; v: string }
  | { k: 'ident'; v: string }
  | { k: 'token'; v: string }
  | { k: 'call'; name: string; args: CuiValue[] };

/** 一条属性声明，例如 `bg a1` / `pad 8 16` */
export type CuiDecl = {
  /** 归一化后的主名（colour → color） */
  prop: string;
  /** 源码里写的原名，用于报错 */
  raw: string;
  values: CuiValue[];
  span: CuiSpan;
};

/** `flag` 是运行时才有的状态类（源码里写 `+done`）：
 *  它只参与样式，不参与"这个元素要不要被建出来"。 */
export type CuiSelectorKind = 'type' | 'class' | 'id' | 'flag' | 'when' | 'child' | 'all';

export type CuiSelector = {
  kind: CuiSelectorKind;
  value: string;
};

/** 一条行为（`act` 行）：点了之后要对谁做什么。
 *
 * 这是 .cui 能"动"的原因：样式归 CSS，动作归这里。
 * 动作全是声明式的，不执行任意代码——所以预览里永远跑不炸。
 * `call` 是唯一的对外通道：调用 app/*.co 里的 Copper 函数，
 * 界面之外的计算归 Copper，不往界面里塞脚本。
 */
export type CuiActionKind = 'add' | 'remove' | 'toggle' | 'text' | 'say' | 'go' | 'call';

export type CuiAction = {
  kind: CuiActionKind;
  /** 操作对象；空表示"被点的那个元素自己" */
  target: CuiSelector[];
  /** 类名 / 文本 / 地址 */
  arg: string;
  span: CuiSpan;
};

/** 一条样式规则：选择器组合 + 属性 + 子规则 */
export type CuiRule = {
  selectors: CuiSelector[];
  decls: CuiDecl[];
  actions: CuiAction[];
  children: CuiRule[];
  span: CuiSpan;
};

export type CuiDocument = {
  rules: CuiRule[];
  diags: CuiDiag[];
};

/** 编译出来的交互行为：哪个元素、什么事件、做哪些动作 */
export type CuiBehavior = {
  /** 触发元素的选择器 */
  sel: string;
  event: 'click' | 'input' | 'change' | 'submit' | 'enter';
  action: { kind: CuiActionKind; target: string; arg: string };
};

/** 编译产物：一段可注入的 CSS，外加诊断与统计 */
export type CuiCompileResult = {
  css: string;
  diags: CuiDiag[];
  /** 交互行为，交给预览层挂到 iframe 上 */
  behaviors: CuiBehavior[];
  /** text 属性不是 CSS，单独取出来交给预览层写进 DOM */
  texts: { sel: string; text: string }[];
  /** src 属性同理，交给预览层设置 img 的地址 */
  imgs: { sel: string; src: string }[];
  /** hint 属性 → placeholder，输入框用 */
  hints: { sel: string; text: string }[];
  /** 命中属性条数，预览面板拿来显示"已应用 N 条" */
  declCount: number;
  /** 规则条数 */
  ruleCount: number;
};
