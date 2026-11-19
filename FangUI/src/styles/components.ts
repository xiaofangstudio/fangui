/* 组件层：所有"能点的东西"和"能看的块"。
 *
 * 三条硬规矩：
 *   1. 颜色、圆角、间距、字号、时长一律走令牌变量，这里不出现字面色值；
 *   2. 每个控件都有四种态：hover / active(pressed) / focus-visible / disabled；
 *   3. 变体用类名：accent / standard / subtle / outline / danger / link，
 *      尺寸用类名：s / m / l（控件高度 24 / 32 / 40）。
 *
 * 作者在 .cui 里写的属性编译后永远排在本文件之后，所以覆盖永远有效。 */

export const COMPONENT_CSS = `
/* ══════════════════ 按钮 ══════════════════ */
[data-t="button"] {
  position: relative;
  display: inline-flex; align-items: center; justify-content: center;
  gap: var(--space-1);
  height: var(--control-m); padding: 0 var(--space-3);
  border: 1px solid var(--line); border-radius: var(--radius-s);
  background: var(--control); color: var(--ink);
  font-size: var(--font-sm); font-weight: 500; line-height: 1;
  white-space: nowrap; user-select: none;
  transition: background var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease),
              color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease),
              transform var(--dur-fast) var(--ease);
}
[data-t="button"]:not(:disabled):hover { background: var(--control-hover); border-color: var(--edge); }
[data-t="button"]:not(:disabled):active { background: var(--control-pressed); transform: translateY(1px); }
[data-t="button"]:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
[data-t="button"]:disabled, [data-t="button"].disabled {
  opacity: .45; cursor: not-allowed; pointer-events: none;
}
[data-t="button"].loading { pointer-events: none; color: transparent; }

/* 尺寸 */
[data-t="button"].s, [data-t="button"].small { height: var(--control-s); padding: 0 var(--space-2); font-size: var(--font-xs); }
[data-t="button"].l, [data-t="button"].large { height: var(--control-l); padding: 0 var(--space-4); font-size: var(--font-md); }
[data-t="button"].pill { border-radius: var(--radius-full); }

/* 图标按钮：宽高相等，只要图标 */
[data-t="button"].icon { width: var(--control-m); padding: 0; }
[data-t="button"].icon.s { width: var(--control-s); }
[data-t="button"].icon.l { width: var(--control-l); }

/* 变体 · 强调：一屏只放一个 */
[data-t="button"].accent {
  background: var(--accent); border-color: var(--accent); color: var(--on-accent);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--accent) 24%, transparent);
}
[data-t="button"].accent:not(:disabled):hover { background: var(--accent-hover); border-color: var(--accent-hover); }
[data-t="button"].accent:not(:disabled):active { background: var(--accent-pressed); border-color: var(--accent-pressed); }

/* 变体 · 次要：透明底，hover 才出底 */
[data-t="button"].subtle, [data-t="button"].ghost {
  background: transparent; border-color: transparent; color: var(--soft);
}
[data-t="button"].subtle:not(:disabled):hover, [data-t="button"].ghost:not(:disabled):hover {
  background: var(--wash); border-color: transparent; color: var(--ink);
}
[data-t="button"].subtle:not(:disabled):active, [data-t="button"].ghost:not(:disabled):active {
  background: var(--sunken); color: var(--ink);
}

/* 变体 · 轮廓：透明底 + 强描边 */
[data-t="button"].outline { background: transparent; border-color: var(--edge); color: var(--ink); }
[data-t="button"].outline:not(:disabled):hover { background: var(--wash); border-color: var(--soft); }

/* 变体 · 危险：实心红，只给删除 / 覆盖这类操作 */
[data-t="button"].danger {
  background: var(--danger-fill); border-color: transparent; color: var(--on-danger);
}
[data-t="button"].danger:not(:disabled):hover { filter: brightness(1.08); }
[data-t="button"].danger:not(:disabled):active { filter: brightness(.92); }

/* 变体 · 链接：长得像文字，行为像按钮 */
[data-t="button"].link {
  height: auto; padding: 0; border: 0; background: transparent;
  color: var(--accent); font-weight: 500;
}
[data-t="button"].link:not(:disabled):hover { background: transparent; text-decoration: underline; color: var(--accent-hover); }
[data-t="button"].link:not(:disabled):active { transform: none; color: var(--accent-pressed); }

/* ══════════════════ 文本输入 ══════════════════ */
[data-t="input"] {
  display: block; width: 100%;
  height: var(--control-m); padding: 0 var(--space-3);
  border: 1px solid var(--edge); border-radius: var(--radius-s);
  background: var(--field); color: var(--ink);
  font-size: var(--font-sm); line-height: normal;
  transition: border-color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease),
              box-shadow var(--dur-fast) var(--ease);
}
[data-t="input"]:hover { background: var(--field-hover); border-color: var(--soft); }
[data-t="input"]:focus {
  border-color: var(--accent);
  box-shadow: inset 0 -2px 0 0 var(--accent);
  outline: none;
}
[data-t="input"]:focus-visible { outline: none; }
[data-t="input"]::placeholder { color: var(--ghost); }
[data-t="input"]:disabled { background: var(--control-disabled); color: var(--ghost); border-color: var(--line); }
[data-t="input"].s { height: var(--control-s); font-size: var(--font-xs); padding: 0 var(--space-2); }
[data-t="input"].l { height: var(--control-l); font-size: var(--font-md); padding: 0 var(--space-4); }
[data-t="input"].err { border-color: var(--sem-err); }
[data-t="input"].err:focus { box-shadow: inset 0 -2px 0 0 var(--sem-err); }
[data-t="input"].bare {
  border-color: transparent; background: transparent; padding-left: 0; padding-right: 0;
}
[data-t="input"].bare:focus { box-shadow: none; border-bottom: 1px solid var(--accent); border-radius: 0; }
[data-t="input"].search { padding-left: var(--space-4); background-image: none; }

[data-t="textarea"] {
  display: block; width: 100%;
  min-height: 76px; padding: var(--space-2) var(--space-3);
  border: 1px solid var(--edge); border-radius: var(--radius-s);
  background: var(--field); color: var(--ink);
  font-size: var(--font-sm); line-height: 1.7; resize: vertical;
  transition: border-color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
}
[data-t="textarea"]:hover { background: var(--field-hover); border-color: var(--soft); }
[data-t="textarea"]:focus { border-color: var(--accent); box-shadow: inset 0 -2px 0 0 var(--accent); outline: none; }
[data-t="textarea"]::placeholder { color: var(--ghost); }
[data-t="textarea"]:disabled { background: var(--control-disabled); color: var(--ghost); }

/* ══════════════════ 勾选 / 单选 / 开关 ══════════════════ */
[data-t="checkbox"], [data-t="radio"] {
  appearance: none; -webkit-appearance: none; flex: none;
  display: inline-grid; place-content: center;
  width: 16px; height: 16px; margin: 0;
  border: 1px solid var(--edge); border-radius: var(--radius-xs);
  background: var(--field); cursor: pointer;
  transition: background var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);
}
[data-t="checkbox"]:hover, [data-t="radio"]:hover { border-color: var(--accent); }
[data-t="checkbox"]:checked, [data-t="radio"]:checked { background: var(--accent); border-color: var(--accent); }
[data-t="checkbox"]::before {
  content: ""; width: 9px; height: 5px; margin-top: -2px;
  border-left: 2px solid var(--on-accent); border-bottom: 2px solid var(--on-accent);
  transform: rotate(-45deg) scale(0); transform-origin: center;
  transition: transform var(--dur-fast) var(--ease-out);
}
[data-t="checkbox"]:checked::before { transform: rotate(-45deg) scale(1); }
[data-t="radio"] { border-radius: 50%; }
[data-t="radio"]::before {
  content: ""; width: 6px; height: 6px; border-radius: 50%;
  background: var(--on-accent); transform: scale(0);
  transition: transform var(--dur-fast) var(--ease-out);
}
[data-t="radio"]:checked::before { transform: scale(1); }
[data-t="checkbox"]:focus-visible, [data-t="radio"]:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
[data-t="checkbox"]:disabled, [data-t="radio"]:disabled { opacity: .45; cursor: not-allowed; }
[data-t="checkbox"].l, [data-t="radio"].l { width: 20px; height: 20px; }

[data-t="switch"] {
  appearance: none; -webkit-appearance: none; flex: none;
  width: 34px; height: 19px; margin: 0;
  border: 1px solid transparent; border-radius: var(--radius-full);
  background: var(--edge); position: relative; cursor: pointer;
  transition: background var(--dur) var(--ease);
}
[data-t="switch"]::before {
  content: ""; position: absolute; top: 2px; left: 2px;
  width: 15px; height: 15px; border-radius: 50%;
  background: var(--card); box-shadow: 0 1px 2px color-mix(in srgb, var(--ink) 22%, transparent);
  transition: transform var(--dur) var(--ease-out);
}
[data-t="switch"]:hover { background: var(--faint); }
[data-t="switch"]:checked { background: var(--accent); }
[data-t="switch"]:checked:hover { background: var(--accent-hover); }
[data-t="switch"]:checked::before { transform: translateX(15px); }
[data-t="switch"]:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
[data-t="switch"]:disabled { opacity: .45; cursor: not-allowed; }
[data-t="switch"].s { width: 28px; height: 16px; }
[data-t="switch"].s::before { width: 12px; height: 12px; }
[data-t="switch"].s:checked::before { transform: translateX(12px); }
[data-t="switch"].l { width: 44px; height: 24px; }
[data-t="switch"].l::before { width: 20px; height: 20px; }
[data-t="switch"].l:checked::before { transform: translateX(20px); }

/* ══════════════════ 滑杆与进度 ══════════════════ */
[data-t="slider"] {
  appearance: none; -webkit-appearance: none;
  display: block; width: 100%; height: var(--control-s);
  margin: 0; background: transparent; cursor: pointer;
}
[data-t="slider"]::-webkit-slider-runnable-track {
  height: 4px; border-radius: var(--radius-full); background: var(--track);
}
[data-t="slider"]::-webkit-slider-thumb {
  appearance: none; -webkit-appearance: none;
  width: 16px; height: 16px; margin-top: -6px;
  border-radius: 50%; background: var(--card);
  border: 2px solid var(--accent);
  box-shadow: var(--shadow-1);
  transition: transform var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease);
}
[data-t="slider"]:hover::-webkit-slider-thumb { transform: scale(1.12); border-color: var(--accent-hover); }
[data-t="slider"]:focus-visible { outline: 2px solid var(--focus); outline-offset: 4px; border-radius: var(--radius-s); }
[data-t="slider"]::-moz-range-track { height: 4px; border-radius: 999px; background: var(--track); }
[data-t="slider"]::-moz-range-thumb {
  width: 14px; height: 14px; border-radius: 50%; background: var(--card); border: 2px solid var(--accent);
}
[data-t="slider"]:disabled { opacity: .45; cursor: not-allowed; }

[data-t="progress"] {
  appearance: none; -webkit-appearance: none;
  display: block; width: 100%; height: 6px;
  border: 0; border-radius: var(--radius-full);
  background: var(--track); overflow: hidden;
}
[data-t="progress"]::-webkit-progress-bar { background: var(--track); border-radius: var(--radius-full); }
[data-t="progress"]::-webkit-progress-value {
  background: var(--accent); border-radius: var(--radius-full);
  transition: width var(--dur) var(--ease);
}
[data-t="progress"]::-moz-progress-bar { background: var(--accent); border-radius: var(--radius-full); }
[data-t="progress"].l { height: 10px; }
[data-t="progress"].ok::-webkit-progress-value { background: var(--sem-ok); }
[data-t="progress"].err::-webkit-progress-value { background: var(--sem-err); }

/* ══════════════════ 下拉 ══════════════════ */
[data-t="dropdown"] {
  appearance: none; -webkit-appearance: none;
  display: block; width: 100%;
  height: var(--control-m); padding: 0 var(--space-5) 0 var(--space-3);
  border: 1px solid var(--edge); border-radius: var(--radius-s);
  background-color: var(--field); color: var(--ink);
  font-size: var(--font-sm); cursor: pointer;
  background-image:
    linear-gradient(45deg, transparent 50%, var(--soft) 50%),
    linear-gradient(135deg, var(--soft) 50%, transparent 50%);
  background-position:
    calc(100% - 16px) calc(50% - 1px),
    calc(100% - 11px) calc(50% - 1px);
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
  transition: border-color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease);
}
[data-t="dropdown"]:hover { border-color: var(--soft); background-color: var(--field-hover); }
[data-t="dropdown"]:focus-visible { outline: 2px solid var(--focus); outline-offset: 1px; }
[data-t="dropdown"]:disabled { background-color: var(--control-disabled); color: var(--ghost); cursor: not-allowed; }
[data-t="dropdown"].s { height: var(--control-s); font-size: var(--font-xs); }
[data-t="dropdown"].l { height: var(--control-l); font-size: var(--font-md); }
[data-t="option"] { background: var(--card); color: var(--ink); }

/* ══════════════════ 标签栏 ══════════════════ */
[data-t="tabs"] {
  display: flex; align-items: stretch; gap: 2px;
  border-bottom: 1px solid var(--line);
}
[data-t="tabs"].pill {
  display: inline-flex; border: 0; gap: 2px; padding: 2px;
  background: var(--wash); border-radius: var(--radius-m);
}
[data-t="tab"] {
  position: relative;
  display: inline-flex; align-items: center; gap: var(--space-1);
  min-height: 36px; padding: 0 var(--space-3);
  border: 0; border-bottom: 2px solid transparent; border-radius: 0;
  background: transparent; color: var(--soft);
  font-size: var(--font-sm); font-weight: 500; cursor: pointer;
  transition: color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease),
              border-color var(--dur-fast) var(--ease);
}
[data-t="tab"]:not(:disabled):hover { color: var(--ink); background: var(--wash); }
[data-t="tab"].active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }
[data-t="tab"].disabled, [data-t="tab"]:disabled { color: var(--ghost); cursor: not-allowed; }
[data-t="tab"]:focus-visible { outline: 2px solid var(--focus); outline-offset: -2px; }
[data-t="tabs"].pill [data-t="tab"] {
  border: 0; border-radius: var(--radius-s); min-height: 28px; padding: 0 var(--space-3); color: var(--soft);
}
[data-t="tabs"].pill [data-t="tab"].active {
  background: var(--card); color: var(--ink); box-shadow: var(--shadow-1);
}

/* ══════════════════ 菜单 / 弹出面板 ══════════════════ */
[data-t="menu"] {
  display: none; position: absolute; z-index: var(--z-dropdown);
  min-width: 168px; padding: 4px; margin: 0;
  background: var(--card); border: 1px solid var(--line);
  border-radius: var(--radius-m); box-shadow: var(--shadow-2);
  overflow: hidden;
}
[data-t="menu"].open, [data-t="menu"][open] { display: block; animation: pop var(--dur) var(--ease-out); }
[data-t="menu"].static { position: static; box-shadow: var(--shadow-1); }
[data-t="menuitem"] {
  display: flex; align-items: center; gap: var(--space-2);
  width: 100%; padding: 6px var(--space-2);
  border: 0; border-radius: var(--radius-s);
  background: transparent; color: var(--ink);
  font-size: var(--font-sm); text-align: left; cursor: pointer;
  transition: background var(--dur-fast) var(--ease);
}
[data-t="menuitem"]:not(:disabled):hover { background: var(--wash); }
[data-t="menuitem"]:not(:disabled):active { background: var(--sunken); }
[data-t="menuitem"].danger { color: var(--sem-err); }
[data-t="menuitem"]:disabled { color: var(--ghost); cursor: not-allowed; }
[data-t="menuitem"]:focus-visible { outline: 2px solid var(--focus); outline-offset: -2px; }
[data-t="menu"] [data-t="divider"] { margin: 4px 0; }

[data-t="popover"] {
  display: none; position: absolute; z-index: var(--z-dropdown);
  min-width: 200px; max-width: min(80vw, 420px); padding: var(--space-3);
  background: var(--card); border: 1px solid var(--line);
  border-radius: var(--radius-m); box-shadow: var(--shadow-2);
}
[data-t="popover"].open { display: block; animation: pop var(--dur) var(--ease-out); }

/* ══════════════════ 遮罩 / 对话框 / 抽屉 ══════════════════ */
[data-t="overlay"] {
  display: none; position: fixed; inset: 0; z-index: var(--z-overlay);
  align-items: center; justify-content: center; padding: var(--space-5);
  background: var(--scrim);
}
[data-t="overlay"].open { display: flex; }
[data-t="overlay"].top { align-items: flex-start; padding-top: 12vh; }
[data-t="modal"] {
  position: relative; z-index: var(--z-modal);
  display: block; width: 420px; max-width: 100%; max-height: 86vh; overflow: auto;
  padding: var(--space-5);
  background: var(--card); border-radius: var(--radius-l); box-shadow: var(--shadow-3);
}
[data-t="modal"].s { width: 320px; }
[data-t="modal"].l { width: 640px; }
[data-t="modal"].plain { padding: 0; }
[data-t="drawer"] {
  display: block; position: fixed; top: 0; right: 0; bottom: 0;
  width: 340px; max-width: 92vw; z-index: var(--z-modal);
  padding: var(--space-5); overflow: auto;
  background: var(--card); border-left: 1px solid var(--line);
  box-shadow: var(--shadow-3);
  transform: translateX(100%); pointer-events: none;
  transition: transform var(--dur-slow) var(--ease-out);
}
[data-t="drawer"].open { transform: none; pointer-events: auto; }
[data-t="drawer"].left {
  left: 0; right: auto; border-left: 0; border-right: 1px solid var(--line);
  transform: translateX(-100%);
}
[data-t="drawer"].left.open { transform: none; }

/* ══════════════════ 轻提示 ══════════════════ */
[data-t="toast"] {
  display: none; position: fixed; left: 50%; bottom: var(--space-5);
  transform: translateX(-50%); z-index: var(--z-toast);
  align-items: center; gap: var(--space-2);
  max-width: min(90vw, 480px); padding: 10px var(--space-4);
  background: var(--ink); color: var(--card);
  border-radius: var(--radius-m); box-shadow: var(--shadow-2);
  font-size: var(--font-sm);
}
[data-t="toast"].open { display: flex; }
[data-t="toast"].ok { background: var(--sem-ok); color: var(--card); }
[data-t="toast"].err { background: var(--sem-err); color: var(--card); }

/* ══════════════════ 徽标 / 标签 / 头像 ══════════════════ */
[data-t="badge"] {
  display: inline-flex; align-items: center; justify-content: center; flex: none;
  min-width: 20px; height: 20px; padding: 0 6px;
  border: 1px solid var(--tone); border-radius: var(--radius-full);
  background: var(--tint); color: var(--accent);
  font-size: 11px; font-weight: 600; line-height: 1; white-space: nowrap;
}
[data-t="badge"].plain { background: var(--wash); color: var(--soft); border-color: transparent; }
[data-t="badge"].ok { background: color-mix(in srgb, var(--sem-ok) 12%, var(--card)); color: var(--sem-ok); border-color: color-mix(in srgb, var(--sem-ok) 32%, transparent); }
[data-t="badge"].warn { background: color-mix(in srgb, var(--sem-warn) 14%, var(--card)); color: var(--sem-warn); border-color: color-mix(in srgb, var(--sem-warn) 34%, transparent); }
[data-t="badge"].err { background: color-mix(in srgb, var(--sem-err) 12%, var(--card)); color: var(--sem-err); border-color: color-mix(in srgb, var(--sem-err) 32%, transparent); }
[data-t="badge"].info { background: color-mix(in srgb, var(--sem-info) 12%, var(--card)); color: var(--sem-info); border-color: color-mix(in srgb, var(--sem-info) 32%, transparent); }
[data-t="badge"].l { height: 24px; font-size: var(--font-xs); padding: 0 8px; }

[data-t="tag"] {
  display: inline-flex; align-items: center; gap: 4px;
  height: 22px; padding: 0 var(--space-2);
  border: 1px solid var(--line); border-radius: var(--radius-s);
  background: var(--wash); color: var(--soft);
  font-size: var(--font-xs); line-height: 1; white-space: nowrap;
}
[data-t="tag"].accent { background: var(--tint); color: var(--accent); border-color: var(--tone); }
[data-t="tag"].pill { border-radius: var(--radius-full); }

[data-t="avatar"] {
  display: inline-flex; align-items: center; justify-content: center; flex: none;
  width: 32px; height: 32px; overflow: hidden;
  border-radius: 50%; background: var(--sunken); color: var(--soft);
  font-size: var(--font-xs); font-weight: 600; user-select: none;
}
[data-t="avatar"] img, [data-t="avatar"] [data-t="image"] { width: 100%; height: 100%; object-fit: cover; }
[data-t="avatar"].s { width: 24px; height: 24px; font-size: 10px; }
[data-t="avatar"].l { width: 44px; height: 44px; font-size: var(--font-sm); }
[data-t="avatar"].round { border-radius: var(--radius-m); }
[data-t="avatar"].ring { box-shadow: 0 0 0 2px var(--card), 0 0 0 3px var(--tone); }

[data-t="icon"] {
  display: inline-flex; align-items: center; justify-content: center;
  width: 1em; height: 1em; flex: none; color: currentColor;
}
[data-t="icon"] svg { width: 100%; height: 100%; display: block; }

/* ══════════════════ 图标：内置字形 / 两态资产 ══════════════════ */
/* icon 有两种画法：data-icon 走单色字形；带 data-motion 的走资产，
   两张状态图同位置叠放，静止态在上、动作终态在下，改的是上层的 opacity。
   motion 就是开关：hover 悬停才动、always 一直呼吸、still 不动。 */
[data-t="icon"][data-motion] {
  position: relative; display: inline-block; flex: none;
  width: var(--icon-size, var(--icon-m, 20px));
  height: var(--icon-size, var(--icon-m, 20px));
  vertical-align: -0.18em;
}
[data-t="icon"][data-motion]::before, [data-t="icon"][data-motion]::after {
  content: ""; position: absolute; inset: 0;
  background-position: center; background-repeat: no-repeat; background-size: contain;
}
[data-t="icon"][data-motion]::before { background-image: var(--icon-rest); }
[data-t="icon"][data-motion]::after {
  background-image: var(--icon-hover);
  opacity: 0;
  transition: opacity var(--icon-dur, 460ms) var(--ease-soft);
}
[data-t="icon"][data-motion="hover"]:hover::after,
[data-t="icon"][data-motion="hover"]:focus-visible::after,
[data-t="icon"].m-hover:hover::after,
[data-t="icon"].m-hover:focus-visible::after { opacity: 1; }
[data-t="icon"][data-motion="always"]::after,
[data-t="icon"].m-always::after {
  animation: icon-cycle var(--icon-cycle, 2600ms) var(--ease-soft) infinite;
}
[data-t="icon"][data-motion="still"]::after,
[data-t="icon"].m-still::after { display: none; }

@keyframes icon-cycle {
  0%, 22% { opacity: 0; }
  58%, 84% { opacity: 1; }
  100% { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  [data-t="icon"][data-motion="always"]::after { animation: none; opacity: 0; }
}

/* ══════════════════ 媒体与嵌入 ══════════════════ */
[data-t="video"] {  display: block; max-width: 100%; border-radius: var(--radius-m);
  background: var(--sunken);
}
[data-t="audio"] { display: block; width: 100%; }
/* 多页：只显示 .active 那一页。首屏由编译器给第一页打上 active，运行时 goView 再切。
   这里必须 !important：每个 view 都可能自带 layout 类（display:flex），
   而"哪一页可见"是结构事实，不该被布局属性的优先级左右。 */
[data-view]:not(.active) { display: none !important; }
[data-t="frame"] {
  display: block; width: 100%; min-height: 160px;
  border: 1px solid var(--line); border-radius: var(--radius-m);
  background: var(--card);
}

[data-t="spinner"] {
  display: inline-block; width: var(--icon-s); height: var(--icon-s); flex: none;
  border: 2px solid var(--line); border-top-color: var(--accent); border-radius: 50%;
  animation: spin .7s linear infinite;
}
[data-t="spinner"].s { width: 12px; height: 12px; border-width: 1.5px; }
[data-t="spinner"].l { width: 28px; height: 28px; border-width: 3px; }

/* ══════════════════ 提示气泡 ══════════════════ */
[data-t="tip"] {
  display: none; position: absolute; left: 50%; top: calc(50% - 30px);
  transform: translate(-50%, -100%); z-index: var(--z-tooltip);
  padding: 5px 9px; border-radius: var(--radius-s);
  background: var(--ink); color: var(--card);
  font-size: var(--font-xs); line-height: 1.5; white-space: nowrap;
  pointer-events: none; box-shadow: var(--shadow-1);
}
[data-t="tip"].below { top: calc(50% + 22px); transform: translate(-50%, 0); }
*:hover > [data-t="tip"], *:focus-within > [data-t="tip"] { display: block; animation: fade-in var(--dur-fast) var(--ease); }

/* ══════════════════ 卡片式数据展示 ══════════════════ */
[data-t="table"] {
  display: table; width: 100%; table-layout: fixed; border-collapse: collapse;
  font-size: var(--font-sm);
}
/* 想让列宽跟着内容走，加 auto */
[data-t="table"].auto { table-layout: auto; }
/* row 平时是 flex 行容器，进了表格必须是真正的表格行，否则列不展开 */
[data-t="table"] tr { display: table-row; }
[data-t="table"] td, [data-t="table"] th { display: table-cell; }
[data-t="table"] th, [data-t="table"] td {
  padding: var(--space-2) var(--space-3);
  text-align: left; vertical-align: middle;
  border-bottom: 1px solid var(--line);
}
[data-t="table"] th {
  font-size: var(--font-xs); font-weight: 600; color: var(--soft);
  background: var(--wash); white-space: nowrap;
}
[data-t="table"] tbody tr:hover { background: var(--wash); }
[data-t="table"].zebra tr:nth-child(even) td { background: color-mix(in srgb, var(--wash) 55%, transparent); }
[data-t="table"].compact th, [data-t="table"].compact td { padding: var(--space-1) var(--space-2); }
[data-t="table"].bordered { border: 1px solid var(--line); }
[data-t="table"].bordered th, [data-t="table"].bordered td { border: 1px solid var(--hairline); }

/* ══════════════════ 提示横幅 / 空状态 / 骨架 ══════════════════ */
[data-t="alert"] {
  display: flex; align-items: flex-start; gap: var(--space-2); flex-wrap: wrap;
  padding: 10px var(--space-3);
  border: 1px solid color-mix(in srgb, var(--sem-info) 32%, transparent);
  border-radius: var(--radius-m);
  background: color-mix(in srgb, var(--sem-info) 8%, var(--card));
  color: var(--ink); font-size: var(--font-sm);
}
[data-t="alert"] > [data-t="icon"] { margin-top: 2px; color: var(--sem-info); }
[data-t="alert"].ok { border-color: color-mix(in srgb, var(--sem-ok) 32%, transparent); background: color-mix(in srgb, var(--sem-ok) 8%, var(--card)); }
[data-t="alert"].ok > [data-t="icon"] { color: var(--sem-ok); }
[data-t="alert"].warn { border-color: color-mix(in srgb, var(--sem-warn) 34%, transparent); background: color-mix(in srgb, var(--sem-warn) 10%, var(--card)); }
[data-t="alert"].warn > [data-t="icon"] { color: var(--sem-warn); }
[data-t="alert"].err { border-color: color-mix(in srgb, var(--sem-err) 32%, transparent); background: color-mix(in srgb, var(--sem-err) 8%, var(--card)); }
[data-t="alert"].err > [data-t="icon"] { color: var(--sem-err); }
[data-t="alert"].banner { border-radius: 0 0 var(--radius-m) var(--radius-m); }

[data-t="empty"] {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: var(--space-2); padding: var(--space-6) var(--space-4);
  border: 1px dashed var(--line); border-radius: var(--radius-l);
  color: var(--ghost); font-size: var(--font-sm); text-align: center;
}
[data-t="empty"] > [data-t="icon"] { width: 28px; height: 28px; opacity: .8; }
[data-t="empty"] > [data-t="heading"] { color: var(--soft); margin: 0; }

[data-t="skeleton"] {
  display: block; min-height: 12px; height: 12px; width: 100%;
  border-radius: var(--radius-s);
  background: linear-gradient(90deg, var(--skeleton) 0%, var(--skeleton-shine) 40%, var(--skeleton) 80%);
  background-size: 240% 100%;
  animation: shimmer 1.4s linear infinite;
}
[data-t="skeleton"].text { height: 10px; }
[data-t="skeleton"].title { height: 18px; width: 40%; }
[data-t="skeleton"].block { height: 96px; border-radius: var(--radius-m); }
[data-t="skeleton"].circle { width: 32px; height: 32px; border-radius: 50%; }

/* ══════════════════ 链接 ══════════════════ */
[data-t="link"] { color: var(--accent); text-decoration: none; cursor: pointer; }
[data-t="link"]:hover { text-decoration: underline; color: var(--accent-hover); }
[data-t="link"].muted { color: var(--soft); }
[data-t="link"]:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; border-radius: var(--radius-xs); }
`;
