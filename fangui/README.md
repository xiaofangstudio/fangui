# FangUI

FangUI 是 Copper 的开发框架：**Copper UI（.cui）管界面，Copper（.co）管逻辑与后端**。它不依赖任何编辑器，可以单独用、单独测、单独编译产物。

## 目录

```
FangUI/
  src/
    theme/      设计令牌：尺度 + 亮暗主题 + 五套强调色 → CSS 变量
    styles/     基础样式与组件层：重置、结构、41 个元件、动效
    cui/        Copper UI：parser → compile（CSS + 行为表）→ tree（DOM）+ runtime
    lang/       Copper 语言：token → parse → sema → codegen / interp / stdlib
    core/       AOT：把界面 + 前端逻辑 + srv 后端打成一个软件
    host.ts     宿主适配（读文件）
    index.ts    公共入口
  scripts/      build:css / build:docs / build:showcase
  docs/         guide.md（指南）+ components.md / tokens.md（生成）
  dist/         fangui.css / fangui.min.css（构建产物）
  rust/
    float-lang/       Copper 内核（Rust 权威实现：执行、检查、CUI 编译）
    float-launcher/   产物启动器：本地服务 + WebView2，跑 srv 后端
  tests/smoke.ts      框架自测（node 里跑，不需要 IDE）
  examples/kitchen/   组件陈列馆（单文件预览，亮色 + 暗色）
  examples/hello/     最小工程示例（.cui + .co）
  legacy/             旧的占位包（已被 src/ 取代）
```

## 两条分层

| 层 | 写什么 | 谁执行 |
| --- | --- | --- |
| 前端 | `app/*.cui` 界面 + `app/*.co` 逻辑 | 页面里的 Copper 引擎（`core/cui-engine.ts`） |
| 后端 | `srv/*.co` | 启动器里的 Rust 内核 |

界面和逻辑之间只有两根线：

- `.cui` 的 `when click` + `act call 函数名` → 调 `app/*.co`
- `.co` 的 `page.read / write / add / ...` → 操作 `.cui` 编出来的 DOM

前后端之间只有一根线：`.co` 里 `srv.call("函数名", 参数)`。

## 令牌与组件层

框架的视觉能力分三层，上层只读下层：

| 层 | 位置 | 内容 |
| --- | --- | --- |
| 令牌 | `src/theme/` | 间距 / 圆角 / 字号 / 控件高 / 图标 / 动效 / 层级，亮暗两套主题、五套强调色；`themeCss()` 生成 `--*` 变量表 |
| 样式 | `src/styles/` | 重置、结构（window / card / grid / toolbar…）、41 个元件（七变体 × 三尺寸 × 状态）、动效；**零字面色值**，全部走 `var()` / `color-mix` |
| CUI | `src/cui/` | `.cui` 解析、编译成 CSS、长成 DOM、声明式行为 + 运行时（浮层、页签、键盘循环、toast） |

```cui
button save accent
    text "保存"
```

按钮七变体：`accent / standard / subtle / outline / danger / link / icon`；三档尺寸 `s / m / l`（24 / 32 / 40）；状态 `disabled / loading / active`。换主题、换强调色不用改界面——颜色全部从令牌取。

完整清单：

- [`docs/guide.md`](docs/guide.md)：快速上手、令牌用法、变体约定、交互写法、命名规则、构建产物
- [`docs/components.md`](docs/components.md)：41 个元件 + 变体 + 属性 + 示例（生成）
- [`docs/tokens.md`](docs/tokens.md)：颜色 / 尺度 / 强调色 / 主题表（生成）

## 宿主注入

框架不认环境。使用方启动时注入：

```ts
import { setFangHost } from '@fangui/host';
import { setAotHost } from '@fangui/core/aot';

setFangHost({ readText: (p) => fs.readFile(p, 'utf8') });
setAotHost({
  mkdir: (p) => fs.mkdir(p, { recursive: true }).then(() => {}),
  writeFile: (p, t) => fs.writeFile(p, t, 'utf8'),
  writeLauncher: async (p) => { /* 复制内置启动器 */ return 0; }
});
```

不注入也能用语言和 CUI 编译；只有 `import`、AOT 这类需要磁盘的能力会给出明确提示。

## 自测与构建

```bash
npm i
npm run typecheck        # tsc --noEmit
npm test                 # 自测（node 里跑）
npm run build            # = build:css + build:docs + build:showcase
npm run check            # typecheck + test + build
```

| 命令 | 产物 |
| --- | --- |
| `npm run build:css` | `dist/fangui.css`（48 KB）+ `dist/fangui.min.css`（39 KB） |
| `npm run build:docs` | `docs/components.md` + `docs/tokens.md` |
| `npm run build:showcase` | `examples/kitchen/preview.html`（单文件、离线可开） |

`dist/` 与生成文档由构建产生，不手改；根 `.gitignore` 里 `dist/` 默认不提交。

Float Studio 就是这套框架的一个宿主：它注入 Tauri 的文件能力，其余全部复用这里。它从 `@fangui/cui/sample` 取 `TOKEN_CSS` / `BASE_CSS`，从 `@fangui/cui/props` 取补全词表——这两条 import 路径不会变。
