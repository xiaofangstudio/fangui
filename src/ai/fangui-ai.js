/*
 * fangUI · ai —— AI 协作交互件（三风格共享）
 *
 * FangUI.ai.mode()                 当前风格（data-ui / data-neu）
 * FangUI.ai.setMode(ui, neu)       写风格；未选风格时 ai 层自动引导
 * FangUI.ai.promptStyle(host)      用户没选风格 → 弹「点选选项卡」主动提问（不猜）
 * FangUI.ai.compare(host, opts)    风格对比：同一组组件并排渲染两种风格，点选即定
 */
(function (global) {
  "use strict";

  const UIS = [
    { id: "flat",   name: "Flat 扁平",   desc: "FangBox 同款，安静耐看，层级靠 3%/5% 微差" },
    { id: "neu",    name: "Neu 轻拟物",  desc: "阴影营造凸起，柔和有厚度（非拟物塑料感）" },
    { id: "neu-g",  name: "Neu·Glass",   desc: "轻拟物的玻璃变体：全员半透明，磨砂凸起" },
    { id: "liquid", name: "Liquid 液态玻璃", desc: "WebGL 折射高光，最润也最吃性能" },
  ];

  function mode() {
    const ui = document.documentElement.getAttribute("data-ui") || "";
    if (ui === "neu") {
      const n = document.documentElement.getAttribute("data-neu");
      return n === "glass" ? "neu-g" : "neu";
    }
    return ui || null; // null = 用户没选，不猜
  }

  function setMode(id) {
    const root = document.documentElement;
    if (id === "neu-g") { root.setAttribute("data-ui", "neu"); root.setAttribute("data-neu", "glass"); }
    else if (id === "neu") { root.setAttribute("data-ui", "neu"); root.setAttribute("data-neu", "solid"); }
    else root.setAttribute("data-ui", id);
    if (id === "liquid" && global.FangUI.liquid) global.FangUI.liquid.enable();
    if (id !== "liquid" && global.FangUI.liquid) global.FangUI.liquid.disable();
    try { localStorage.setItem("fangui.mode", id); } catch (e) { /* 无痕模式静默 */ }
  }

  /* 主动提问卡：检测到未选风格时弹点选卡片（类似 AskUserQuestion 交互） */
  function promptStyle(host, onPick) {
    if (mode()) return null; // 已选过，不打扰
    const card = document.createElement("div");
    card.className = "fu-card fu-ai-ask";
    card.innerHTML =
      '<div class="fu-ai-ask__title">想用哪种界面风格？</div>' +
      '<div class="fu-ai-ask__sub">选一个顺眼的，之后随时能换</div>' +
      '<div class="fu-ai-ask__list">' +
      UIS.map(
        (u) =>
          `<button class="fu-btn fu-ai-ask__opt" data-id="${u.id}">` +
          `<b>${u.name}</b><span>${u.desc}</span></button>`
      ).join("") +
      "</div>";
    card.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-id]");
      if (!btn) return;
      setMode(btn.dataset.id);
      card.remove();
      if (onPick) onPick(btn.dataset.id);
    });
    (host || document.body).appendChild(card);
    if (global.FangUI.motion) global.FangUI.motion.bounce(card);
    return card;
  }

  /* 风格对比：左右并排同组件，点边即选定 */
  function compare(host, sample, opts) {
    const o = Object.assign({ left: "flat", right: "liquid" }, opts);
    const wrap = document.createElement("div");
    wrap.className = "fu-compare";
    const build = (id, side) => {
      const pane = document.createElement("div");
      pane.className = "fu-compare__pane";
      pane.dataset.pane = id;
      const label = document.createElement("div");
      label.className = "fu-compare__label";
      label.textContent = UIS.find((u) => u.id === id)?.name || id;
      const stage = document.createElement("div");
      stage.setAttribute("data-stage-ui", id);
      if (id === "neu" || id === "neu-g") stage.setAttribute("data-stage-neu", id === "neu-g" ? "glass" : "solid");
      stage.appendChild(sample());
      pane.append(label, stage);
      pane.addEventListener("click", () => {
        setMode(id);
        wrap.remove();
      });
      return pane;
    };
    wrap.append(build(o.left, "left"), build(o.right, "right"));
    (host || document.body).appendChild(wrap);
    return wrap;
  }

  global.FangUI = global.FangUI || {};
  global.FangUI.ai = { UIS, mode, setMode, promptStyle, compare };
})(window);
