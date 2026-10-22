# 🧩 fangUI

> 小方工作室出品 ｜ Fangwork 生态统一界面层 ｜ MIT

**一套令牌，三种风格，无限主题色。**

Fangwork 全家桶（FangBox、Reelix、Strata、Chit…）的界面都从这套令牌长出来。桌面应用用 Tauri 内嵌 webview 渲染，网页也能直接用——反正最后都是 CSS + JS。

---

## 🚨 先看这一条

| 你可能想问 | 答案 |
| --- | --- |
| 三个 UI 是哪三个？ | **Flat 扁平 / Neu 轻拟物 / Liquid 液态玻璃**，根元素一个 `data-ui` 属性随时切 |
| 轻拟物和拟物是一回事吗？ | **不是。** 只做「柔」，不做塑料感；轻拟物还分实底和玻璃两个子模式 |
| 主题色能有多少个？ | **无限。** 只存 HSL 三个原值，所有强调色实时推导，改色一行 JS |
| 亮色暗色怎么切？ | `data-mode` 一改就切：**亮 / 暗 / 自然**（暖调纸感护眼） |
| 颜色会不会扎眼？ | 不会。铁律：**不用 #FFFFFF 和 #000000**，界面差异化只走 3% / 5% 明度微差 |
| 是网页框架吗？ | 不是，是**给应用内嵌用的界面层**；应用恰好用 web 技术渲染而已 |
| 自带 AI 吗？ | 带的是**AI 协作交互**：没选风格时主动提问、两种风格并排对比——不接大模型 |

---

## ✨ 三个风格

### 1️⃣ Flat 扁平

FangBox 同款。没有阴影没有渐变，层级全靠 3% / 5% 明度微差加一条 1px 线。安静、耐看、长时间盯着不累。

### 2️⃣ Neu 轻拟物（Neumorphism）

是轻拟物，**不是拟物**——不做木纹皮革塑料，只做「柔」的凸起。

| 子模式 | 说明 |
| --- | --- |
| `data-neu="solid"` 普通轻拟物 | 双阴影营造凸起：亮影在左上、暗影在右下；按钮按下整个凹陷进去 |
| `data-neu="glass"` 玻璃轻拟物 | 全员半透明，像磨砂玻璃在凸起 |

**玻璃的难点（着重说）**：半透明会透露出底下的阴影，一透就脏。fangUI 的解法——阴影一律走**外圈 drop-shadow**（不画在元素底下），凸起感改由**内侧 1px 高光描边**承担。玻璃亮、投影轻、棱边利，三个各管各的。

### 3️⃣ Liquid 液态玻璃

直接整合小方工作室的 [liquid-glass-web](https://github.com/xiaofangstudio/liquid-glass-web) 引擎：WebGL 折射 + SDF 圆角 + 高光流动，CSS 侧做面板结构和可读性兜底。

移动端走**白名单**：只有带 `data-liquid` 属性的元素开液态玻璃，其余回退磨砂——性能铁律。

---

## 🎁 通用件（三风格共享）

### 动效（fangui-motion.js）

| API | 效果 |
| --- | --- |
| `FangUI.motion.blurIn(el)` | **进场去模糊**：blur(14px) → 清晰，140ms，快到肉眼基本看不出来——但少了就差那么点感觉 |
| `FangUI.motion.typewriter(el)` | 打字机逐字浮现，自带闪烁光标 |
| `FangUI.motion.bounce(el)` | 弹跳入场（Web Animations API） |
| `FangUI.motion.distribute(box)` | UI 排布均匀：子项等分主轴间距 |
| `FangUI.motion.blur(el, px)` | 高质量模糊：backdrop 级，模糊背后内容，不动布局 |
| `FangUI.BEZIER` | 贝塞尔缓动预设表：out / inOut / spring / bouncy / smooth / snap |

### AI 协作（fangui-ai.js）

| API | 说明 |
| --- | --- |
| `FangUI.ai.promptStyle(host)` | 用户只上传了东西、没选风格？**主动提问**，弹点选选项卡，四个风格各配一句人话介绍——不猜、不默认 |
| `FangUI.ai.compare(host, opts)` | **风格对比**：同一组组件左右并排渲染两种风格，点哪边用哪边 |
| `FangUI.ai.mode() / setMode()` | 读 / 写当前风格，自动记住 |

### 主题色与模式（fangui.js）

```js
FangUI.accent(200, 72, 55);      // HSL 三值，无限主题色
FangUI.accent("#6fc0ff");        // 任意颜色自动转 HSL
FangUI.preset("sakura");         // 预设：ocean sakura forest sunset violet mono
FangUI.setMode("dark");          // light / dark / natural
```

全部自动记忆，下次打开还是你的配色。

---

## 🚀 用起来

```html
<link rel="stylesheet" href="src/core/tokens.css">
<link rel="stylesheet" href="src/core/flat.css">
<link rel="stylesheet" href="src/core/neu.css">
<link rel="stylesheet" href="src/core/liquid.css">

<script src="src/fangui.js"></script>
<script src="src/motion/fangui-motion.js"></script>
<script src="src/ai/fangui-ai.js"></script>
```

```html
<html data-ui="flat" data-mode="light">
  <button class="fu-btn fu-btn--accent">就能用了</button>
</html>
```

本地看效果：直接开 `demo/index.html`（ES module 需要起个静态服务，`npx serve` 即可）。

**组件类名约定**：`fu-card` `fu-panel` `fu-btn` `fu-input` `fu-switch` `fu-progress`——三个风格消费同一套类名，换风格零改 HTML。

---

## 🗂️ 目录结构

```
fangui/
├── src/
│   ├── core/
│   │   ├── tokens.css       核心令牌：HSL 主题色 + 三模式 + 3%/5% 尺度
│   │   ├── flat.css         Flat 扁平
│   │   ├── neu.css          Neu 轻拟物（实底 + 玻璃两个子模式）
│   │   └── liquid.css       Liquid 液态玻璃
│   ├── liquid/
│   │   └── liquid-glass-core.js   液态玻璃引擎（来自 liquid-glass-web）
│   ├── motion/
│   │   └── fangui-motion.js 打字机 / 去模糊 / 弹跳 / 均匀排布 / 贝塞尔
│   ├── ai/
│   │   └── fangui-ai.js     主动提问 / 风格对比
│   └── fangui.js            主题色 API + 模式切换 + 引擎接线 + 自动记忆
└── demo/
    └── index.html           三风格 × 三模式 × 主题色盘现场演示
```

---

## 📜 许可

MIT · 小方工作室出品。全中文界面，Fangwork 生态统一界面层，慢慢来，比较快。
