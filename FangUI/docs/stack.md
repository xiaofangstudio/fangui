# CUI + Copper：一套软件怎么由这两层拼起来

## 一句话

**CUI 就是 HTML + CSS 的合体**（声明式结构 + 样式 + 内置交互），**CO 就是逻辑层**。用户写的软件里只出现这两种语言：`.cui` 和 `.co`。

## 分工

| 层 | 管什么 | 不碰什么 |
| --- | --- | --- |
| `.cui`（CUI） | 结构、样式、内置交互（`when click` 那一组声明式动作） | 业务计算、循环、持久化 |
| `.co`（Copper） | 逻辑、状态、算法、文件 | 不直接改样式字面值，只通过 `page.*` 碰界面 |

两层的接缝只有三个东西：**`[data-t]` 元件选择器、类名、`#id`**。
`.cui` 编译出来的就是这三种坐标，Copper 的 `page.*` 认的也是这三种，所以不存在"翻译层"。

## Copper 能对界面做的全部动作

`page.read / write / add / remove / toggle / delete / clone / count / say / focus / go`

- `read(sel)` 输入框取值，其它元件取文字；`write(sel, v)` 反过来。
- `add / remove / toggle(sel, cls)` 改类——**所有"运行期状态"都走这条**。
- `delete(sel)` 删元素、`clone(sel, into)` 复制、`count(sel)` 数命中。
- `go(name)` 切 `view`，`say(msg)` 轻提示，`focus(sel)` 聚焦。

没有 `setAttribute`，这是有意的：属性是编译期的，运行期状态一律落成类，样式里用 `.on` / `.m-always` 这种类去接。

## 图标动画就是一个例子

静态写死在 `.cui` 里：

```cui
icon
    name "文件夹"
    motion hover      /* hover / always / still，编成 m-hover / m-always / m-still */
```

运行期由 Copper 改：

```co
fn 全部常驻(sel)
    page.add("icon toolbar", "m-always")
```

因为开关就是类，两边的语义完全对齐，不需要额外接口。

## 能拼出整套软件吗

元件库存按用途分好了组（见 `guide.md` 第 5 节）：

- 骨架：`window main header footer navigation aside section card grid view`
- 表单：`form field label input textarea dropdown option checkbox radio switch slider progress`
- 数据：`table row cell badge tag avatar icon image skeleton spinner code text`
- 浮层：`overlay modal drawer popover toast menu menuitem tooltip`
- 媒体与嵌入：`video audio frame`（`frame` 的 `doc` 直接写内联 HTML）

配合 `act` 的声明式动作（`go / open / close / add / toggle / theme / accent / copy / motion / call`）与 `act call` 到 Copper，
一个界面加一份 `.co` 就能覆盖：多页切换、表单收集、列表增删、菜单、主题、复制、播放控制、内嵌页面。

## 规模的几条硬规矩

1. **一个块 = 一个元素**。同元件同类的兄弟块各长各的，列表 / 表格行 / 图标墙不会被合并。
2. **样式规则可拆写**。同身份（元件 + 类 + #id）的多条规则合并，属性后者覆盖前者，不会多长元素。
3. **状态与事件规则不长元素**（`when hover` / `when click` / `+done`），可以放心堆。
4. **多页首屏是结构事实**：编译器给第一个 view 打 .active，非 .active 的页用 `!important` 藏起来——页自己的 layout 类抢不走可见性。`act go` 只改类。
5. **不写 HTML / CSS 字面量**。`.cui` 里只有 CUI 的词（元件、属性、令牌、函数）；没有 `raw`、没有 `css "…"` 逃生口。覆盖不到的能力由框架补属性，不交给用户改行。
6. **没有全局脚本**。`.cui` 里只有声明式动作，预览永远不会跑出死循环；真正的计算在 Copper 里。
7. **无极缩放靠 `zoom` + 相对单位**。`%` `vh` `vw` `rem` `em`、`clamp()` / `min()` / `max()` 原样透传；`zoom 1.25` 连字体和矢量图标一起连续缩放，不是断点跳变。

自测里有一条 400 块页面的用例（建树 + 渲染 + 用时 < 1s），以及“元件名唯一 / 属性名唯一 / 元件都进得了选择器”的契约体检，
防止后续加元件时把命名空间撞坏。

## 已知边界

- `frame` 的外部地址受浏览器同源策略约束；要内联内容就用 `doc`（写进 `srcdoc`）。
- 视频自动播放需要 `muted`，这是浏览器规则，不是框架限制。
- 图标动画是"两态交叉"（rest ↔ hover），不是逐数插值；要真补间得让 SVG 自带 SMIL 关键帧。


