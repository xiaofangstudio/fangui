# Kubai Icons

FangUI 的图标组不是手画的，是 **Kubai Icons** 这套 agent skill 产出的：31×29 画布、键线对齐、六套配色、悬停时形状本身变形。FangUI 只做两件事——把它的两态导成资产，用 `.cui` 摆上墙。

源工程在 `D:\20533\deskbox\files\ICON`（`src/engine.js` 负责配色、几何、补间；`src/icons.js` 是图标数据；`scripts/export.mjs` 导出静态 SVG）。

## 导出

```bash
cd D:\20533\deskbox\files\ICON
set CHROME=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe

node scripts/export.mjs --palette 彩色 --size 96 --out <FangUI>/examples/icons/assets/color/rest
node scripts/export.mjs --palette 彩色 --state hover --size 96 --out <FangUI>/examples/icons/assets/color/hover
```

`--palette 黑色` 同理。产物是每枚图标一张 `rest`、一张 `hover`，颜色按调色板烘焙好（`<img>` 不继承 `currentColor`，这一点和单色 glyph 不同）。

`ORDER` 在 `src/app.js` 里，共 96 枚上墙；`ICONS` 定义有 145 枚，多出来的是还没排进画廊的备选。

## 悬停为什么能“变形”

静态 SVG 没法自己播形状补间，所以用两张状态图叠在一起：

```
icon                      ← 一个元件，内部两个背景层
    ::before               ← 静止态（rest）
    ::after                ← 动作终态（hover），平时 opacity 0
```

悬停时 `::after` 的 `opacity` 从 0 涨到 1，持续 460ms、`cubic-bezier(.22,1,.36,1)`（和 skill 的 `EASE` 同一条曲线），读起来是形状在长出来，不是整块位移。这套规则写在 `src/styles/components.ts` 的 `[data-t="icon"]` 里，`--ease-soft` 就是那条曲线。

## 在 CUI 里用它：`icon`

图标不再靠页面自己拼两张 `<image>`——那套写法已经收进框架，变成一个元件：

```cui
box fr
    width 74
    height 74
    radius l
    background wash

    icon
        name "文件夹"
        width 44
        height 44
        motion hover        /* hover 悬停才动 / always 常驻呼吸 / still 完全静止 */
        palette color       /* color 彩色 / black 单色 */
        base assets         /* 资产根目录，默认 assets；从别的目录引用时写成 ../icons/assets */
```

编译出来是一个 `<span data-t="icon" class="m-hover" data-motion="hover" style="--icon-rest:url(...);--icon-hover:url(...)">`：
两张状态图挂在 `::before` / `::after` 两个背景层上，三档开关是 `m-hover` / `m-always` / `m-still` 三个类，
动画本身（460ms 交叉、常驻呼吸的 keyframes、无动画）全在 `COMPONENT_CSS` 里，页面一行过渡都不用写。

`always` 档是 2.6s 一轮的呼吸：0–22% 静止，58–84% 动作终态，100% 回到静止；
`prefers-reduced-motion` 下自动关掉。

运行时也能改，给 Copper / 事件用：

```cui
button all-always when click
    act motion always on row icons
```

不带 `on 选择器` 时改的是被点元素里的所有 `icon`（放进按钮里最顺手）。

Copper 侧不用另开通道：开关就是三个类，`page.add("icon toolbar", "m-always")`、`page.remove(…)`、`page.toggle(…)` 都能直接切——
`page.*` 本来就只认 `[data-t]` 选择器 + 类名，和 `.cui` 编译产物是同一套坐标。

## 上墙的结构

96 格就是上面那个块 × 96，顺序照 skill 的 `ORDER`，由 `.build/gen-icons-wall.ps1` 生成。


## 已知问题

`刷新` 这枚在 skill 里的 `arcArrow(10, 330, 8.4)` 只写了一条 `A` 弧且没有设 large-arc，旋转中心也没落到画布中心，导出来是右上一小段弧。要修得动 `src/icons.js` 的那条弧（拆成两段或补 large-arc + 平移）。FangUI 这边先按上游原样出图，改上游后重跑一次导出即可。

