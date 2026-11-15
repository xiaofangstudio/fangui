# FangUI

> 小方工作室 · Fangwork 生态统一 UI 框架 · MIT

**一个内核，一套令牌，一层组件。** 不跑 webview，用 Rust 直接调 QuickJS + Yoga + Skia 画界面。

这个仓库装了三样东西：框架本体、它依赖的内核、用这套技术栈做的第一个软件。

---

## 目录

| 目录 | 是什么 | 体积 |
| --- | --- | --- |
| `fangui/` | **框架本体**：设计令牌 + 组件层，`fangui@0.1.0` | 4 个文件 |
| `kernel/` | **Deft 内核**源码（上游 deft-ui 1.0.0，MIT）：QuickJS 跑逻辑、Yoga 排版、Skia 绘制 | 278 个文件 |
| `FloatStudio/` | **配套软件** Float Studio 0.1.0：Copper UI 一体化开发环境（前端 `.cui` + 后端 `.co`） | 259 个文件 |
| `ICONS.md` | 图标库规划：122 个图标（104 通用 + 18 产品），kubai-icons 引擎 | 文档 |

---

## 框架长什么样

### 它不是网页框架

FangUI 不寄生在浏览器里。上层是 JavaScript（QuickJS），排版交给 Yoga，像素交给 Skia，中间没有 DOM、没有 CSS 引擎、没有 webview。所以同一个组件在 Windows / Linux / macOS / 鸿蒙 / 安卓 / iOS / WASM 上是一套渲染结果。

### 设计令牌：改一个值，全局跟着变

风格基调是现代 Fluent（WinUI 3 式）——扁平打底，轻描边分层，阴影只留给浮层。

```js
import { token, setTheme } from 'fangui'

setTheme('dark')          // light / dark
token('color.accent')     // '#0054A6' 这类具体值
```

令牌分三组：

- **颜色**：品牌强调色 + 文本三级 + 背景/层/控件状态 + 描边 + 语义色（success / warning / danger）+ 双层焦点环
- **圆角**：`xs 2 / s 4 / m 8 / l 12 / full 999`
- **间距与字号**：`4 8 12 16 24 36` 的八点栅格，字号 `12 / 14 / 20 / 28`

亮暗两套完整定义在 [`fangui/src/theme/tokens.js`](fangui/src/theme/tokens.js)，没有 `#FFFFFF` 和 `#000000` 的硬碰硬，层级只走极小幅度明度差。

### 组件层：目前一个 Button，把规范先钉死

```js
import { Button } from 'fangui'

const ok = new Button({ text: '确定', variant: 'accent', size: 'm', onClick: () => save() })
```

| 变体 | 用途 |
| --- | --- |
| `accent` | 实心强调色，一屏只能有一个 |
| `standard` | 浅控件底 + 细描边，默认款 |
| `subtle` | 透明底，hover 才出底 |
| `outline` | 透明底 + 强描边 |
| `danger` | 危险操作 |

尺寸 `s / m / l` 对应 Fluent 的 24 / 32 / 36 三档控件高度。组件全部从令牌取值，不写死颜色。

---

## 配套软件：Float Studio

`FloatStudio/` 是这套技术栈孵出来的第一个完整软件——**Copper UI 一体化开发环境**：左边写 `.cui` 界面，右边写 `.co` 逻辑，一个窗口里跑起来。

- 前端：React 18 + Monaco 编辑器 + xterm 终端
- 外壳：Tauri 2
- 语言服务：`src-tauri/float-lang`（Rust 实现，含语法高亮、补全、指针词、标准库、教程全套测试）

**Windows 安装包（17.6MB）在 [Releases](https://github.com/xiaofangstudio/fangui/releases/tag/v0.1.0) 里**，下载 `Float.Studio_0.1.0_x64-setup.exe` 直接装。

从源码跑：

```bash
cd FloatStudio
npm install
npm run dev          # 浏览器里跑前端
npm run tauri dev    # 桌面窗口（需要 Rust 工具链）
npm run test:all     # 语言 / 索引 / 压力测试
```

---

## 从源码构建框架

`fangui/` 是纯 ESM 包，没有构建步骤，直接被 Deft 应用引用：

```js
import { Button } from 'fangui'
```

内核在 `kernel/`，需要 Rust + Node.js + Clang 14+：

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

MIT。`kernel/` 是上游 [deft-ui/deft](https://github.com/deft-ui/deft) 的 MIT 源码，版权归其作者；`fangui/` 与 `FloatStudio/` 版权归小方工作室。
