/*
 * fangUI · accent & liquid —— 主题色 API 与液态玻璃引擎接线
 *
 * FangUI.accent(h, s, l)      直接给 HSL 三值（0-360 / % / %）
 * FangUI.accent("#6fc0ff")    给任意颜色，自动转 HSL
 * FangUI.preset(name)         预设色板：ocean sakura forest sunset mono violet
 * FangUI.setMode(mode)        light / dark / natural 三模式切换
 * FangUI.liquid.enable()      加载液态玻璃引擎（桌面端全开，移动端仅 data-liquid 白名单）
 */
(function (global) {
  "use strict";

  function hexToHsl(hex) {
    const m = hex.replace("#", "");
    const r = parseInt(m.slice(0, 2), 16) / 255;
    const g = parseInt(m.slice(2, 4), 16) / 255;
    const b = parseInt(m.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
  }

  function accent(h, s, l) {
    const root = document.documentElement;
    if (typeof h === "string") [h, s, l] = hexToHsl(h);
    root.style.setProperty("--fu-h", String(h));
    root.style.setProperty("--fu-s", s + "%");
    root.style.setProperty("--fu-l", l + "%");
    try { localStorage.setItem("fangui.accent", JSON.stringify([h, s, l])); } catch (e) { /* 静默 */ }
  }

  const PRESETS = {
    ocean:   [205, 72, 55],
    sakura:  [340, 65, 62],
    forest:  [150, 45, 42],
    sunset:  [24, 78, 56],
    violet:  [265, 60, 60],
    mono:    [210, 8, 45],
  };

  function preset(name) {
    const p = PRESETS[name];
    if (p) accent(p[0], p[1], p[2]);
  }

  function setMode(mode) {
    if (["light", "dark", "natural"].includes(mode)) {
      document.documentElement.setAttribute("data-mode", mode);
      try { localStorage.setItem("fangui.themeMode", mode); } catch (e) { /* 静默 */ }
    }
  }

  /* ── 液态玻璃引擎接线 ──
     引擎是全屏自执行脚本：桌面端直接加载；
     移动端走白名单约定 —— 只有带 data-liquid 属性的元素保持液态玻璃，其余回退磨砂。 */
  let loaded = false;
  const liquid = {
    enable() {
      if (loaded) return;
      loaded = true;
      const s = document.createElement("script");
      s.src = new URL("../liquid/liquid-glass-core.js", import.meta.url).href;
      s.onerror = () => { loaded = false; }; // 加载失败静默回退 CSS 磨砂，界面不受影响
      document.head.appendChild(s);
    },
    disable() {
      if (global.liquidGlass && global.liquidGlass.destroy) global.liquidGlass.destroy();
      loaded = false;
    },
    isMobile() {
      return /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    },
  };

  /* 启动：恢复上次的主题色与模式 */
  function boot() {
    try {
      const saved = localStorage.getItem("fangui.accent");
      if (saved) accent(...JSON.parse(saved));
      const m = localStorage.getItem("fangui.themeMode");
      if (m) setMode(m);
      const ui = localStorage.getItem("fangui.mode");
      if (ui && global.FangUI.ai) global.FangUI.ai.setMode(ui);
    } catch (e) { /* 首次访问静默 */ }
  }
  if (document.readyState !== "loading") boot();
  else document.addEventListener("DOMContentLoaded", boot);

  global.FangUI = global.FangUI || {};
  global.FangUI.accent = accent;
  global.FangUI.preset = preset;
  global.FangUI.setMode = setMode;
  global.FangUI.liquid = liquid;
  global.FangUI.PRESETS = PRESETS;
})(window);
