/*
 * fangUI · refract —— 液态玻璃引擎
 * 忠实移植小方工作室液态玻璃库（Shu Ding liquid-glass 同款算法）：
 *   SDF 圆角矩形 → 位移图 → feImage(id!) + feDisplacementMap → backdrop-filter url() 链。
 *
 * ⚠️ 血泪教训：feImage 必须带 id 且与 feDisplacementMap 的 in2 对上，
 *    少了这个 id 整个滤镜静默失效——之前就是漏了它，玻璃完全无折射。
 *
 * makeGlass(el, params) → { update, set, setStrength, destroy }
 *   ref      折射率     0.2 – 2.5（边缘把背景弯进来的强度）
 *   edge     折射圈厚度 0.4 – 3
 *   rad      圆角       0 – 1
   *   tint     白度       0 – 0.5（-1 = 不写背景，交给 CSS）
   *   blur     背景模糊   px
   *   sat      饱和度     默认 1.0（>1 会放大背景图饱和度，慎用）
   *   bright   亮度       默认 1.06（略提亮，抵消内圈暗晕）
   */
(function (global) {
  "use strict";
  const SVGNS = "http://www.w3.org/2000/svg";
  const XLINK = "http://www.w3.org/1999/xlink";
  let uid = 0;

  const smoothStep = (a, b, t) => {
    t = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const roundedRectSDF = (x, y, w, h, r) => {
    const qx = Math.abs(x) - w + r, qy = Math.abs(y) - h + r;
    return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
  };

  function makeGlass(el, params) {
    const p = Object.assign({ ref: 1, edge: 1, rad: 0.6, tint: 0.08, blur: 2, strength: 1, sat: 1.0, bright: 1.06 }, params);
    const fid = "fg-" + ++uid;

    /* SVG 滤镜：与库完全同构 */
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
    svg.style.cssText = "position:fixed;top:0;left:0;pointer-events:none;";
    const filter = document.createElementNS(SVGNS, "filter");
    filter.setAttribute("id", fid + "_filter");
    filter.setAttribute("filterUnits", "userSpaceOnUse");
    filter.setAttribute("colorInterpolationFilters", "sRGB");
    const feImage = document.createElementNS(SVGNS, "feImage");
    feImage.setAttribute("id", fid + "_map");              /* ← 库的关键：必须有 id，in2 靠它引用 */
    const feDisp = document.createElementNS(SVGNS, "feDisplacementMap");
    feDisp.setAttribute("in", "SourceGraphic");
    feDisp.setAttribute("in2", fid + "_map");
    feDisp.setAttribute("xChannelSelector", "R");
    feDisp.setAttribute("yChannelSelector", "G");
    filter.append(feImage, feDisp);
    svg.appendChild(filter);
    document.body.appendChild(svg);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    let raf = 0;

    /* 位移图降采样：SDF 位移场是低频信号，全分辨率纯属浪费主线程。
       ⚠️ 血泪教训：全分辨率时 header(1300×64) + 十几张卡片各自逐像素循环 + toDataURL，
       会长时间阻塞主线程 → 页面卡死、按钮点不动。
       降采样到长边 ≤ DISP_MAX 后由 feImage 拉伸回元素尺寸；位移值仍是元素像素尺度
       （见下方 dx/dy 推导：u*W 即采样点在元素坐标系的位置），折射形状完全一致，肉眼无差别。 */
    const DISP_MAX = 200;
    function update() {
      const W = Math.max(2, el.offsetWidth), H = Math.max(2, el.offsetHeight);
      const sc = Math.min(1, DISP_MAX / Math.max(W, H));
      const CW = Math.max(2, Math.round(W * sc)), CH = Math.max(2, Math.round(H * sc));
      canvas.width = CW; canvas.height = CH;
      filter.setAttribute("x", "0"); filter.setAttribute("y", "0");
      filter.setAttribute("width", String(W)); filter.setAttribute("height", String(H));
      feImage.setAttribute("width", String(W)); feImage.setAttribute("height", String(H));

      const data = new Uint8ClampedArray(CW * CH * 4);
      let maxScale = 0;
      const raw = [];
      const band = 0.15 / p.edge / p.strength;             /* 库: d - 0.15 */
      /* UI 玻璃要克制：边缘轻弯即可。位移封顶调小——大位移会把背景彩边拉开显紫 */
      const ampMax = Math.min(0.12 * Math.min(W, H), 26 * p.ref * p.strength);
      for (let i = 0; i < data.length; i += 4) {
        const x = (i / 4) % CW, y = Math.floor(i / 4 / CW);
        const u = (x + 0.5) / CW, v = (y + 0.5) / CH;      /* 归一化采样点（像素中心）*/
        const ix = u - 0.5, iy = v - 0.5;
        const d = roundedRectSDF(ix, iy, 0.3, 0.2, p.rad);
        const disp = smoothStep(0.8, 0, d - band);
        const s = smoothStep(0, 1, disp);
        /* 位移保持「元素像素」尺度：u*W 是采样点在元素坐标系的位置 */
        let dx = (ix * s + 0.5) * W - u * W;
        let dy = (iy * s + 0.5) * H - v * H;
        const m = Math.max(Math.abs(dx), Math.abs(dy));
        if (m > ampMax) { dx *= ampMax / m; dy *= ampMax / m; }
        maxScale = Math.max(maxScale, Math.abs(dx), Math.abs(dy));
        raw.push(dx, dy);
      }
      maxScale *= 0.5;
      let idx = 0;
      for (let i = 0; i < data.length; i += 4) {
        data[i]     = (raw[idx++] / maxScale + 0.5) * 255;
        data[i + 1] = (raw[idx++] / maxScale + 0.5) * 255;
        data[i + 2] = 0; data[i + 3] = 255;
      }
      ctx.putImageData(new ImageData(data, CW, CH), 0, 0);
      feImage.setAttributeNS(XLINK, "href", canvas.toDataURL());
      feDisp.setAttribute("scale", String(maxScale));

      /* 中性调色链（默认 sat=1 不放大背景饱和度，bright 略>1 抵消玻璃内圈暗晕的压暗感）。
         ⚠️ 血泪教训：这里千万别加 saturate>1 / contrast>1——
         saturate 会把背景图的饱和度整片放大（用户一眼就看出「背景比原图艳」），
         contrast>1 会压暗暗部并二次放大饱和度观感，冷色背景还会被推成紫。
         玻璃的通透感靠 brightness 和 tint 做，不靠饱和度。 */
      const sat    = p.sat    == null ? 1.0  : p.sat;
      const bright = p.bright == null ? 1.06 : p.bright;
      const chain = `url(#${fid}_filter) blur(${p.blur}px) brightness(${bright}) saturate(${sat})`;
      el.style.backdropFilter = chain;
      el.style.webkitBackdropFilter = chain;
      if (p.tint >= 0) el.style.background = `rgba(255,255,255,${p.tint})`;
    }

    /* 用 rAF 合并重算，避免 ResizeObserver 在布局抖动时连发把主线程打死 */
    function schedule() {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; update(); });
    }

    if (getComputedStyle(el).position === "static") el.style.position = "relative";

    update();
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    return {
      update,
      setStrength(s) { p.strength = s; update(); },
      set(key, val) { if (key in p) { p[key] = val; update(); } },
      destroy() { ro.disconnect(); svg.remove(); el.style.backdropFilter = ""; el.style.webkitBackdropFilter = ""; },
    };
  }

  global.FangUI = global.FangUI || {};
  global.FangUI.refract = { makeGlass };
})(window);
