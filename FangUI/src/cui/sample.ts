/* 预览面板的内建示例。
 *
 * v3：词表全部用完整短词（button / background / padding …），
 * 结构由规则自己长出来：每一条元素规则生成一个元件，缩进就是层级。
 */

/** 右侧编辑器里的初始 .cui 文本 */
export const DEFAULT_CUI = `/* Float Studio · Copper UI 示例
/* 一条规则 = 一个元件：元件名开头，缩进就是层级
/* 注释跟 Copper 一样：/* 到行尾，不用闭合

window
    background canvas
    layout column
    padding 24
    gap 16

    box panel
        width 460
        background card
        radius 12
        padding 20
        border 1 line
        layout column
        gap 10
        shadow 0 6 20 0 line

        row brand
            gap 10
            layout row
            align center

            image logo
                source "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M12 2 L22 20 L2 20 Z' fill='%230d8a4c'/></svg>"
                width 28
                height 28
                fit contain

            text title
                text "Copper UI"
                size 22
                weight bold
                color ink

            text hint
                text "规则就是结构，缩进就是层级"
                size 13
                color faint

        row actions
            gap 8
            layout row

            button primary
                text "开始"
                background accent
                color card
                radius 7
                padding 8 18
                size 13
                weight medium
                transition background

            button ghost
                text "取消"
                background wash
                color soft
                radius 7
                padding 8 18
                size 13

        input name
            hint "输入点什么…"
            width fill
            background card
            border 1 edge
            radius 7
            padding 9 11
            size 13

        text tip
            text "改右边，左边立刻变"
            size 12
            color ghost

        text note
            text "点一下「开始」，我会变"
            size 12
            color accent

/* ── 状态规则不建元素，只描述"已经在的元素"什么时候长什么样 ── */

button primary when hover
    background primary

/* when click：点一下真的会发生事。act 是动作，不是脚本，所以预览里跑不炸 */
button primary when click
    act toggle done
    act text note "点到了 —— Copper UI 会动"

/* +done 是运行时才加上的类，写规则时用 + 标出来 */
button primary +done
    background tint
    color accent

button ghost when hover
    background sunken

input name when focus
    border 1 accent
`;
/* 基础样式与令牌表已搬到 src/styles 与 src/theme。
 * 这里只留一个转发，老宿主（IDE 预览、教程、AOT）照旧 import 这两个名字即可。 */
export { BASE_CSS, TOKEN_CSS } from '../styles/index';
