# FangUI

> 小方工作室 · Fangwork 生态统一 UI 框架 · MIT

**一套令牌，一层组件，一个编译器。** `.cui` 写成界面，编译成标准 CSS + 标准 DOM，任何浏览器 / WebView / Tauri 窗口都能跑，不绑定 React，也没有私有渲染器。

这个仓库装了两样东西：框架本体、它依赖的内核源码。

---

## 目录

| 目录 | 是什么 | 体积 |
| --- | --- | --- |
| `FangUI/` | **开发框架本体**（`@fangui/core`）：设计令牌 + 组件层 + Copper UI 编译器 + 运行时 + AOT 工具链 + Rust 内核 / 启动器 | 独立仓库级目录 |
| `kernel/` | **Deft 内核**源码（上游 deft-ui 1.0.0，MIT）：QuickJS 跑逻辑、Yoga 排版、Skia 绘制。当前 FangUI 的界面路线是编译到 CSS/DOM，这份内核保留作底层参考 | 278 个文件 |
| `ICONS.md` | 图标库规划：122 个图标（104 通用 + 18 产品），kubai-icons 引擎 | 文档 |

`FangUI/` 不认 Tauri、不认编辑器，靠 `setFangHost` / `setAotHost` 注入宿主能力。配套软件 Float Studio 已独立成仓：[xiaofangstudio/Float-Studio](https://github.com/xiaofangstudio/Float-Studio)。目录、自测与构建见 [FangUI/README.md](FangUI/README.md)，上手写法见 [FangUI/docs/guide.md](FangUI/docs/guide.md)。

---

## 框架长什么样

### 编译成网页，但不是"网页框架"

```
app/main.cui  →  parse  →  compile（拍平 CSS + 行为表）  →  tree（真实 DOM）  →  runtime（点击 / 键盘 / 浮层 / 主题）
```

- 样式是**标准 CSS**，选择器只有 `[data-t="button"].accent` 这一种形状，没有 scope、没有原子类、没有运行时注入的 `<style>`
- 结构是**标准 DOM**：`button` 就是 `<button>`，`input` 就是 `<input>`，表格就是 `<table>`，键盘、焦点、无障碍走浏览器原生能力
- 交互是一张**行为表**，由一个十几 KB（压缩后约 15 KB）的运行时执行；不写 JS 也能做出菜单、抽屉、对话框、页签、toast

所以同一个 `.cui` 在浏览器预览、Float Studio 里、打包后的桌面窗口里长得一模一样——因为它本来就是同一份 CSS 和同一份 DOM。

### 设计令牌：改一个值，全局跟着变

令牌唯一真相源是 [`FangUI/src/theme/tokens.ts`](FangUI/src/theme/tokens.ts)，`npm run build:docs` 会把它导成表格。

```cui
card hero
    background card
    color ink
```

```css
[data-t="card"].hero { background: var(--card); color: var(--ink); }
```

令牌分四组：

- **颜色**：底五级（canvas / surface / card / wash / sunken）+ 文本四级 + 描边三级 + 强调色（accent / primary / tint / tone）+ 语义色（ok / err / warn / info）+ 控件态 + 浮层阴影 + 骨架屏
- **主题**：亮 / 暗两套完整定义，另有 `green`（默认）/ `blue` / `violet` / `amber` / `rose` 五套强调色，亮暗各一份，全部手写定值
- **尺度**：间距 4 / 8 / 12 / 16 / 24 / 36；圆角 2 / 4 / 8 / 12 / 16 / 999；字号 12 / 13 / 14 / 20 / 28；控件高 24 / 32 / 40
- **动效与层级**：三档时长、三套缓动、七层 z-index；`prefers-reduced-motion` 自动降级

亮暗、强调色切换是纯 CSS 变量：`data-theme="dark"` / `.night` / `data-accent="violet"`，运行时就一行 `act accent violet`。

### 组件层：41 个元件，变体是类名

```cui
button save accent
    text "保存"

button save danger when click
    act say "已删除"
```

| 变体 | 用途 |
| --- | --- |
| `accent` | 实心强调色，一屏只能有一个 |
| `standard` | 浅控件底 + 细描边，默认款 |
| `subtle` | 透明底，hover 才出底 |
| `outline` | 透明底 + 强描边 |
| `danger` | 危险操作 |
| `link` | 当链接用 |
| `icon` | 只剩图标，正方形 |

尺寸 `s / m / l` = 24 / 32 / 40；状态 `disabled` / `loading` / `active`。组件样式里**没有一个字面色值**，颜色全部从令牌取，所以换主题不用改一行界面。

元件覆盖：按钮 / 输入（input、textarea、dropdown、checkbox、radio、switch、slider、progress）/ 容器（window、card、grid、section、toolbar、list、form…）/ 数据展示（table、badge、tag、avatar、icon、skeleton、code）/ 反馈（alert、empty、toast、spinner）/ 浮层（menu、popover、modal、drawer、overlay、tabs）。

清单：`FangUI/docs/components.md`（41 个元件 + 变体 + 属性 + 示例，生成）、`FangUI/docs/tokens.md`（令牌表，生成）。

### 组件陈列馆

`FangUI/examples/kitchen/preview.html` 是单文件、离线可开的陈列馆：亮色 + 暗色 + 五种强调色，浮层、页签、toast、键盘循环都能当场点。

```
FangUI/examples/kitchen/shot/light.png
FangUI/examples/kitchen/shot/dark.png
```

---

## 配套软件：Float Studio

Float Studio 是这套技术栈孵出来的第一个完整软件——**Copper UI 一体化开发环境**：左边写 `.cui` 界面，右边写 `.co` 逻辑，一个窗口里跑起来。它已经从本仓拆出去，独立维护：

- 仓库：<https://github.com/xiaofangstudio/Float-Studio>
- 安装包与发行说明：该仓的 Releases
- 对本框架的依赖方式：`import '@fangui/core'`，宿主能力靠 `setFangHost` / `setAotHost` 注入

---

## 从源码构建框架

`FangUI/` 是纯 ESM 的 TypeScript 包，使用方按需 `import`；要 CSS 产物或文档才需要构建：

```bash
cd FangUI
npm install
npm run build          # dist/fangui.css + 生成文档 + 陈列馆预览
npm run check          # typecheck + 自测 + 构建
```

产物：

| 路径 | 是什么 |
| --- | --- |
| `dist/fangui.css` / `dist/fangui.min.css` | 完整样式，可直接 `<link>`，手写 `data-t` 也能用 |
| `docs/components.md` / `docs/tokens.md` | 组件与令牌文档（生成） |
| `examples/kitchen/preview.html` | 组件陈列馆，单文件 |

内核源码在 `kernel/`，需要 Rust + Node.js + Clang 14+：

```bash
cd kernel
cargo build                       # 编译内核
cargo run --example hello         # 跑最小示例
```

Linux 还要装 `libssl-dev`、`libclang-dev`、`xorg-dev` 等一批开发包，详见 `kernel/README.md`。

---

## 图标

`ICONS.md` 是图标库的施工图：104 个通用图标 + 18 个 Fangwork 产品图标，全部走 kubai-icons 的「后片 / 内容 / 前片」三层构造，主色推导、外描边、悬停形变。第一版还没落地成 SVG 文件。

---

## 许可

MIT。`kernel/` 是上游 [deft-ui/deft](https://github.com/deft-ui/deft) 的 MIT 源码，版权归其作者；`FangUI/` 版权归小方工作室。
