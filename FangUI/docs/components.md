# FangUI 组件目录

> 本文件由 `npm run build:docs` 从 `src/cui/components.ts` 生成，别手改。
> 共 41 个元件，68 个词（含别名），187 个属性。

写法就一句：**元件名开头，类名跟在后面**。类名可以是变体、尺寸、语义色，顺序不限。

```
button primary accent
    text "保存"
```

尺寸只有三档：**s / m / l**（控件高 24 / 32 / 40）。变体只对"能点的元件"有意义，
容器类元件（card / section / grid）的类名是布局修饰。

## 通用工具类

`center` `middle` `between` `end` `wrap` `fill` `fit` `pill` `round` `nowrap` `mono` `muted` `strong` —— 不写属性也能对齐，见 `docs/guide.md`。

### 按钮

| 元件 | 说明 | 变体 / 尺寸（写在元件名后当类名） | 常用属性 |
| --- | --- | --- | --- |
| `button` | 按钮：默认标准款，accent 只放一个 | `accent` `standard` `subtle` `ghost` `outline` `danger` `link` `icon` `pill` `disabled` `loading` **s** **m** **l** | `text` `name` `value` `disabled` `animation` |
| `tab` | 页签：放在 tabs 里，配 act go 切页 | `active` `disabled` | `text` `name` |
| `menuitem` | 菜单项：放在 menu 里，danger 标红 | `danger` `disabled` | `text` `disabled` |
| `link` | 超链接：走 href，muted 弱化 | `muted` | `href` `target` `text` |

**button**

```
button primary
    text "保存"
    accent
```

**tab**

```
tab t1 active
    text "总览"
```

**menuitem**

```
menuitem m1
    text "删除"
    danger
```

**link**

```
link docs
    text "文档"
    href "https://…"
```

### 输入

| 元件 | 说明 | 变体 / 尺寸（写在元件名后当类名） | 常用属性 |
| --- | --- | --- | --- |
| `input` | 单行输入框：focus 有下沿强调线，err 标红 | `err` `bare` `search` `disabled` **s** **m** **l** | `hint` `value` `type` `name` `readonly` `required` `disabled` `autofocus` |
| `textarea` | 多行输入框：可拖拽改高 | `disabled` | `hint` `value` `rows` `cols` `name` `readonly` |

**input**

```
input name
    hint "项目名…"
    width fill
```

**textarea**

```
textarea note
    hint "写点什么…"
    rows 4
```

### 选择

| 元件 | 说明 | 变体 / 尺寸（写在元件名后当类名） | 常用属性 |
| --- | --- | --- | --- |
| `checkbox` | 复选框：自绘方块，focus 有环 | `l` `disabled` | `name` `checked` `value` `disabled` |
| `radio` | 单选框：同名一组互斥 | `l` `disabled` | `name` `checked` `value` `disabled` |
| `switch` | 开关：默认关，加 checked 打开 | `s` `l` `disabled` | `name` `checked` `disabled` |
| `slider` | 滑杆：范围取值 | `disabled` | `value` `min` `max` `step` `name` |
| `dropdown` | 下拉选择：option 装在里面 | `s` `l` `disabled` | `name` `multiple` `value` |

**checkbox**

```
checkbox agree
    name agree
    checked
```

**radio**

```
radio size-m
    name size
    checked
```

**switch**

```
switch notify
    checked
```

**slider**

```
slider volume
    min 0
    max 100
    value 60
```

**dropdown**

```
dropdown kind
    option a
        text "卡片"
        selected
```

### 容器

| 元件 | 说明 | 变体 / 尺寸（写在元件名后当类名） | 常用属性 |
| --- | --- | --- | --- |
| `form` | 表单容器：when submit 收整张表 | — | `name` |
| `field` | 字段（标签 + 控件），inline 横排 | `inline` | — |
| `card` | 卡片：分层靠发丝边，浮起才用阴影 | `flat` `raised` `sunken` `interactive` | `padding` `radius` `background` |
| `section` | 带标题的内容分区 | `pad` `gap` | — |
| `grid` | 网格：默认自动等分，fit 收紧最后一列 | `fit` `tight` | `columns` `gap` `auto rows` |
| `toolbar` | 工具条：横排、可换行 | `between` | `gap` `wrap` |
| `list` | 列表容器，divided 出分隔线 | `divided` | — |
| `item` | 列表项：可选中、可交互 | `selected` `interactive` `dense` | — |
| `divider` | 分割线：vertical 竖排版本 | `vertical` | — |

**form**

```
form profile
    when submit
        act say "已提交"
```

**field**

```
field name
    label
        text "项目名"
    input
        hint "…"
```

**card**

```
card stat raised
    heading
        text "本周新增"
```

**section**

```
section body
    gap
```

**grid**

```
grid cards
    columns repeat(3, 1fr)
    gap 12
```

**toolbar**

```
toolbar actions
    between
```

**list**

```
list rows
    divided
```

**item**

```
item row-a
    interactive
```

**divider**

```
divider
```

### 数据展示

| 元件 | 说明 | 变体 / 尺寸（写在元件名后当类名） | 常用属性 |
| --- | --- | --- | --- |
| `table` | 表格：里面用 row / cell / heading，自动变 tr / td / th | `zebra` `bordered` `compact` | `width` |
| `badge` | 徽标 / 计数：四种语义色 | `plain` `ok` `warn` `err` `info` `l` | `text` |
| `tag` | 标签：筛选条件、分类 | `accent` `pill` | `text` |
| `avatar` | 头像：圆形，可装图片 | `s` `l` `round` `ring` | `text` |
| `icon` | 内置图标：text / name 写图标名 | — | `text` `name` `color` `size` |
| `progress` | 进度条：value 0~100 | `l` `ok` `err` | `value` `max` |
| `spinner` | 加载指示 | `s` `l` | — |
| `skeleton` | 骨架占位：加载中的灰条 | `text` `title` `block` `circle` | `width` `height` |

**table**

```
table data
    zebra
```

**badge**

```
badge n
    text "3"
```

**tag**

```
tag t
    text "设计"
    accent
```

**avatar**

```
avatar me
    text "方"
    ring
```

**icon**

```
icon gear
    text "settings"
    size 16
```

**progress**

```
progress bar
    value 60
```

**spinner**

```
spinner
```

**skeleton**

```
skeleton title
```

### 反馈

| 元件 | 说明 | 变体 / 尺寸（写在元件名后当类名） | 常用属性 |
| --- | --- | --- | --- |
| `alert` | 提示横幅：info / ok / warn / err | `info` `ok` `warn` `err` `banner` | — |
| `empty` | 空状态：图标 + 一句话 | — | — |
| `toast` | 轻提示：act open 显示，4 秒自动走 | `ok` `err` `sticky` | — |
| `tooltip` | 悬停提示：贴在父元素上 | `below` | `text` |

**alert**

```
alert tooltip ok
    icon
        text "success"
    text "已完成"
```

**empty**

```
empty none
    icon
        text "folder"
    text "还没有内容"
```

**toast**

```
toast saved
    text "已保存"
    ok
```

**tooltip**

```
button help
    text "?"
    tooltip
        text "快捷键 Ctrl+S"
```

### 浮层

| 元件 | 说明 | 变体 / 尺寸（写在元件名后当类名） | 常用属性 |
| --- | --- | --- | --- |
| `overlay` | 遮罩层：open 打开，点空白处关闭 | `top` | — |
| `modal` | 对话框面板：Esc 关，Tab 在内部循环 | `s` `l` `plain` | — |
| `drawer` | 抽屉：右滑入，left 从左滑入 | `left` | — |
| `popover` | 锚定浮层：比菜单自由，能装任意内容 | — | — |
| `menu` | 菜单：open 展开，自带 pop 动效 | `static` `open` | — |

**overlay**

```
overlay confirm
    modal
        …
```

**modal**

```
modal sheet
    heading
        text "确认删除？"
```

**drawer**

```
drawer detail
    heading
        text "详情"
```

**popover**

```
popover info
    text "更多说明"
```

**menu**

```
menu more
    menuitem m1
        text "重命名"
```

### 文本

| 元件 | 说明 | 变体 / 尺寸（写在元件名后当类名） | 常用属性 |
| --- | --- | --- | --- |
| `text` | 文本：muted / strong / mono / caption / lead | `muted` `strong` `mono` `caption` `lead` | `text` `size` `color` `weight` |
| `code` | 代码块：inline 退化成行内片段 | `inline` | `text` `name` |
| `heading` | 小标题：page / sub 两级 | `page` `sub` | `text` |
| `label` | 字段标签：req 自动加星号 | `req` `strong` | `text` |

**text**

```
text note
    text "改左边，右边立刻变"
    caption
```

**code**

```
code sample
    text "setTheme('dark')"
    inline
```

**heading**

```
heading h
    text "本周概览"
    page
```

**label**

```
label l
    text "邮箱"
    req
```

## 状态与事件

| `when` 状态 | 意思 |
| --- | --- |
| `hover` | 鼠标悬停 |
| `pressed` | 按下 |
| `disabled` | 禁用 |
| `focus` | 获得焦点 |
| `focus visible` | 键盘聚焦（只在键盘操作时出环） |
| `focus within` | 内部元素获得焦点 |
| `checked` | 已勾选 |
| `selected` | 选中（.selected 类） |
| `active` | 当前项（.active 类，页签 / 分页） |
| `open` | 已展开（.open 类，弹层 / 菜单） |
| `loading` | 加载中（.loading 类） |
| `empty` | 空元素 |
| `even` | 偶数项 |
| `odd` | 奇数项 |
| `first` | 第一项 |
| `last` | 最后一项 |
| `only` | 独生子 |
| `before` | 伪元素：元素前面 |
| `after` | 伪元素：元素后面 |
| `placeholder` | 占位文字 |
| `narrow` | 窄屏（≤ 720px） |
| `wide` | 宽屏（> 720px） |

| `when` 事件 | 触发时机 |
| --- | --- |
| `click` | 点击时 |
| `input` | 输入时 |
| `change` | 值改变时 |
| `submit` | 提交时 |
| `enter` | 输入框里按回车时 |

## 动作（`act`）

| 动作 | 写法 | 作用 |
| --- | --- | --- |
| `add` | `act add active` | 给被点元素（或 `on 选择器` 指定的）加类 |
| `remove` | `act remove open on overlay confirm` | 去掉类 |
| `toggle` | `act toggle open on menu` | 来回切 |
| `text` | `act text note "已保存"` | 改文字 / 改表单值 |
| `say` | `act say "完成"` | 交给宿主弹提示 |
| `go` | `act go #settings` | 切页（view） |
| `call` | `act call save` | 调 `app/*.co` 里的 Copper 函数 |
| `theme` | `act theme dark` | 换亮 / 暗主题 |
| `accent` | `act accent blue` | 换强调色（green / blue / violet / amber / rose） |
| `open` | `act open` / `act open on drawer info` | 打开浮层（遮罩 / 抽屉 / 菜单 / 轻提示） |
| `close` | `act close` | 关掉最近的浮层（Esc 也会做同一件事） |
| `copy` | `act copy "文字"` | 复制到剪贴板 |
