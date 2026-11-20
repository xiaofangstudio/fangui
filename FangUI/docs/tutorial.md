# CUI 教程：从一块界面到一整套软件

> 只写 `.cui` 和 `.co`。CUI 负责结构、样式、声明式交互；CO 负责计算和状态。
> 这里每一节都能直接粘进 `app/main.cui` 跑起来。

---

## 1. 第一屏：窗口、卡片、按钮

```cui
window app
    layout column
    gap 16
    padding 24
    background canvas

    card hello
        layout column
        gap 8
        padding 20
        heading
            text "你好，CUI"
        text
            text "这一屏没有一行 HTML，也没有一行 CSS。"
            color faint
        button go
            accent
            text "开始"
```

- `window` 是根容器，`theme light` / `theme dark` 写在它上面。
- 缩进就是父子关系：`card` 在 `window` 里，`heading` 在 `card` 里。
- 样式属性一行一条：`layout column`、`gap 16`、`padding 24`，数字默认是 px。

---

## 2. 布局：三种就够用

```cui
row toolbar
    layout row
    align center
    gap 8

    button a
        text "左"
    spacer spring          /* 把后面的推到最右 */
    button b
        text "右"
```

- `layout row` / `layout column` / `layout grid`；
- `justify between` / `align center` / `align stretch`；
- `fill` 撑满父容器，`fit` 贴内容；
- 栅格：`grid` + `columns 3` + `gap 12`，三列等分。

栅格不需要算百分比，也不会有"最后一行对不齐"的问题：列宽由 `repeat(n, 1fr)` 均分，间隙由 `gap` 统一扣。

---

## 3. 样式：令牌优先，函数补细节

颜色、间距、圆角优先用令牌，主题一换整屏跟着换：

```cui
card panel
    background card
    radius l
    padding 18
    shadow 0 12 32 mix(black, transparent, 16)
```

常用函数：

| 写法 | 效果 |
| --- | --- |
| `gradient 135 accent primary` | 斜向渐变 |
| `radial accent transparent` | 径向渐变 |
| `mix(black, transparent, 20)` | 混色 |
| `alpha(accent, 0.12)` | 透明度 |
| `clamp(180px, 22vw, 280px)` | 连续伸缩宽度 |
| `calc(100% - 32px)` | 计算 |

裁剪、遮罩、滤镜也都是 CUI 的词：

```cui
hero band
    background gradient(120deg, accent, primary)
    clip circle(50%)
    mask gradient(90deg, black, transparent)
    blur 6
    saturate 140
```

`blur` / `grayscale` / `saturate` / `contrast` / `brightness` / `hue` 写几条会合成一条滤镜，不会互相覆盖。

---

## 4. 颜色变量：`col`

同一个颜色要在几十个地方用，就声明一次：

```cui
col brand #2563eb
col brand-weak #2563eb22
col surface #f8fafc

window app
    background surface
    button primary
        background brand
        color #ffffff
    badge soft
        background brand-weak
        color brand
```

规则：

- 只接受十六进制（`#rgb` / `#rgba` / `#rrggbb` / `#rrggbbaa`），写 `red` 这种名字会报错；
- **不能做加减乘除**：`brand + 10` 是非法写法，编译器直接拒绝；
- **可以相等比较**，比较发生在 CO 里：`if theme_color == brand` 这类判断由逻辑层做，CUI 只负责"这个颜色叫什么"；
- 和主题令牌同名时（比如 `wash`），`col` 声明优先，不会被主题抢走；
- 编译产物是 `:root { --col-brand: #2563eb; }`，引用处是 `var(--col-brand)`，所以换色只改一行。

---

## 5. 图标：盒装，永远对齐

```cui
button save
    layout row
    align center
    gap 6
    icon folder
        name "文件夹"
        motion hover
        width 18
        height 18
    text "保存"
```

- `name` 写 Kubai 图标名，配 `motion hover / always / still`；
- 图标是"固定尺寸的盒子 + 居中的画"：`inline-flex` + `align-items:center` + `justify-content:center`，`vertical-align: middle`、`line-height: 0`；
- 因此不会出现 CSS 里那种"SVG 基线留白，怎么调都差 1px"的问题——盒子对齐的是几何中心，不是字体基线；
- 矢量图放大到任意倍率都不糊，配 `zoom` 一起缩放。

---

## 6. 多页：`view` + `act go`

```cui
window app
    layout column

    tabs navigation
        tab home
            text "首页"
        tab settings
            text "设置"

    main body
        view overview
            text
                text "首页内容"
        view settings
            text
                text "设置内容"

tab home when click
    act go overview
tab settings when click
    act go settings
```

- 第一页自动就是 `active`，不需要手写；
- 非当前页由框架隐藏，不会三页一起铺出来；
- `act go` 的名字带不带 `#` 都行。

---

## 7. 交互与 CO：一条线

```cui
button add when click
    act call add_item

input title when enter
    act call submit_title
```

`act call` 把**触发元素**作为第二个参数交给 CO，CO 里直接读 `value` / `checked`，不用再按 id 找一次 DOM。

CO 改界面只走三样坐标：`[data-t]` 元件、类名、`#id`。所以 CUI 和 CO 之间没有翻译层。

常见配方：

```cui
overlay confirm
    modal box
        heading
            text "删除？"
        toolbar
            button cancel
                text "取消"
            button ok
                danger
                text "删除"

button open when click
    act open on overlay confirm
button cancel when click
    act close
```

---

## 8. 自适应与无极缩放

```cui
aside panel
    width clamp(200px, 24vw, 300px)

window app
    zoom 1.15          /* 整屏连续放大，含字体和图标 */

text hint
    narrow
        size 12        /* 窄屏单独改一条 */
```

- 断点负责"换布局"：`narrow`（≤720px）/ `wide`；
- `zoom` 和 `clamp()` 负责"同布局连续伸缩"；
- `%` `vh` `vw` `rem` `em` 都能直接写。

---

## 9. 自定义动画：`motion`

顶层写 `motion 名字`，里面按 `from` / `step 50` / `to` 分关键帧，帧里的属性再缩进一层。CUI 源码里不写 `@`。

```
motion rise
    from
        opacity 0
        move 0 10
    step 60
        opacity .9
    to
        opacity 1
        move 0 0

card panel
    animation rise 320
```

- 名字用完整单词，字母开头；不能叫 `none`，也不能和 `col` 变量同名。
- 时长裸数字自动补 `ms`：`320` 就是 `320ms`。
- 帧里只写能插值的属性：`opacity`、`move`、`scale`、`rotate`、`blur`、颜色、背景等。
- 系统开启「减少动态效果」时，整套动画会自动降级。
## 10. 常用效果配方

### 玻璃卡片

```cui
card glass
    background mix(card, transparent, 70)
    backdrop blur(14)
    border 1 hairline
    radius l
    shadow 0 18 40 mix(black, transparent, 18)
```

### 强调条

```cui
alert tooltip
    layout row
    gap 10
    padding 12
    background alpha(accent, 0.08)
    border 1 hairline
    radius m
    mark dot
        text " "
```

### 数据表

```cui
table grid
    row head
        cell
            text "名称"
        cell
            text "状态"
    row r1
        cell
            text "app.cui"
        cell
            badge ok
                text "完成"
```

### 轻提示

```cui
toast saved
    icon ok
        text "success"
    text
        text "已保存"

button save when click
    act open on toast saved
```

---

## 11. 写 `.cui` 的几条硬规矩

1. 一个块 = 一个元素；同元件同类的兄弟不会合并。
2. 状态规则（`when hover` / `+done` / `when click`）不长元素，可以放心堆。
3. 类名和元件/属性同名时，必须写在元件那一行。
4. 用完整英文单词，不用缩写：`key` 不是 `kbd`，`italic` 不是 `em`。
5. `.cui` 里不写 HTML 标签、不写 CSS 声明字面量；缺什么能力，就是框架要补的词。
6. 逻辑只在 CO 里；CUI 的动作全是声明式的，预览不会跑出死循环。
