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
    const p = Object.assign({ ref: 1, edge: 1, rad: 0.6, tint: 0.08, blur: 2, strength: 1 }, params);
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

    function update() {
      const W = Math.max(2, el.offsetWidth), H = Math.max(2, el.offsetHeight);
      canvas.width = W; canvas.height = H;
      filter.setAttribute("x", "0"); filter.setAttribute("y", "0");
      filter.setAttribute("width", String(W)); filter.setAttribute("height", String(H));
      feImage.setAttribute("width", String(W)); feImage.setAttribute("height", String(H));

      /* 库原版 fragment：SDF → smoothStep 边缘折射带 → uv 位移。
         唯一增强：折射带宽度按元素尺寸等比，但最大位移像素封顶，
         避免大卡片把背景拉成特写。 */
      const data = new Uint8ClampedArray(W * H * 4);
      let maxScale = 0;
      const raw = [];
      const band = 0.15 / p.edge / p.strength;             /* 库: d - 0.15 */
      const ampMax = Math.min(0.25 * Math.min(W, H), 44 * p.ref * p.strength);
      for (let i = 0; i < data.length; i += 4) {
        const x = (i / 4) % W, y = Math.floor(i / 4 / W);
        const ix = x / W - 0.5, iy = y / H - 0.5;
        const d = roundedRectSDF(ix, iy, 0.3, 0.2, p.rad);
        const disp = smoothStep(0.8, 0, d - band);
        const s = smoothStep(0, 1, disp);
        /* 库: texture(ix*s + 0.5, iy*s + 0.5) → dx = (ix*s+0.5)*W - x */
        let dx = (ix * s + 0.5) * W - x;
        let dy = (iy * s + 0.5) * H - y;
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
      ctx.putImageData(new ImageData(data, W, H), 0, 0);
      feImage.setAttributeNS(XLINK, "href", canvas.toDataURL());
      feDisp.setAttribute("scale", String(maxScale));

      /* 库原版链条：url() 位移在前，后面跟库的调色参数（blur 稍提保证 UI 可读） */
      const chain = `url(#${fid}_filter) blur(${p.blur}px) contrast(1.2) brightness(1.05) saturate(1.1)`;
      el.style.backdropFilter = chain;
      el.style.webkitBackdropFilter = chain;
      if (p.tint >= 0) el.style.background = `rgba(255,255,255,${p.tint})`;
    }

    if (getComputedStyle(el).position === "static") el.style.position = "relative";

    update();
    const ro = new ResizeObserver(update);
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
