/* 样式总装。
 *
 * 顺序很重要：令牌 → 重置 → 结构 → 组件 → 动效。
 * 宿主注入时永远把这一坨放在 .cui 编译产物之前，作者的覆盖才生效。 */

import { themeCss, themeCssOnly, type ThemeCssOptions } from '../theme/css';
import { COMPONENT_CSS } from './components';
import { MOTION_CSS, RESET_CSS } from './foundation';
import { LAYOUT_CSS } from './layout';

export { themeCss, themeCssOnly };
export type { ThemeCssOptions };
export { RESET_CSS, MOTION_CSS, LAYOUT_CSS, COMPONENT_CSS };

/** 基础样式：重置 + 结构 + 组件 + 动效（不含令牌）。 */
export const BASE_CSS = [RESET_CSS, LAYOUT_CSS, COMPONENT_CSS, MOTION_CSS].join('\n');

/** 令牌表（亮暗 + 全部强调色）。 */
export const TOKEN_CSS = themeCss();

/** 一套可直接 <link> 的完整 CSS：令牌 + 其余全部。 */
export function fanguiCss(opts: ThemeCssOptions = {}): string {
  return themeCss(opts) + '\n' + BASE_CSS;
}

/** 只取一套主题的精简版，产物可以小一点。 */
export function fanguiCssOnly(theme: 'light' | 'dark' = 'light'): string {
  return themeCssOnly(theme) + '\n' + BASE_CSS;
}
