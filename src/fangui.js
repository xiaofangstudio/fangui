/*
 * fangUI · accent & liquid —— 主题色 API 与液态玻璃引擎接线
 *
 * FangUI.accent(h, s, l)      直接给 HSL 三值（0-360 / % / %）
 * FangUI.accent("#6fc0ff")    给任意颜色，自动转 HSL
 * FangUI.preset(name)         预设色板：ocean sakura forest sunset mono violet
 * FangUI.setMode(mode)        light / dark / natural 三模式切换
 * FangUI.liquid.enable()      标记液态玻璃状态（折射由 FangUI.refract 按元素驱动）
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

  /* ── 主题色槽位（最多 3 个）与副色（无限）──
     FangUI.slots.list()          → [[h,s,l], ...] 最多 3 个
     FangUI.slots.add("#6fc0ff")  → 加一个槽位（满了返回 false）
     FangUI.slots.use(i)          → 把第 i 个槽位设为当前主色
     FangUI.slots.remove(i)
     FangUI.subs.add("#ff8844")   → 副色无限加，写入 --fu-sub-N
     FangUI.subs.list() / .remove(i)
     副色是调色板库：任何组件可用 var(--fu-sub-N) 引用；要当主色用就 slots.add 它 */
  const slots = {
    list() { try { return JSON.parse(localStorage.getItem("fangui.slots") || "[]"); } catch (e) { return []; } },
    _save(v) { try { localStorage.setItem("fangui.slots", JSON.stringify(v)); } catch (e) { /* 静默 */ } },
    add(color) {
      const l = slots.list();
      if (l.length >= 3) return false;
      l.push(hexToHsl(color));
      slots._save(l);
      return true;
    },
    use(i) {
      const l = slots.list();
      if (!l[i]) return false;
      accent(l[i][0], l[i][1], l[i][2]);
      try { localStorage.setItem("fangui.slotActive", String(i)); } catch (e) { /* 静默 */ }
      return true;
    },
    active() {
      try { return parseInt(localStorage.getItem("fangui.slotActive") || "-1", 10); } catch (e) { return -1; }
    },
    remove(i) {
      const l = slots.list();
      if (!l[i]) return false;
      l.splice(i, 1);
      slots._save(l);
      return true;
    },
  };

  let subsCache = null;
  const subs = {
    list() {
      if (subsCache) return subsCache;
      try { subsCache = JSON.parse(localStorage.getItem("fangui.subs") || "[]"); }
      catch (e) { subsCache = []; }
      return subsCache;
    },
    _render() {
      const root = document.documentElement;
      subs.list().forEach((c, i) => {
        const [h, s, l] = c;
        root.style.setProperty(`--fu-sub-${i + 1}`, `hsl(${h} ${s}% ${l}%)`);
      });
    },
    add(color) {
      const c = typeof color === "string" ? hexToHsl(color) : color;
      subs.list().push(c);
      try { localStorage.setItem("fangui.subs", JSON.stringify(subsCache)); } catch (e) { /* 静默 */ }
      subs._render();
      return subsCache.length;
    },
    remove(i) {
      if (!subsCache || !subsCache[i]) return false;
      document.documentElement.style.removeProperty(`--fu-sub-${subsCache.length}`);
      subsCache.splice(i, 1);
      try { localStorage.setItem("fangui.subs", JSON.stringify(subsCache)); } catch (e) { /* 静默 */ }
      subs._render();
      return true;
    },
    _boot() { subs._render(); },
  };

  /* ── 液态玻璃状态 ──
     折射本身由 FangUI.refract.makeGlass(el) 按元素驱动，这里只负责标记状态，
     不再向页面注入全屏自执行的悬浮玻璃球（那会把整页盖住）。
     移动端走白名单约定 —— 只有带 data-liquid 属性的元素保持液态玻璃，其余回退磨砂。 */
  const liquid = {
    enable() {
      document.documentElement.setAttribute("data-liquid", "on");
    },
    disable() {
      if (global.liquidGlass && global.liquidGlass.destroy) global.liquidGlass.destroy();
      document.documentElement.removeAttribute("data-liquid");
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
      subs._boot();
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
  global.FangUI.slots = slots;
  global.FangUI.subs = subs;
})(window);
