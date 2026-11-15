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

/** 预览 iframe 的基础样式：把浏览器默认外观抹平，让 .cui 说了算 */
export const BASE_CSS = `
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body {
  font-family: "Microsoft YaHei", "PingFang SC", system-ui, sans-serif;
  font-size: 13px; line-height: 1.6;
  background: var(--canvas); color: var(--ink);
  -webkit-font-smoothing: antialiased;
}
[data-t="window"] { display: block; min-height: 100%; overflow: auto; }
[data-t="box"] { display: block; }
[data-t="row"] { display: flex; }
[data-t="column"] { display: flex; flex-direction: column; }
[data-t="text"] { display: block; }
[data-t="button"] {
  display: inline-flex; align-items: center; justify-content: center;
  border: 0; background: var(--wash); color: inherit; font: inherit;
  cursor: pointer; padding: 6px 14px; border-radius: 4px;
}
[data-t="input"] {
  display: block; border: 0; outline: 0;
  background: var(--card); color: inherit; font: inherit;
  padding: 6px 10px; border-radius: 4px;
}
[data-t="textarea"] { display: block; border: 0; outline: 0; resize: vertical; font: inherit; padding: 8px; }
[data-t="image"] { display: block; max-width: 100%; }
[data-t="list"] { display: block; margin: 0; padding: 0; }
[data-t="item"] { display: block; }
[data-t="checkbox"], [data-t="radio"] { accent-color: var(--primary); }
[data-t="progress"] { display: block; height: 6px; border-radius: 3px; background: var(--sunken); }
[data-t="scroll"] { display: block; overflow: auto; }
[data-t="spacer"] { display: block; flex: 1; }
`;

/** 预览 iframe 里注入的主题令牌（浅色档，与 styles.css 保持一致）。
 *  变量名就是完整词；旧字母令牌由编译层归一化成完整词，不在这里出现。 */
export const TOKEN_CSS = `
:root {
  --canvas: #f7f7f7; --surface: #fbfbfb; --card: #ffffff; --wash: #f3f3f3; --sunken: #e9e9e9;
  --hairline: #f0f0f0; --line: #e4e4e4; --edge: #d0d0d0;
  --ink: #171717; --soft: #4a4a4a; --faint: #7a7a7a; --ghost: #a9a9a9;
  --accent: #0d8a4c; --primary: #0f9d58; --tint: #e8f7ee; --tone: #cdeed9;
  --sem-ok: #1a7f47; --sem-err: #b42318; --sem-warn: #8a5a00; --sem-info: #0f9d58;
  --cui-dur: 160ms;
}
`;
