/* FangUI 公共入口。
 *
 * 四块能力：
 *   Theme —— 设计令牌：尺度 + 亮暗主题 + 强调色，生成 CSS 变量表
 *   Style —— 基础样式与组件层：重置、结构、40 个元件、动效
 *   CUI   —— .cui 界面语言：解析、编译成样式、长成 DOM、声明式行为
 *   Copper/AOT —— .co 逻辑语言与"打成一个能双击的软件"
 *
 * 框架不认具体宿主：读写文件、写启动器都由使用方通过 setFangHost / setAotHost 注入。
 */

export { setFangHost, fangHost, needFangHost } from './host';
export type { FangHost } from './host';

/* ── 令牌与样式 ── */
export {
  ACCENTS, DEFAULT_ACCENT, DEFAULT_THEME, SCALE, THEMES, TOKEN_GROUPS, TOKEN_NAMES,
  colorValue, cssVarOf
} from './theme/tokens';
export type { AccentName, ThemeName } from './theme/tokens';
export { themeCss, themeCssOnly } from './theme/css';
export { fanguiCss, fanguiCssOnly, BASE_CSS, TOKEN_CSS, COMPONENT_CSS, LAYOUT_CSS, RESET_CSS, MOTION_CSS } from './styles/index';

/* ── 组件目录（文档 / 补全 / 测试共用） ── */
export { COMPONENTS, COMPONENT_GROUPS, VARIANTS_OF, UTILITIES } from './cui/components';
export type { ComponentSpec } from './cui/components';

/* ── CUI ── */
export { parseCui } from './cui/parser';
export { compileCui, compileDocument } from './cui/compile';
export { buildCuiTree, renderCuiTree } from './cui/tree';
export {
  ELEMENTS, STATES, TOKENS, PROPS, PROP_ALIASES, COMBINATORS,
  STATE_MAP, EVENT_MAP, COMBINATOR_MAP, PROP_BY_NAME, elementName, matchProp
} from './cui/props';
export type { PropDef, PropType } from './cui/props';
export type {
  CuiBehavior, CuiCompileResult, CuiDecl, CuiDiag, CuiDocument,
  CuiRule, CuiSelector, CuiValue
} from './cui/ast';

/* ── Copper ── */
export { Runner } from './lang/interp';
export { parseProgram } from './lang/parse';
export { compileProgram } from './lang/codegen';
export { isNamespace } from './lang/stdlib';

/* ── AOT ── */
export { buildFrontend, buildTargets, renderAppHtml, setAotHost } from './core/aot';
export type {
  AotHost, BuildFrontendArgs, BuildFrontendResult,
  BuildTargetsArgs, BuildTargetsResult
} from './core/aot';
