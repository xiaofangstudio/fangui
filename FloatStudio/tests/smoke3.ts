/* 冒烟测试：词表 v3 + act call → Copper 前端逻辑端到端 */
import { compileCui } from '../src/cui/compile';
import { parseCui } from '../src/cui/parser';
import { buildCuiTree } from '../src/cui/tree';
import { TEMPLATES } from '../src/core/templates';
import { builtinList } from '../src/lang/builtins';
import { setPageBridge, callCopperFn, type PageBridge } from '../src/lang/pagehost';

let fails = 0;
const ok = (cond: boolean, msg: string): void => {
  if (cond) console.log('PASS', msg);
  else { fails++; console.log('FAIL', msg); }
};

const todo = TEMPLATES.find((t) => t.id === 'todo')!;
const cui = todo.files['app/todo.cui'];
const main = todo.files['app/main.co'];

/* 1. 模板 .cui 能编译，行为表里有 call */
const r = compileCui(cui);
ok(r.ruleCount > 20 && r.diags.length === 0, `模板编译出 ${r.ruleCount} 条规则、0 诊断`);
const calls = r.behaviors.filter((b) => b.action.kind === 'call');
ok(calls.length === 5, `act call 行为有 ${calls.length} 条（add/tick/del/clear/enter）`);
ok(calls.some((b) => b.action.arg === 'add_item' && b.event === 'click'), '按钮点击接到 add_item');
ok(calls.some((b) => b.action.arg === 'add_item' && b.event === 'enter'), '回车接到 add_item');
ok(r.css.includes('[data-t="button"]'), '按钮产出 data-t="button"');
ok(r.css.includes('var(--accent)'), '令牌产出 var(--accent)');

/* 2. 树能建出来 */
const tree = buildCuiTree(parseCui(cui));
ok(tree.roots.length > 0, '元件树有根');

/* 3. 旧缩写兼容：btn/bg/a1 照常编译成完整词 */
const legacy = compileCui('btn primary\n    bg a1\n');
ok(legacy.css.includes('[data-t="button"].primary'), '旧缩写 btn 归一化成 button');
ok(legacy.css.includes('background: var(--accent);'), '旧令牌 a1 归一化成 accent');

/* 4. page.* 注册进了内建表（补全/检查都靠它） */
ok(builtinList().some((b) => b.name === 'page.clone'), 'page.clone 在内建表里');
ok(builtinList().some((b) => b.name === 'page.count'), 'page.count 在内建表里');

/* 5. act call 端到端：假桥上跑一遍 add_item */
const log: string[] = [];
const written = new Map<string, string>();
let cloneCount = 0;
const bridge: PageBridge = {
  read: (sel) => (sel === '#new' ? '  测试任务  ' : ''),
  write: (sel, value) => { written.set(sel, value); },
  add: () => {}, remove: () => {}, toggle: () => {}, delete: () => {},
  clone: () => { cloneCount++; return '#c1'; },
  count: (sel) => (sel.includes('.done') ? 1 : cloneCount + 3),
  say: (m) => { log.push(m); },
  focus: () => {}
};
setPageBridge(bridge);
callCopperFn({ 'app/main.co': main }, 'app/main.co', 'add_item', '#add', (m) => log.push('ERR:' + m));
await new Promise((res) => setTimeout(res, 300));
ok(written.get('#c1 .task') === '测试任务', `clone 出的新条目写上了文字`);
ok(written.get('#new') === '', '输入框被清空');
ok(written.has('#count'), '底栏计数被更新');
ok(log.every((l) => !l.startsWith('ERR')), `没有报错：${log.join(' | ')}`);

/* 6. tick_item：翻 class + 换图标 */
let toggled = '';
bridge.toggle = (sel) => { toggled = sel; };
callCopperFn({ 'app/main.co': main }, 'app/main.co', 'tick_item', '#t2', (m) => log.push('ERR:' + m));
await new Promise((res) => setTimeout(res, 300));
ok(toggled === '#t2', 'tick_item 切了 #t2 的 done 类');
ok(written.get('#t2 .tick') === '✓', '圆圈换成对勾');

setPageBridge(null);
console.log(fails === 0 ? '\n全部通过' : `\n${fails} 个失败`);
process.exit(fails === 0 ? 0 : 1);
