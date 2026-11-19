/* 结构层：容器、页面骨架、文本与栅格。
 *
 * 这一层的元件都不"交互"，只负责把界面搭起来。全部给可用默认值，
 * 作者想改就写在 .cui 里覆盖（编译产物永远在这些默认样式之后）。 */

export const LAYOUT_CSS = `
/* ── 根与容器 ── */
[data-t="window"] { display: block; min-height: 100%; overflow: auto; background: var(--canvas); color: var(--ink); }
[data-t="box"] { display: block; }
[data-t="row"] { display: flex; flex-direction: row; }
[data-t="column"] { display: flex; flex-direction: column; }
[data-t="spacer"] { display: block; flex: 1 1 auto; }
[data-t="scroll"] { display: block; overflow: auto; overscroll-behavior: contain; }

/* 多页：可见性只由 .active 决定（隐藏规则在 components 里，带 !important，
   因为每个 view 自己的 layout 类会写 display，细微优先级不该决定哪页能看见） */

/* ── 页面骨架 ── */
[data-t="header"] {
  display: flex; align-items: center; gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--surface); border-bottom: 1px solid var(--hairline);
  min-height: 48px; flex: none;
}
[data-t="footer"] {
  display: flex; align-items: center; gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--surface); border-top: 1px solid var(--hairline);
  min-height: 44px; flex: none;
}
[data-t="nav"] {
  display: flex; align-items: center; gap: var(--space-1);
  padding: 0 var(--space-3);
  background: var(--card); border-bottom: 1px solid var(--line);
}
[data-t="nav"].rail {
  flex-direction: column; align-items: stretch;
  width: 220px; padding: var(--space-2) var(--space-1);
  border-bottom: 0; border-right: 1px solid var(--line);
}
[data-t="main"] { display: block; flex: 1 1 auto; min-height: 0; min-width: 0; }
[data-t="aside"] { display: block; flex: none; }
[data-t="aside"].rail {
  width: 260px; padding: var(--space-3);
  border-left: 1px solid var(--hairline); background: var(--surface);
  overflow: auto;
}
[data-t="section"] { display: block; }
[data-t="section"].pad { padding: var(--space-4); }
[data-t="section"].gap { display: flex; flex-direction: column; gap: var(--space-3); }

/* ── 卡片 ── */
[data-t="card"] {
  display: block;
  background: var(--card);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-l);
  padding: var(--space-4);
  color: var(--ink);
}
[data-t="card"].flat { border-color: transparent; }
[data-t="card"].raised { border-color: transparent; box-shadow: var(--shadow-2); }
[data-t="card"].sunken { background: var(--wash); border-color: transparent; }
[data-t="card"].interactive { cursor: pointer; transition: background var(--dur) var(--ease), box-shadow var(--dur) var(--ease), transform var(--dur) var(--ease); }
[data-t="card"].interactive:hover { background: var(--card); box-shadow: var(--shadow-2); transform: translateY(-1px); }
[data-t="card"].interactive:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }

/* ── 栅格与工具条 ── */
[data-t="grid"] {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-3);
}
[data-t="grid"].fit { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
[data-t="grid"].tight { gap: var(--space-2); }
[data-t="toolbar"] {
  display: flex; align-items: center; flex-wrap: wrap;
  gap: var(--space-2); padding: var(--space-1) 0;
}
[data-t="toolbar"].between { justify-content: space-between; }

/* ── 分割线与标题 ── */
[data-t="divider"] { display: block; height: 1px; border: 0; margin: var(--space-2) 0; background: var(--line); }
[data-t="divider"].vertical { display: inline-block; width: 1px; height: 100%; margin: 0 var(--space-2); vertical-align: middle; }
[data-t="heading"] {
  display: block; font-size: 15px; line-height: 1.4; font-weight: 600;
  color: var(--ink); margin: 0 0 var(--space-1);
}
[data-t="heading"].page { font-size: var(--font-lg); font-weight: 700; }
[data-t="heading"].sub { font-size: var(--font-sm); font-weight: 600; color: var(--soft); }
[data-t="label"] { display: inline-block; font-size: var(--font-xs); color: var(--faint); line-height: 1.5; }
[data-t="label"].req::after { content: " *"; color: var(--sem-err); }
[data-t="label"].strong { font-size: var(--font-sm); font-weight: 600; color: var(--ink); }

/* ── 文本 ── */
[data-t="text"] { display: block; overflow-wrap: break-word; }
[data-t="text"].muted { color: var(--faint); }
[data-t="text"].strong { font-weight: 600; }
[data-t="text"].mono { font-family: "Cascadia Mono", "JetBrains Mono", Consolas, monospace; font-size: var(--font-xs); }
[data-t="text"].caption { font-size: var(--font-xs); color: var(--faint); line-height: 1.5; }
[data-t="text"].lead { font-size: var(--font-lg); font-weight: 600; }

/* 代码块：写文档、写教程必备，行内与块级都认同一个元件 */
[data-t="code"] {
  display: block; margin: 0;
  font-family: "Cascadia Mono", "JetBrains Mono", Consolas, monospace;
  font-size: var(--font-xs); line-height: 1.7;
  background: var(--sunken); color: var(--ink);
  border: 1px solid var(--line); border-radius: var(--radius-m);
  padding: var(--space-3); overflow: auto; white-space: pre; tab-size: 2;
}
[data-t="code"].inline {
  display: inline; padding: 1px 5px; border: 0; border-radius: var(--radius-s);
  background: var(--wash); vertical-align: baseline;
}

/* ── 列表 ── */
[data-t="list"] { display: block; margin: 0; padding: 0; list-style: none; }
[data-t="list"].divided > * + * { border-top: 1px solid var(--hairline); }
[data-t="item"] {
  display: flex; align-items: center; gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-m);
  transition: background var(--dur-fast) var(--ease);
}
[data-t="item"].dense { padding: var(--space-1) var(--space-2); }
[data-t="item"].selected { background: var(--tint); color: var(--ink); }
[data-t="item"].interactive:hover { background: var(--wash); }
[data-t="item"].interactive:active { background: var(--sunken); }

/* ── 图片与头像 ── */
[data-t="image"] { display: block; max-width: 100%; height: auto; }
[data-t="image"].cover { width: 100%; height: 100%; object-fit: cover; }
[data-t="image"].round { border-radius: var(--radius-full); }

/* ── 表单容器 ── */
[data-t="form"] { display: flex; flex-direction: column; gap: var(--space-3); }
[data-t="field"] { display: flex; flex-direction: column; gap: var(--space-1); }
[data-t="field"].inline { flex-direction: row; align-items: center; gap: var(--space-2); }
[data-t="field"].inline > [data-t="label"] { flex: none; min-width: 88px; }

/* ── 布局工具类（不写属性也能对齐） ── */
.center { display: flex; align-items: center; justify-content: center; }
.middle { display: flex; align-items: center; }
.between { display: flex; align-items: center; justify-content: space-between; }
.end { display: flex; align-items: center; justify-content: flex-end; }
.wrap { display: flex; flex-wrap: wrap; }
.fill { width: 100%; }
.fit { width: fit-content; }
.pill { border-radius: var(--radius-full); }
.round { border-radius: 50%; }
.nowrap { white-space: nowrap; }
.mono { font-family: "Cascadia Mono", "JetBrains Mono", Consolas, monospace; }
.muted { color: var(--faint); }
.strong { font-weight: 600; }
`;
