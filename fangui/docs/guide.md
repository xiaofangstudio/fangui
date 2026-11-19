# FangUI 使用指南

FangUI 是一套 **令牌 → 组件 → 界面** 的 UI 框架：界面写成 `.cui`，编译成**标准 CSS + 标准 DOM**，交互交给一个压缩后约 15 KB 的运行时。任何浏览器、WebView、Tauri 窗口都能跑，不需要 React，也没有私有渲染器。

```
.cui 源码
   │  parseCui      语法树
   │  compileCui    拍平的 CSS（只含 [data-t=…] 选择器）+ 行为表
   │  buildCuiTree  真实 DOM（button / input / table …）
   └  attachCuiRuntime  点击 / 键盘 / 浮层 / 主题
```

---

## 1. 30 秒跑起来

```bash
cd FangUI
npm install
npm run build:showcase        # 生成 examples/kitchen/preview.html
```

双击 `examples/kitchen/preview.html`，就是一个离线可用的组件陈列馆：按钮七变体、输入、表格、浮层、暗色、五种强调色都在里面。

要在自己的页面里用：

```html
<link rel="stylesheet" href="./dist/fangui.css" />
<body>
  <div data-t="window" class="app">
    <button data-t="button" class="accent">保存</button>
  </div>
</body>
```

`dist/fangui.css` 是不依赖 `.cui` 的完整样式（令牌 + 重置 + 结构 + 组件），你可以直接手写 `data-t` 属性配类名，也可以完全走 `.cui`。

---

## 2. 在代码里用

```ts
import { compileCui, parseCui, buildCuiTree, renderCuiTree, attachCuiRuntime } from '@fangui/core'

const src = `window app
    layout column
    button save
        text "保存"
    button save when click
        act say "已保存"`

const { css, behaviors, diagnostics } = compileCui(src)   // CSS 字符串 + 行为表 + 诊断
const tree = buildCuiTree(parseCui(src))                   // 规则树 → DOM 描述

document.body.innerHTML = renderCuiTree(tree)
attachCuiRuntime(document, behaviors, { say: (t) => console.log(t) })
// css 要自己塞进 <style>，或直接用 renderCuiHtml(src) 一步到位
```

宿主要提供的能力（弹提示、复制、取文件）通过 `attachCuiRuntime` 的第二个参数注入，框架本身不假设任何环境。

`.cui` 的两种读法：

| 写法 | 用途 |
| --- | --- |
| `parseCui(src)` | 只要语法树，自己做检查/编辑器高亮 |
| `compileCui(src)` | 一次拿到 CSS、行为表、文案、图片、诊断 |
| `buildCuiTree(doc)` | 把规则树长成 DOM 描述（一个块 = 一个元素，同样的块写几次就长几个） |
| `renderCuiHtml(src)` | 一步到位的完整 HTML 片段 |

---

## 3. 一个 `.cui` 文件的骨架

```cui
/* app/main.cui */
window app
    theme light
    layout column
    gap 0

    header top
        layout row
        heading brand
            text "FangUI"

        spacer

        button theme-btn icon s
            icon
                text "moon"

    main body
        layout column
        gap 18
        padding 20

        card hero raised
            heading hero-title
                text "标题"
                page
            text hero-lead
                text "一段说明。"
                lead
```

缩进就是父子关系，第一条词是**元件名**，后面的词是**类名**，再往下的 `键 值` 是**属性**。注释用 `/* … */`。

---

## 4. 令牌

令牌唯一真相源是 `src/theme/tokens.ts`，`npm run build:docs` 会把它导成 `docs/tokens.md`。

### 颜色：20 个兼容名 + 扩展名

`.cui` 里写短名，CSS 里就是变量：

```cui
card hero
    background card
    color ink
```

```css
[data-t="card"].hero { background: var(--card); color: var(--ink); }
```

| 组 | 变量 |
| --- | --- |
| 底 | `--canvas --surface --card --wash --sunken` |
| 线 | `--hairline --line --edge` |
| 字 | `--ink --soft --faint --ghost` |
| 强调 | `--accent --primary --tint --tone` |
| 语义 | `--sem-ok --sem-err --sem-warn --sem-info` |
| 控件 | `--control --control-hover --control-pressed --control-disabled --field --field-hover --track --focus` |
| 浮层 | `--shadow-1..3 --scrim --skeleton --skeleton-shine` |
| 尺度 | `--space-1..6 --radius-xs/s/m/l/xl/full --font-xs/sm/md/lg/xl --control-s/m/l --icon-s/m/l` |
| 动效 | `--dur --dur-fast --dur-slow --ease --ease-out --ease-in` |
| 层级 | `--z-base --z-sticky --z-dropdown --z-overlay --z-modal --z-toast --z-tooltip` |

语义色不是写死的两种色值，而是 `color-mix` 现场调的——所以亮暗、强调色切换时它自己跟着变。

### 主题与强调色

```cui
window app
    theme dark
```

或运行时切换：

```cui
button theme-btn when click
    act toggle night on window
```

```css
[data-theme="dark"]  /* 挂在 window 上，或 documentElement 上 */
.night               /* 等价写法 */
[data-accent="violet"]
```

五套强调色：`green`（默认）/ `blue` / `violet` / `amber` / `rose`，亮暗各一份，全部手写定值。

```cui
button sw-violet when click
    act accent violet
```

`act accent` 会同时写 `data-accent` 到 window 和 documentElement；`act toggle night` 只是加/去 `.night` 类。

### 尺度

| 组 | 档位 |
| --- | --- |
| 间距 | 4 / 8 / 12 / 16 / 24 / 36 |
| 圆角 | 2 / 4 / 8 / 12 / 16 / 999 |
| 字号 | 12 / 13 / 14 / 20 / 28 |
| 控件高 | 24 / 32 / 40 |
| 图标 | 16 / 20 / 24 |

---

## 5. 组件与变体

41 个元件、七组：按钮 / 输入 / 选择 / 容器 / 数据展示 / 反馈 / 浮层。完整表见 `docs/components.md`（由代码生成，永远和实现对得上）。

**变体是类名，尺寸也是类名：**

```cui
button save accent            /* 强调实心 */
button save standard          /* 默认款：浅控件底 + 细描边 */
button save subtle            /* 透明底，hover 才出底 */
button save outline           /* 透明底 + 强描边 */
button save danger            /* 危险 */
button save link              /* 当链接用 */
button save icon              /* 只剩图标，正方形 */
button save s / m / l         /* 24 / 32 / 40 */
button save pill              /* 胶囊 */
button save loading           /* 转圈 + 禁点 */
button save disabled          /* 灰掉 */
```

一屏只放一个 `accent`——这是规范，不是代码限制。

```cui
button b-loading
    spinner
        s
    text "处理中"
```

常用元件：

| 组 | 元件 |
| --- | --- |
| 按钮 | `button` `tab` `menuitem` `link` |
| 输入 | `input` `textarea` `dropdown` `option` `checkbox` `radio` `switch` `slider` `progress` |
| 容器 | `window` `box` `card` `section` `grid` `list` `item` `form` `field` `toolbar` `header` `footer` `nav` `main` `aside` `scroll` `view` `spacer` `divider` |
| 数据 | `table` `row` `heading` `cell` `badge` `tag` `avatar` `icon` `image` `skeleton` `spinner` `code` `text` `label` `tip` |
| 媒体 | `video` `audio` `frame`（iframe，`doc` 写内联 HTML） |
| 反馈 | `alert` `empty` `toast` `popover` `menu` `overlay` `modal` `drawer` `tabs` |

---

## 6. 布局

```cui
main body
    layout column        /* column / row */
    gap 18               /* 间距，走 space 尺度 */
    padding 20
    width fill           /* fill = 100%；fit = 内容宽 */
    overflow auto
    align center         /* 交叉轴对齐 */
    justify between      /* 主轴对齐 */
```

栅格：

```cui
grid in-grid
    columns 2            /* 等分两列，编成 repeat(2, 1fr) */
    gap 12
```

工具类可以直接写在元件后面：`center middle between end wrap fill fit pill round nowrap mono muted strong`。

---

## 7. 交互

行为写在文件末尾（或任意位置，按选择器匹配）：

```cui
button save when click
    act say "已保存"

input search when enter
    act say "搜索"

tab t1 when click
    act go overview
```

| 事件 | 触发 |
| --- | --- |
| `click` | 点击（含键盘 Enter / Space） |
| `enter` | 输入框回车 |
| `change` | 值变化 |
| `input` | 输入中 |
| `focus` / `blur` | 聚焦 / 失焦 |

| 动作 | 说明 |
| --- | --- |
| `act say "…"` | 走宿主注入的回调（预览里是 toast） |
| `act open` / `act close` | 开/关最近的浮层（menu、popover、overlay、drawer、toast） |
| `act open on overlay ov-confirm` | 开到指定目标 |
| `act accent violet` | 换强调色 |
| `act copy "…"` | 复制（Clipboard API，失败回退 execCommand） |
| `act go 视图名` | 切 `view` |
| `act toggle night on window` | 加/去类名 |
| `act add` / `act remove` | 加 / 去类名 |

`when` 后面可以跟状态，例：`when change`、`when enter`。

---

## 8. 浮层怎么摆

浮层是**触发按钮的子元素**，区块级写法：

```cui
button ov-menu
    position relative        /* 让菜单相对按钮定位 */
    text "打开菜单"

    menu om
        menuitem om-1
            text "重命名"
        divider
        menuitem om-3
            danger
            text "删除"
```

注意：`menuitem` 与 `divider` 都写在 `menu` 下面（缩进），**不要**把它们放在和 `menu` 同级的地方。

`menu` / `popover` / `overlay` / `drawer` / `toast` 默认 `display: none`，`act open` 时加 `.open`。运行时会：

- Esc 关最上层浮层
- 点遮罩空白处关
- 打开时聚焦第一个可聚焦项，Tab 在浮层内循环，关闭后归还焦点
- toast 4 秒自动收（加 `.sticky` 可钉住）

---

## 9. 命名规则（最容易踩的一条）

解析器把**裸词**优先当成元件名或属性名，其次才是类名。所以下面四个名字**既是元件、又是类名**，单独写一行会被当成元件：

| 名字 | 单独写一行 | 正确写法 |
| --- | --- | --- |
| `icon` | 生成一个空图标元件 | `button b-icon icon` |
| `link` | 生成一个空 `<a>` | `button b-link link` |
| `text` | 生成一个空文本元件 | `skeleton sk-2 text` |
| `card` / `list` / `table` … | 生成对应的空元件 | `button toolbar card` |

`title` 这类**既是属性又是类名**的字同理：

```cui
skeleton sk-1 title      /* 对：类名写在元件同一行 */
```

一句话：**跟元件或属性同名的类，必须写在元件名那一行。**

其余类名（`accent` `pill` `zebra` `active` `vertical` `between`）单独一行没有问题，解析器会把它们并进父规则的选择器。

---

## 10. 诊断

编译结果里带 `diagnostics`，每条有文件位置和一句人话：

| 诊断 | 意思 |
| --- | --- |
| `「min-width」不是元件名也不是属性名，这一行已忽略` | 属性名写错，或该属性还没进 `props.ts` |
| `「button」重复定义` | 同身份（元件 + 类 + #id）写了两遍，后来者合并 |
| `一元运算符后面要跟值` 等 | 值写错了 |
| `未知的令牌「…」` | 颜色名不在 `TOKENS` 里 |

`examples/kitchen/preview.html` 的构建会打印 `N 条诊断`，目标是 **0**。

---

## 11. 与 Float Studio 的关系

Float Studio 是这套框架的一个宿主，不是另一套实现：

- `CuiPane.tsx` / `MiniPreview.tsx` 从 `@fangui/cui/sample` 取 `TOKEN_CSS` / `BASE_CSS`（这条 import 路径永远保持可用）
- `monaco.ts` 从 `@fangui/cui/props` 取 `ELEMENTS` / `PROPS` / `STATES` / `TOKENS` / `EVENTS`，并从 `@fangui/core` 的 `VARIANTS_OF` 补全变体
- 预览、导出、`.cui` 编译全部复用本仓库代码

所以框架的每一次改动都要保证上面这些 import 不变。

---

## 12. 构建

```bash
npm run typecheck        # tsc --noEmit
npm test                 # 自测（node 里跑，不需要浏览器）
npm run build:css        # dist/fangui.css + dist/fangui.min.css
npm run build:docs       # docs/components.md + docs/tokens.md
npm run build:showcase   # examples/kitchen/preview.html
npm run build            # 上面三件一起
npm run check            # typecheck + test + build
```

产物：

| 路径 | 是什么 |
| --- | --- |
| `dist/fangui.css` | 完整样式（令牌 + 重置 + 结构 + 组件），可直接 `<link>` |
| `dist/fangui.min.css` | 压过的版本 |
| `docs/components.md` | 组件目录（元件 / 变体 / 尺寸 / 属性 / 示例），生成 |
| `docs/tokens.md` | 令牌表（颜色 / 尺度 / 强调色 / 主题），生成 |
| `examples/kitchen/preview.html` | 离线陈列馆，单文件，内联 runtime |
| `examples/kitchen/shot/` | 陈列馆截图（亮色 + 暗色） |

`src/` 是 TypeScript 源码，使用方按需 `import`；不打包也能跑，因为整个框架只有 CSS 字符串和纯函数。

---

## 13. 迁移：旧 API 去哪了

`legacy/` 里的 `token()` / `new Button()`（Fluent 风格的旧 JS 实现）已经不在主路径上，保留只为兼容历史代码。新的写法：

| 旧 | 新 |
| --- | --- |
| `token('color.accent')` | CSS 里 `var(--accent)`，`.cui` 里 `color accent` |
| `setTheme('dark')` | `window` 上加 `theme dark`（或 `data-theme="dark"` / `.night`） |
| `new Button({...})` | `.cui` 里 `button …` / HTML 里 `<button data-t="button" class="accent">` |
| 手写组件样式 | 从令牌取，组件 CSS 里**零字面色值** |

判断标准很简单：任何组件样式里出现 `#` 开头的颜色，就是写错了。

