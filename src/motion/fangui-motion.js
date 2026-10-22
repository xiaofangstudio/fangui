/*
 * fangUI · motion —— 通用动效件（三风格共享）
 *
 * FangUI.motion.blurIn(el)        进场：高清模糊 → 秒级聚焦（140ms，肉眼几乎看不出，少了就差感觉）
 * FangUI.motion.typewriter(el)    打字机逐字浮现
 * FangUI.motion.bounce(el)        弹跳入场
 * FangUI.motion.distribute(els)   UI 排布均匀（等分间距）
 * FangUI.motion.blur(el, px)      高质量模糊（backdrop 级，不动布局）
 * FangUI.motion.BEZIER            贝塞尔缓动预设表
 */
(function (global) {
  "use strict";

  const BEZIER = {
    out:     "cubic-bezier(0.22, 1, 0.36, 1)",
    inOut:   "cubic-bezier(0.65, 0, 0.35, 1)",
    spring:  "cubic-bezier(0.34, 1.56, 0.64, 1)",
    bouncy:  "cubic-bezier(0.68, -0.55, 0.27, 1.55)",
    smooth:  "cubic-bezier(0.4, 0, 0.2, 1)",
    snap:    "cubic-bezier(0.9, 0, 0.1, 1)",
  };

  /* 进场去模糊：blur(14px) + 透明 → 清晰，一个 tick 内完成大半变化 */
  function blurIn(el, opts) {
    const o = Object.assign({ from: 14, ms: 140 }, opts);
    if (!el) return;
    el.style.transition = "none";
    el.style.opacity = "0";
    el.style.filter = `blur(${o.from}px)`;
    requestAnimationFrame(() => {
      el.style.transition = `opacity ${o.ms}ms ${BEZIER.out}, filter ${o.ms}ms ${BEZIER.out}`;
      el.style.opacity = "1";
      el.style.filter = "blur(0px)";
      setTimeout(() => { el.style.filter = ""; el.style.transition = ""; }, o.ms + 60);
    });
  }

  /* 打字机：逐字符显现（保留 HTML 结构安全——纯文本方案） */
  function typewriter(el, opts) {
    const o = Object.assign({ ms: 34, caret: true }, opts);
    if (!el) return Promise.resolve();
    const text = el.textContent;
    el.textContent = "";
    const caret = document.createElement("span");
    caret.className = "fu-caret";
    caret.textContent = "▌";
    el.appendChild(caret);
    let i = 0;
    return new Promise((done) => {
      const timer = setInterval(() => {
        caret.before(document.createTextNode(text[i] ?? ""));
        i += 1;
        if (i >= text.length) {
          clearInterval(timer);
          if (o.caret) setTimeout(() => caret.remove(), 1200);
          else caret.remove();
          done();
        }
      }, o.ms);
    });
  }

  /* 弹跳入场：先缩 + 沉，再 spring 回弹 */
  function bounce(el) {
    if (!el) return;
    el.animate(
      [
        { transform: "scale(0.86) translateY(6px)", opacity: "0" },
        { transform: "scale(1.03) translateY(-2px)", opacity: "1", offset: 0.7 },
        { transform: "scale(1) translateY(0)", opacity: "1" },
      ],
      { duration: 340, easing: BEZIER.spring }
    );
  }

  /* UI 排布均匀：容器内子项等分主轴间距（gap 均分，而非子项等宽） */
  function distribute(container) {
    if (!container) return;
    const kids = Array.from(container.children).filter((c) => c.style.display !== "none");
    const n = kids.length;
    if (n < 2) return;
    const gap = Math.floor(
      (container.clientWidth - kids.reduce((s, c) => s + c.offsetWidth, 0)) / (n - 1)
    );
    container.style.display = "flex";
    container.style.justifyContent = "space-between";
    container.style.gap = Math.max(0, gap) + "px";
  }

  /* 高质量模糊：backdrop 级（模糊背后内容，不动自身布局） */
  function blur(el, px) {
    if (!el) return;
    el.style.backdropFilter = px > 0 ? `blur(${px}px) saturate(1.2)` : "";
    el.style.webkitBackdropFilter = el.style.backdropFilter;
  }

  global.FangUI = global.FangUI || {};
  global.FangUI.motion = { BEZIER, blurIn, typewriter, bounce, distribute, blur };
  global.FangUI.BEZIER = BEZIER;
})(window);
