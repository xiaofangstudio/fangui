/* FangUI 框架自测：不依赖 IDE，node 里直接跑。
 * 覆盖 CUI 的解析/编译、本轮扩展（网格、渐变、伪元素、断点、组合符）。 */

import { readFileSync } from 'node:fs';
import { compileCui } from '../src/cui/compile';
import { parseCui } from '../src/cui/parser';
import { buildCuiTree, renderCuiHtml, renderCuiTree } from '../src/cui/tree';
import { ICON_NAMES, iconSvg } from '../src/cui/icons';
import { BASE_CSS, TOKEN_CSS } from '../src/cui/sample';
import { ALL_ELEMENT_WORDS, ELEMENTS, PROPS } from '../src/cui/props';
import { ACCENTS, SCALE, THEMES, TOKEN_NAMES } from '../src/theme/tokens';
import { themeCss } from '../src/theme/css';
import { COMPONENTS } from '../src/cui/components';

const src = `box panel
    columns repeat(3, 1fr)
    gap row 12
    aspect 16 9
    cursor pointer
    filter blur(4px) brightness(1.2)
    background gradient(90, accent, primary)
    text transform upper
    white space nowrap
    shadow(0, 2, 8, 0, ghost)

box panel when narrow
    columns repeat(1, 1fr)

box panel when before
    content "→"
    color accent

box child text
    color ink

row next text
    size 12
`;

const r = compileCui(src);
let bad = 0;

function ok(name: string, cond: boolean): void {
  if (cond) {
    console.log('PASS', name);
  } else {
    bad++;
    console.log('FAIL', name);
  }
}

ok('无诊断', r.diags.length === 0);
ok('有产出规则', r.ruleCount >= 4);
ok('网格列', r.css.includes('grid-template-columns: repeat(3, 1fr)'));
ok('行间距', r.css.includes('row-gap: 12px'));
ok('宽高比', r.css.includes('aspect-ratio: 16 / 9'));
ok('光标', r.css.includes('cursor: pointer'));
ok('滤镜链', r.css.includes('filter: blur(4px) brightness(1.2)'));
ok('渐变函数', r.css.includes('linear-gradient(90deg, var(--accent), var(--primary))'));
ok('大小写', r.css.includes('text-transform: uppercase'));
ok('不换行', r.css.includes('white-space: nowrap'));
ok('阴影函数', r.css.includes('box-shadow: 0px 2px 8px 0px var(--ghost)'));
ok('伪元素', r.css.includes('::before') && r.css.includes('content: "→"'));
ok('窄屏断点', r.css.includes('@media (max-width: 720px)'));
ok('子代组合符', r.css.includes('[data-t="box"] > [data-t="text"]'));
ok('相邻兄弟', r.css.includes('[data-t="row"] + [data-t="text"]'));

/* ── 示例应用：一个完整应用只用一个 .cui 文件写出来 ── */
const appSrc = readFileSync(new URL('../examples/desk/app/main.cui', import.meta.url), 'utf8');
const app = compileCui(appSrc);
if (app.diags.length > 0) console.log(app.diags.slice(0, 6));
ok('示例应用无诊断', app.diags.length === 0);
ok('示例应用有产出', app.ruleCount >= 40);

const appHtml = renderCuiTree(buildCuiTree(parseCui(appSrc)));
ok('多页容器', appHtml.includes('data-view="tasks"') && appHtml.includes('data-view="report"'));
ok('表格真标签', appHtml.includes('<table') && appHtml.includes('<tr') && appHtml.includes('<td'));
ok('下拉与开关', appHtml.includes('<select') && appHtml.includes('role="switch"'));
ok('图标标记', appHtml.includes('data-icon="grid"') && appHtml.includes('data-icon="plus"'));
ok('按钮文字与图标共存', /<button[^>]*>新建任务<span/.test(appHtml));
ok('表单属性落 DOM', appHtml.includes('value="小方"') && appHtml.includes('checked="checked"'));
ok('切页行为', app.behaviors.some((b) => b.action.kind === 'go' && b.action.arg === '#tasks'));
ok('开关类行为', app.behaviors.some((b) => b.action.kind === 'add' && b.action.arg === 'open'));

/* ── 内置图标：Fluent 规格（24 网格 / 1.5 描边 / currentColor） ── */
ok('图标规模', ICON_NAMES.length >= 60);
ok('图标规格', iconSvg('settings').includes('stroke-width="1.5"') && iconSvg('settings').includes('currentColor'));
ok('图标未知名不破图', iconSvg('不存在的图标') === '');
ok('示例应用图标都能解析', iconSvg('grid') !== '' && iconSvg('plus') !== '' && iconSvg('info') !== '');

/* ── 陈列馆：51 元件 + 暗色主题 + 动效预设 ── */
const galSrc = readFileSync(new URL('../examples/gallery/app/main.cui', import.meta.url), 'utf8');
const gal = compileCui(galSrc);
if (gal.diags.length > 0) console.log(gal.diags.slice(0, 6));
ok('陈列馆无诊断', gal.diags.length === 0);
ok('暗色令牌在主题表', TOKEN_CSS.includes('[data-t="window"][data-theme="dark"]') && TOKEN_CSS.includes('--cui-anim-dur'));
ok('动效关键帧在基础样式', BASE_CSS.includes('@keyframes pop') && BASE_CSS.includes('@keyframes slide-up'));
ok('alert / empty 默认样式', BASE_CSS.includes('[data-t="alert"].err') && BASE_CSS.includes('[data-t="empty"]'));
ok('menu 默认藏、open 才出', BASE_CSS.includes('[data-t="menu"] {\n  display: none'));
const galHtml = renderCuiTree(buildCuiTree(parseCui(galSrc)));
ok('陈列馆四色横幅', galHtml.includes('class="tip-ok ok"') && galHtml.includes('class="tip-err err"'));
ok('陈列馆空状态与菜单', galHtml.includes('data-t="empty"') && galHtml.includes('data-t="menu"'));
ok('主题动作', gal.behaviors.some((b) => b.action.kind === 'toggle' && b.action.arg === 'night'));
ok('动画声明', gal.css.includes('animation: pop 400ms'));

/* ── 令牌层：亮暗 + 强调色 + 尺度 ── */
ok('亮暗两套主题', THEMES.light.canvas !== THEMES.dark.canvas && THEMES.dark.ink !== THEMES.light.ink);
ok('五套强调色', Object.keys(ACCENTS).length === 5);
ok('强调色亮暗各一份', ACCENTS.violet.light.accent !== ACCENTS.violet.dark.accent);
ok('20 个兼容令牌齐全', [
  'canvas', 'surface', 'card', 'wash', 'sunken', 'hairline', 'line', 'edge',
  'ink', 'soft', 'faint', 'ghost', 'accent', 'primary', 'tint', 'tone',
  'ok', 'err', 'warn', 'info'
].every((n) => TOKEN_NAMES.includes(n)));
ok('尺度值', SCALE.space[6] === 36 && SCALE.control.m === 32 && SCALE.radius.full === 999);
ok('主题 CSS 三态选择器', themeCss().includes(':root {')
  && themeCss().includes('[data-theme="dark"]')
  && themeCss().includes('[data-accent="violet"]'));
ok('主题 CSS 兼容变量', themeCss().includes('--cui-dur') && themeCss().includes('--cui-anim-dur'));

/* ── 组件层：目录与样式必须对得上 ── */
ok('组件目录规模', COMPONENTS.length >= 40);
ok('每个元件都有样式', COMPONENTS.every((c) => BASE_CSS.includes(`[data-t="${c.name}"]`)));
ok('目录里的按钮词表', ['standard', 'm'].every((v) => COMPONENTS
  .find((c) => c.name === 'button')!.variants.concat(['s', 'm', 'l']).includes(v)));
ok('有专门样式的变体', ['accent', 'subtle', 'outline', 'danger', 'link', 'icon']
  .every((v) => BASE_CSS.includes(`[data-t="button"].${v}`)));
ok('standard / m 是基类默认值', !BASE_CSS.includes('[data-t="button"].standard')
  && BASE_CSS.includes('height: var(--control-m)'));
ok('禁用与加载态', BASE_CSS.includes('[data-t="button"]:disabled') && BASE_CSS.includes('[data-t="button"].loading'));
ok('表格行不被 flex 抢走', BASE_CSS.includes('[data-t="table"] tr { display: table-row; }'));

/* ── 真实缺陷回归（都是实测踩出来的） ── */
const hyphenSrc = `window app
    menuitem om-1
        text "重命名"
    menuitem om-2
        text "删除"
`;
const hyphen = renderCuiTree(buildCuiTree(parseCui(hyphenSrc)));
ok('连字符 + 数字的 id 不被拆词', hyphen.includes('class="om-1"') && hyphen.includes('class="om-2"'));

const nestSrc = `window app
    button more
        text "更多"
        menu om
            menuitem om-1
                text "重命名"
`;
const nest = renderCuiTree(buildCuiTree(parseCui(nestSrc)));
ok('按钮里装菜单改成 role=button', /<div[^>]*data-t="button"[^>]*role="button"/.test(nest));
ok('菜单仍在按钮里', nest.includes('data-t="menu"') && !nest.includes('</button><div data-t="menu"'));
ok('菜单项没被抖到外面', /<div[^>]*data-t="menu"[^>]*><button[^>]*data-t="menuitem"/.test(nest));

const bareSrc = `window app
    button save
        accent
        pill
        padding 12
`;
const bare = compileCui(bareSrc);
ok('裸类名并进父选择器', bare.css.includes('[data-t="button"].save.accent.pill'));

const colSrc = `window app
    grid g
        columns 2
`;
ok('columns 单数字', compileCui(colSrc).css.includes('grid-template-columns: repeat(2, 1fr)'));

const stray = compileCui(`window app\n    min-width 400\n    bogus-width 12\n`);
ok('未知属性给出诊断', stray.diags.some((d) => d.msg.includes('bogus-width')));
ok('min-width 不再静默', compileCui(`window app\n    min-width 400\n`).css.includes('min-width: 400px'));

const actSrc = `window app
    button a when click
        act open
    button b when click
        act close
    button c when click
        act accent violet
    button d when click
        act copy "hello"
`;
const acts = compileCui(actSrc);
const actKinds = acts.behaviors.map((b) => b.action.kind).join(',');
ok('运行时动作编译', ['open', 'close', 'accent', 'copy'].every((k) => actKinds.includes(k)));

/* 回归：同元件同类的兄弟块必须各长各的（图标墙 96 格靠这个） */
const twinSrc = `window app
    box fr
        text
            text "one"
    box fr
        text
            text "two"
`;
const twins = buildCuiTree(parseCui(twinSrc));
ok('兄弟块不合并', twins.roots[0].children.length === 2);
const twinHtml = renderCuiHtml(twinSrc).html;
ok('两张图都渲染出来', twinHtml.includes('one') && twinHtml.includes('two'));

/* 回归：radius 写名字走令牌，写数字就是 px，多值不丢 */
ok('radius 名字走令牌', compileCui(`window app\n    box b\n        radius l\n`).css.includes('border-radius: var(--radius-l)'));
ok('radius 多值逐个翻', compileCui(`window app\n    box b\n        radius 8 8 0 0\n`).css.includes('border-radius: 8px 8px 0px 0px'));

/* 回归：ease 的关键字别被颜色令牌抢走（soft 是颜色，smooth 才是曲线） */
const eased = compileCui(`window app\n    image i\n        transition opacity\n        duration 460\n        ease smooth\n`);
ok('ease smooth 编译成贝塞尔', eased.css.includes('cubic-bezier(.22,1,.36,1)'));

/* 图标：Kubai 名册里的名字自动走两态资产，开关落在 data-motion */
const iconSrc = `window app
    icon k
        name "文件夹"
        motion always
    icon k2
        name "设置"
        palette black
        motion still
`;
const iconHtml = renderCuiHtml(iconSrc).html;
ok('icon 走 Kubai 资产两态', iconHtml.includes('color/rest/文件夹.svg') && iconHtml.includes('color/hover/文件夹.svg'));
ok('icon 动画开关写进 data-motion 与 m-* 类', iconHtml.includes('data-motion="always"') && iconHtml.includes('m-always') && iconHtml.includes('m-still'));
ok('icon 换配色', iconHtml.includes('black/rest/设置.svg'));

/* 合并成同一个 icon 之后，内置字形这条老路不能坏 */
const glyphHtml = renderCuiHtml(`window app\n    icon i\n        text "home"\n`).html;
ok('icon 内置字形仍走 data-icon', glyphHtml.includes('data-icon="home"'));

/* 规模：几百个块的页面照常编译，不丢节点、不报错 */
const bigSrc = ['window app'].concat(Array.from({ length: 400 }, (_, n) => `    row r${n}\n        text\n            text "行 ${n}"`)).join('\n');
const bigT0 = Date.now();
const bigTree = buildCuiTree(parseCui(bigSrc));
const bigHtml = String(renderCuiTree(bigTree));
ok('400 个块都建出来', bigTree.roots[0].children.length === 400);
ok('400 个块都渲染出来', (bigHtml.match(/行 /g) ?? []).length === 400);
ok('大页面编译在 1s 内', Date.now() - bigT0 < 1000);

/* 媒体与嵌入：source 走 src，布尔属性直接挂，doc 写进 srcdoc */
const mediaSrc = `window app
    video v
        source "a.mp4"
        controls
        loop
    frame f
        doc "<h1>hi</h1>"
`;
const mediaHtml = renderCuiHtml(mediaSrc).html;
ok('video 的 source 变 src', mediaHtml.includes('src="a.mp4"'));
ok('video 布尔属性不带值', mediaHtml.includes('controls') && mediaHtml.includes('loop'));
ok('frame 的 doc 写进 srcdoc', mediaHtml.includes('srcdoc="&lt;h1&gt;hi&lt;/h1&gt;"'));

/* 运行时动作 motion：解析不告警，且进 behavior 表 */
const moSrc = `window app
    icon k
        name "文件夹"
    button b when click
        act motion still
`;
const mo = compileCui(moSrc);
ok('act motion 能解析', mo.behaviors.some((b) => b.action.kind === 'motion'));

/* 令牌：kicon 的缓动变量在根上就位 */
ok('--ease-soft 在主题里', themeCss('light').includes('--ease-soft'));

/* 契约体检：元件名不重复、属性名不重复、每个元件都有落点 */
ok('元件名唯一', new Set(ELEMENTS.map((e) => e.name)).size === ELEMENTS.length);
ok('属性名唯一', new Set(PROPS.map((p) => p.name)).size === PROPS.length);
ok('元件都进得了选择器', ELEMENTS.every((e) => ALL_ELEMENT_WORDS.has(e.name)));

/* 多页界面：静态产物里第一页就要是 active，否则所有页会一起铺出来 */
const viewsSrc = `window app
    view one
        text
            text "一"
    view two
        text
            text "二"
`;
const viewsHtml = renderCuiHtml(viewsSrc).html;
ok('首屏 view 自动激活', /data-view="one" class="active"/.test(viewsHtml));
ok('多页只露 active', BASE_CSS.includes('[data-view]:not(.active)'));

/* 元件覆盖：ELEMENTS 里每一个都要能建出元素（不许加了名字却没人认） */
const allSrc = 'window app\n' + ELEMENTS.map((e) => `    ${e.name} t_${e.name}\n        text "x"`).join('\n');
const allHtml = renderCuiHtml(allSrc).html;
const missingEls = ELEMENTS.filter((e) => !allHtml.includes(`data-t="${e.name}"`)).map((e) => e.name);
ok(`${ELEMENTS.length} 个元件全部可渲染`, missingEls.length === 0);

/* 无极缩放与连续尺寸 */
const fluidCss = compileCui(`window app
    card a
        zoom 1.25
        width clamp(120px, 20vw, 240px)
`).css;
ok('无极缩放 zoom 生效', fluidCss.includes('zoom: 1.25'));
ok('clamp() 原样透传', fluidCss.includes('clamp(120px, 20vw, 240px)'));

/* act zoom：写值 / 读滑块 */
const zoomActs = parseCui(`window app
    slider z
button b when click
    act zoom 1.5
slider z when input
    act zoom
`).rules.flatMap((r) => r.actions);
ok('act zoom 带值', zoomActs.some((a) => a.kind === 'zoom' && a.arg === '1.5'));
ok('act zoom 读滑块', zoomActs.some((a) => a.kind === 'zoom' && a.arg === 'from'));

/* 语言纯度：.cui 里不许出现 HTML / CSS 字面量，这两个口子必须关死 */
ok('没有 css 字面量口子', !PROPS.some((p) => p.name === 'css'));
ok('没有 raw HTML 口子', !PROPS.some((p) => p.name === 'raw') && !ELEMENTS.some((e) => e.name === 'html'));

/* 新元件：语义行内、折叠、画布 */
const semHtml = renderCuiHtml(`window app
    mark hl
        text "高亮"
    strong st
        text "重点"
    canvas cv
        width 320
`).html;
ok('mark/strong/canvas 落成真标签', semHtml.includes('<mark') && semHtml.includes('<strong') && semHtml.includes('<canvas'));

/* 滤镜分量合成一条，不互相覆盖 */
const filters = compileCui(`window app
    card f
        blur 8
        grayscale 60
        saturate 140
        hue 90
`).css;
ok('滤镜合成一条', (filters.match(/filter:/g) ?? []).length === 1);
ok('滤镜分量都在', filters.includes('blur(8px)') && filters.includes('grayscale(60%)') && filters.includes('hue-rotate(90deg)'));

/* col 颜色变量：只存色值，不做运算；引用走 var(--col-*) */
const colDoc = compileCui(`col brand #2563eb
col wash #fff8
window app
    card a
        color brand
        background wash
`);
ok('col 变量生成本色表', colDoc.css.includes('--col-brand: #2563eb') && colDoc.css.includes('--col-wash: #fff8'));
ok('col 引用成 var', colDoc.css.includes('var(--col-brand)') && colDoc.css.includes('var(--col-wash)'));
ok('col 与主题令牌同名时 col 优先', !colDoc.css.includes('background: var(--wash)'));

const dupCol = compileCui(`col brand #fff
col brand #000
window app
`).diags;
ok('col 重复声明报错', dupCol.some((d) => d.msg.includes('重复')));

const badCol = compileCui(`col brand red
window app
`).diags;
ok('col 只收十六进制', badCol.some((d) => d.msg.includes('十六进制')));

/* 自定义动画 motion：源码不写 @，编译成 @keyframes；引用走 animation */
const motionDoc = compileCui(`motion rise
    from
        opacity 0
        move 0 8
    step 50
        opacity .8
    to
        opacity 1
        move 0 0

window app
    card a
        animation rise 320
`);
ok('motion 生成 keyframes', motionDoc.css.includes('@keyframes rise'));
ok('motion 关键帧完整', ['0%', '50%', '100%'].every((k) => motionDoc.css.includes(`${k} {`)));
ok('motion 帧里属性生效', motionDoc.css.includes('translate: 0px 8px') && motionDoc.css.includes('opacity: 0.8'));
ok('motion 被 animation 引用', motionDoc.css.includes('animation: rise 320ms'));
ok('motion 不产生解析诊断', motionDoc.diags.length === 0);
ok('motion 记进 AST', (parseCui(`motion rise
    from
        opacity 0
    to
        opacity 1
`).motions ?? []).length === 1);

const dupMotion = compileCui(`motion rise
    from
        opacity 0
motion rise
    to
        opacity 1
`).diags;
ok('motion 重名报错', dupMotion.some((d) => d.msg.includes('重复')));
ok('motion 没有帧报错', compileCui(`motion rise\nwindow app\n`).diags.some((d) => d.msg.includes('关键帧')));
ok('motion 与 col 同名报错', compileCui(`col rise #fff
motion rise
    from
        opacity 0
    to
        opacity 1
`).diags.some((d) => d.msg.includes('同名')));
ok('icon 的 motion 属性不被当成动画块', compileCui(`window app
    icon i
        motion hover
`).css.includes('@keyframes') === false);
const tokenNameMotion = compileCui(`motion wash
    from
        opacity 0
    to
        opacity 1
window app
    card a
        animation wash 200
`).css;
ok('动画名和令牌同名也不被换掉', tokenNameMotion.includes('animation: wash 200ms') && !tokenNameMotion.includes('animation: var('));

if (bad > 0) {
  throw new Error(`${bad} 项未通过`);
}
console.log('全部通过');










