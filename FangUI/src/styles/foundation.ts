/* 地基：抹平浏览器默认外观、字体基线、动效关键帧、无障碍底线。
 *
 * 这一段不含任何组件长相——组件在 components.ts。这里的每一条都应该
 * "不写也能用，写了更顺手"，作者不该被迫覆盖它。 */

export const RESET_CSS = `
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body {
  font-family: "Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", "Segoe UI", system-ui, sans-serif;
  font-size: var(--font-sm);
  line-height: 1.6;
  background: var(--canvas);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
* { -webkit-tap-highlight-color: transparent; }
button, input, textarea, select { font: inherit; color: inherit; }
button { cursor: pointer; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
img { max-width: 100%; }
::selection { background: var(--tint); color: var(--ink); }

/* 滚动条：细、贴主题、不抢视线 */
* { scrollbar-width: thin; scrollbar-color: var(--edge) transparent; }
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: var(--edge);
  border: 3px solid transparent;
  background-clip: content-box;
  border-radius: 999px;
}
::-webkit-scrollbar-thumb:hover { background: var(--faint); background-clip: content-box; }

/* 无障碍底线：键盘焦点永远看得见；鼠标点出来的焦点不画环 */
:focus { outline: none; }
:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 1px;
  border-radius: var(--radius-s);
}
:disabled, [aria-disabled="true"] { cursor: not-allowed; }

/* 系统要求减少动效时，框架自己先让路 */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}
`;

/** 动效预设：animation 名字就是 .cui 里的词。 */
export const MOTION_CSS = `
@keyframes fade-in { from { opacity: 0; } }
@keyframes fade-out { to { opacity: 0; } }
@keyframes slide-up { from { opacity: 0; transform: translateY(14px); } }
@keyframes slide-down { from { opacity: 0; transform: translateY(-14px); } }
@keyframes slide-left { from { opacity: 0; transform: translateX(18px); } }
@keyframes slide-right { from { opacity: 0; transform: translateX(-18px); } }
@keyframes pop { 0% { opacity: 0; transform: scale(.86); } 60% { transform: scale(1.03); } 100% { opacity: 1; transform: scale(1); } }
@keyframes pulse { 50% { opacity: .55; } }
@keyframes shake { 20%, 60% { transform: translateX(-4px); } 40%, 80% { transform: translateX(4px); } }
@keyframes float { 50% { transform: translateY(-6px); } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes shimmer { from { background-position: -120% 0; } to { background-position: 220% 0; } }

/* 框架自带的体面默认：切页淡入、弹层浮起、菜单弹出 */
[data-t="view"].active { animation: fade-in var(--dur-slow) var(--ease); }
[data-t="overlay"].open { animation: fade-in var(--dur) var(--ease); }
[data-t="overlay"].open [data-t="modal"] { animation: slide-up var(--dur-slow) var(--ease); }
[data-t="drawer"].open { animation: slide-left var(--dur-slow) var(--ease-out); }
[data-t="toast"].open { animation: slide-up var(--dur-slow) var(--ease-out); }
`;
