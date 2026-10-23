/*
 * fangUI · icon —— 图标库（2657 张，来自 NexusOS 26）
 *
 * FangUI.icon("search", el)     按英文名取图标，注入 el（不传则返回 <i> 元素）
 * FangUI.icon("搜索", el)       中文名也认
 * <i data-fu-icon="search"></i> 声明式写法，扫描一次全部就位
 * FangUI.icons.search("文")     搜索清单 → [{en, zh}]
 * FangUI.icons.count()          图标总数
 *
 * 设计：只带一张 ~100KB 的 manifest.json（名字索引），
 * SVG 本体按需单张 fetch + 内存缓存 —— 1000 多张图标也不占运行时。
 */
(function (global) {
  "use strict";

  let manifest = null;      // [{en, zh, f}]
  let byEn = null, byZh = null;
  const cache = new Map();  // filename -> svg text
  const fetching = new Map();

  async function load() {
    if (manifest) return manifest;
    // manifest 与 icon.js 同目录（都在 src/，icons/ 在工程根）——按 import.meta.url 推
    let base = "";
    try { base = new URL("../icons/", import.meta.url).href; }
    catch (e) { base = "../icons/"; }
    const res = await fetch(base + "manifest.json");
    manifest = await res.json();
    byEn = new Map(); byZh = new Map();
    for (const it of manifest) {
      if (!byEn.has(it.en)) byEn.set(it.en, it);
      if (!byZh.has(it.zh)) byZh.set(it.zh, it);
    }
    manifest._base = base;
    return manifest;
  }

  function resolve(name) {
    if (!byEn) return null;
    const key = String(name).trim();
    return byEn.get(key) || byZh.get(key) ||
      byEn.get(key.toLowerCase().replace(/\s+/g, "-")) || null;
  }

  async function svgOf(item) {
    if (cache.has(item.f)) return cache.get(item.f);
    if (fetching.has(item.f)) return fetching.get(item.f);
    const p = fetch(manifest._base + encodeURIComponent(item.f)).then((r) => {
      if (!r.ok) throw new Error("icon 404: " + item.f);
      return r.text();
    });
    fetching.set(item.f, p);
    const txt = await p;
    cache.set(item.f, txt);
    fetching.delete(item.f);
    return txt;
  }

  /* 取图标：返回元素（传入 el 则填充它） */
  async function icon(name, el) {
    await load();
    const item = resolve(name);
    if (!item) {
      if (el) el.textContent = "?";
      return null;
    }
    const host = el || document.createElement("i");
    host.classList.add("fu-icon");
    // IconPark 源文件写死 stroke/fill="#333"——替换成 currentColor，暗色模式自动变白
    const txt = (await svgOf(item)).replace(/#333/gi, "currentColor");
    if (txt) host.innerHTML = txt;
    const svg = host.querySelector("svg");
    if (svg) {
      svg.removeAttribute("width"); svg.removeAttribute("height");
      svg.setAttribute("width", "1em"); svg.setAttribute("height", "1em");
    }
    host.title = item.zh + " · " + item.en;
    return host;
  }

  /* 声明式：扫描 [data-fu-icon] */
  function scan(host) {
    (host || document).querySelectorAll("[data-fu-icon]").forEach((el) => {
      if (el.dataset.fuIconDone) return;
      el.dataset.fuIconDone = "1";
      icon(el.dataset.fuIcon, el);
    });
  }

  function search(q, limit) {
    if (!manifest) return [];
    const key = String(q || "").trim().toLowerCase();
    const out = [];
    for (const it of manifest) {
      if (!key || it.en.toLowerCase().includes(key) || it.zh.includes(q)) {
        out.push(it);
        if (limit && out.length >= limit) break;
      }
    }
    return out;
  }

  const api = {
    icon, scan, search,
    count: () => (manifest ? manifest.length : 0),
    ready: load,
  };

  global.FangUI = global.FangUI || {};
  global.FangUI.icons = api;
  global.FangUI.icon = icon;

  if (document.readyState !== "loading") scan();
  else document.addEventListener("DOMContentLoaded", () => scan());
})(window);
