/*
 * fangUI · refract —— 玻璃折射引擎（SVG 位移图方案）
 * 移植自 liquid-glass-web 展示页同款算法：SDF 圆角矩形 → 位移图 → feDisplacementMap。
 * 同一组参数喂给 Liquid 与 Neu·Glass：
 *   ref   折射率     0.2 – 2.5
 *   edge  折射圈厚度 0.4 – 3
 *   rad   圆角       0 – 1
 *   tint  白度       0 – 0.5
 *   blur  背景模糊   0 – 6px
 */
(function (global) {
  "use strict";
  const SVGNS = "http://www.w3.org/2000/svg";
  const XLINK = "http://www.w3.org/1999/xlink";
  let uid = 0;

  /* 棱边高光环样式：注入一次，全局共享 */
  if (!document.getElementById("fu-refract-style")) {
    const s = document.createElement("style");
    s.id = "fu-refract-style";
    s.textContent =
      ".fu-liquid-rim{box-shadow:" +
      "inset 0 1px 1px rgba(255,255,255,.9)," +                              /* 顶棱锐高光 */
      "inset 0 -1px 1px rgba(0,0,0,.06)," +                                  /* 底棱微暗：厚度 */
      "inset 0 0 var(--lg-rim,6px) rgba(255,255,255,var(--lg-glow,.2))," +   /* 边缘折射泛光 */
      "inset 0 0 calc(var(--lg-rim,6px)*.45) rgba(255,255,255,calc(var(--lg-glow,.2)*.7));}";
    document.head.appendChild(s);
  }

  const smoothStep = (a, b, t) => {
    t = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const roundedRectSDF = (x, y, w, h, r) => {
    const qx = Math.abs(x) - w + r, qy = Math.abs(y) - h + r;
    return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
  };

  /**
   * makeGlass(el, params) → { update, setStrength, destroy }
   * 让 el 的 backdrop 获得真实折射。params 可随时改，调 update() 生效。
   */
  function makeGlass(el, params) {
    const p = Object.assign({ ref: 1, edge: 1, rad: 0.6, tint: 0.08, blur: 0.25, strength: 1 }, params);
    const W0 = () => Math.max(2, el.offsetWidth);
    const H0 = () => Math.max(2, el.offsetHeight);
    const fid = "fg-" + ++uid;

    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
    svg.style.cssText = "position:fixed;top:0;left:0;pointer-events:none;";
    const filter = document.createElementNS(SVGNS, "filter");
    filter.setAttribute("id", fid + "_filter");
    filter.setAttribute("filterUnits", "userSpaceOnUse");
    filter.setAttribute("x", "0"); filter.setAttribute("y", "0");
    filter.setAttribute("colorInterpolationFilters", "sRGB");
    const feImage = document.createElementNS(SVGNS, "feImage");
    feImage.setAttribute("preserveAspectRatio", "none");
    const feDisp = document.createElementNS(SVGNS, "feDisplacementMap");
    feDisp.setAttribute("in", "SourceGraphic"); feDisp.setAttribute("in2", fid + "_map");
    feDisp.setAttribute("xChannelSelector", "R"); feDisp.setAttribute("yChannelSelector", "G");
    filter.append(feImage, feDisp);
    svg.appendChild(filter);
    document.body.appendChild(svg);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    function update() {
      const W = W0(), H = H0();
      canvas.width = W; canvas.height = H;
      filter.setAttribute("width", W); filter.setAttribute("height", H);
      feImage.setAttribute("width", W); feImage.setAttribute("height", H);
      const data = new Uint8ClampedArray(W * H * 4);
      const raw = [];
      const amp = 26 * p.ref * p.strength;   /* 最大位移：固定像素，不随元素变大而放大 */
      let maxScale = 0;
      for (let i = 0; i < data.length; i += 4) {
        const x = (i / 4) % W, y = Math.floor(i / 4 / W);
        const ix = x / W - 0.5, iy = y / H - 0.5;
        const d = roundedRectSDF(ix, iy, 0.3, 0.2, p.rad);
        const disp = smoothStep(0.8, 0, d - 0.15 / p.edge / p.strength);
        const s = smoothStep(0, 1, disp);
        const dx = ix * 2 * s * amp, dy = iy * 2 * s * amp;
        maxScale = Math.max(maxScale, Math.abs(dx), Math.abs(dy));
        raw.push(dx, dy);
      }
      maxScale *= 0.5;
      let idx = 0;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = (raw[idx++] / maxScale + 0.5) * 255;
        data[i + 1] = (raw[idx++] / maxScale + 0.5) * 255;
        data[i + 2] = 0; data[i + 3] = 255;
      }
      ctx.putImageData(new ImageData(data, W, H), 0, 0);
      feImage.setAttributeNS(XLINK, "href", canvas.toDataURL());
      feDisp.setAttribute("scale", String(maxScale));
      /* 关键教训：backdrop-filter 里只要带 url(#svg) 整条链在 Chromium 会静默失效，
         所以模糊/提亮/增饱和走纯 CSS（见下），SVG 位移只作为可选增强 */
      el.style.backdropFilter = `blur(${p.blur}px) brightness(1.12) saturate(1.8)`;
      el.style.webkitBackdropFilter = el.style.backdropFilter;
      /* 棱边折射高光环：模拟玻璃边缘把背景光弯进来 */
      rim.style.setProperty("--lg-rim", (7 * p.edge * p.strength).toFixed(1) + "px");
      rim.style.setProperty("--lg-glow", Math.min(0.45, 0.22 * p.ref).toFixed(2));
      if (p.tint >= 0) el.style.background = `rgba(255,255,255,${p.tint})`;
    }

    const rim = document.createElement("span");
    rim.className = "fu-liquid-rim";
    rim.style.cssText = "position:absolute;inset:0;pointer-events:none;border-radius:inherit;";

    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    el.appendChild(rim);

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return {
      update,
      setStrength(s) { p.strength = s; update(); },
      set(key, val) { if (key in p) { p[key] = val; update(); } },
      destroy() { ro.disconnect(); svg.remove(); rim.remove(); el.style.backdropFilter = ""; },
    };
  }

  global.FangUI = global.FangUI || {};
  global.FangUI.refract = { makeGlass };
})(window);
