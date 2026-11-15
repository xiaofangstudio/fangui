/* Float Studio 新建工程模板。
 *
 * 按用途分四类：
 *   app     完整软件（界面 .cui + 前端逻辑 .co + 后端 .co），建完直接进预览面板
 *   ui      界面示例（.cui + 预览结构）
 *   backend 后端示例（一个能跑的小系统，纯 .co）
 *   lang    语言示例（语法速查，纯 .co）
 *
 * 分层规矩：.cui 管界面（结构、样式、act 动作），app/*.co 管前端逻辑
 * （act call 调进来的函数，用 page.* 读写界面），srv/*.co 管后端。
 * 从模板到产物只有 Copper 和 Copper UI 两种语言，没有第三种。
 */

export type TemplateKind = 'app' | 'ui' | 'backend' | 'lang';

export type Template = {
  id: string;
  name: string;
  desc: string;
  kind: TemplateKind;
  files: Record<string, string>;
  /** 带界面的模板才有：预览时要一起跑的前端 Copper 逻辑（app/*.co） */
  preview?: { logic?: Record<string, string> };
};

export const KIND_LABEL: Record<TemplateKind, string> = {
  app: '完整软件',
  ui: '界面示例',
  backend: '后端示例',
  lang: '语言示例'
};

export const KIND_ORDER: TemplateKind[] = ['app', 'ui', 'backend', 'lang'];

const projectJson = (entry: string, name: string): string =>
  JSON.stringify({ name, entry, version: '0.2.0', kind: 'float' }, null, 2) + '\n';

const TPL_BLANK = `/* main.co —— 从这里开始写你的 Copper
print("你好，Copper！")
`;

const TPL_STARTER = `/* ─ 入门示例：变量 / 条件 / 循环 ─

ask "你叫什么名字？"
print(join("你好，", ans))

/* 变量声明右边可以写任意表达式
int a = 7
int b = 5
int sum = a + b
print(join("7 + 5 = ", sum))

/* 条件：> < == != && || !
if (sum > 10)
    print("结果比 10 大")
else
    print("结果不超过 10")

/* 循环变量 i 能直接用，次数也可以是变量
int times = 3
for i in range(times)
    print(join("第 ", i + 1, " 声问好"))

/* 遍历列表
list fruits = ["苹果", "香蕉", "橘子"]
for f in fruits
    print("水果：" + f)

print("入门示例结束")
`;

const TPL_ADVANCED = `/* ─ 进阶示例：函数 / 集合 / 字典 / 计时 ─

/* 带参数与返回值的函数，可在表达式里直接调用
function priceWithTax(price, rate = 0.1)
    return round(price * (1 + rate))

print("100 元含税：" + priceWithTax(100))
print("100 元按 13%：" + priceWithTax(100, 0.13))

/* 递归
function fib(n)
    if (n < 2)
        return n
    return fib(n - 1) + fib(n - 2)
print("fib(10) = " + fib(10))

/* 列表：字面量 + 指令 + 下标
list nums = [3, 1, 2]
add 4 to nums
print("长度：" + len(nums))
print("排序前第一个：" + nums[0])
nums[0] = 9

int total = 0
for v in nums
    total += v
print("求和：" + total)

/* 字典：键值对
dict scores = {"小明": 90, "小红": 95}
scores["小刚"] = 88
for who, score in scores
    print(join(who, "：", score))
print("平均分：" + (90 + 95 + 88) / 3)

/* 计时：time reset 清零，time read 读取（单位秒）
time reset
wait 0.3
time read
print(join("耗时（秒）：", __last_time))

print("进阶示例结束")
`;

const TPL_CLASS = `/* ─ 类与对象 ─

class Player
    str name = ""
    int hp = 100
    int mp = 30

    function init(name, hp)
        self.name = name
        self.hp = hp

    function hurt(damage)
        hp -= damage
        if (hp < 0)
            hp = 0
        return hp

    function alive()
        return hp > 0

    function info()
        return join(name, " HP ", hp, " MP ", mp)

class Mage extends Player
    int mana = 50

    function init(name)
        super(name, 80)

    function fireball(target)
        if (mana < 10)
            return "蓝不够了"
        mana -= 10
        target.hurt(25)
        return join(name, " 火球命中 ", target.name, "，对方剩 ", target.hp)

Player hero = new Player("战士", 120)
Mage wizard = new Mage("法师")

print(hero.info())
print(wizard.info())
print(wizard.fireball(hero))
print(hero.info())

/* 对象可以放进列表统一处理
list team = [wizard, hero]
for p in team
    print(join(p.name, " 还活着吗：", p.alive()))
`;

function files(entry: string, name: string, main: string): Record<string, string> {
  return { 'project.json': projectJson(entry, name), [entry]: main };
}

/** 指针实战：手动内存 + 小游戏。给"想看看 alloc 能干什么"的人一个入口 */
const TPL_POINTER_GAME = `/* ─ 指针示例：翻牌消消乐（alloc / free 手动内存）──
/* 牌桌用 alloc 申请：每张牌占两格（第 0 格是牌面，第 1 格是"翻开没有"）。
/* 手动内存：程序结束前自己 free。忘了还不会自动回收（Rust 内核会点名，IDE 的引擎不查）。

list 图案 = ["苹果", "苹果", "星星", "星星", "月亮", "月亮", "云朵", "云朵"]
int 张数 = len(图案)

/* 洗牌
for i in range(张数 - 1)
    int j = rand(i, 张数 - 1)
    str t = 图案[i]
    图案[i] = 图案[j]
    图案[j] = t

/* 牌桌
ptr 牌桌 = alloc(张数 * 2)
for i in range(张数)
    牌桌[i * 2] = 图案[i]
    牌桌[i * 2 + 1] = false

fn 显示()
    str line = "  "
    for i in range(张数)
        if (牌桌[i * 2 + 1])
            line += join(" ", 牌桌[i * 2], " ")
        else
            line += join(" [", i + 1, "] ")
    print(line)

fn 是数字(s)
    if (len(s) == 0)
        return false
    for c in s
        if (c < "0" || c > "9")
            return false
    return true

/* 返回：0 = 不玩了，-1 = 输入的不是序号，其它 = 牌号
fn 读牌(prompt)
    ask prompt
    str raw = trim(ans)
    if (raw == "")
        return 0
    if (!是数字(raw))
        return -1
    return int(raw)

int 还剩 = 张数
int 轮数 = 0
print("========================================")
print("  翻牌消消乐：翻两张一样的就消掉")
print("  直接回车 = 不玩了")
print("========================================")
report "游戏开始，共 4 对牌"

while (还剩 > 0)
    轮数++
    print("")
    print(join("第 ", 轮数, " 轮，还剩 ", 还剩, " 张"))
    显示()

    int a = 读牌("翻第几张？")
    if (a == 0)
        print("下次再玩。")
        break
    if (a < 0)
        print("要输入 1~8 的数字。")
        continue
    int b = 读牌("再翻第几张？")
    if (b == 0)
        print("下次再玩。")
        break
    if (b < 0)
        print("要输入 1~8 的数字。")
        continue

    if (a < 1 || a > 张数 || b < 1 || b > 张数 || a == b)
        print("这两张不行，重来一轮。")
        continue
    if (牌桌[(a - 1) * 2 + 1] || 牌桌[(b - 1) * 2 + 1])
        print("已经翻开过了，重来一轮。")
        continue

    牌桌[(a - 1) * 2 + 1] = true
    牌桌[(b - 1) * 2 + 1] = true
    显示()

    str 甲 = 牌桌[(a - 1) * 2]
    str 乙 = 牌桌[(b - 1) * 2]
    if (甲 == 乙)
        还剩 -= 2
        print(join("  两张都是「", 甲, "」，消掉！"))
        report join("第 ", 轮数, " 轮消掉一对：", 甲, "（还剩 ", 还剩, " 张）")
    else
        牌桌[(a - 1) * 2 + 1] = false
        牌桌[(b - 1) * 2 + 1] = false
        print(join("  是「", 甲, "」和「", 乙, "」，不一样，翻回去。"))

/* 用完了必须还
free(牌桌)
if (还剩 == 0)
    print(join("全部消完，一共 ", 轮数, " 轮。"))
    report join("通关：", 轮数, " 轮")
else
    report "退出游戏"
`;

/* ─────────────────── 完整软件：今日待办 ─────────────────── */

const TODO_CUI = `/* 今日待办 · 界面（Copper UI）
/* 一条规则就是一个元件：元件名开头，缩进就是层级
/* 开头的 all 表示"只写样式，不建元件"；when click + act call 接到 app/main.co

window
    background canvas
    layout column
    height fill

    row top
        layout row
        justify between
        align center
        padding 20 22 14 22
        background card
        shadow 0 1 3 0 line

        text brand
            text "今日待办"
            size 19
            weight bold
            color ink

        text date
            text "11 月 15 日"
            size 12
            color faint

    row composer
        layout row
        gap 8
        padding 0 22 16 22
        background card

        input field#new
            hint "写点什么，回车添加…"
            width fill
            background wash
            border 1 line
            radius 7
            padding 9 11
            size 13
            color ink

        button add#add
            text "添加"
            background accent
            color card
            radius 7
            padding 9 16
            size 13
            weight medium
            transition background

    list todo#list
        layout column
        gap 6
        padding 14 22
        grow 1

        /* 三个初始条目：同元件同类的规则会合并，所以用 # 区分身份
        /* #t1 还兼任新条目的模板——前端逻辑用 page.clone 复制它 */
        item row#t1
            button tick
                text "○"
            text task
                text "买牛奶"
            button del
                text "✕"

        item row#t2
            button tick
                text "○"
            text task
                text "给 Float Studio 写文档"
            button del
                text "✕"

        item row#t3
            button tick
                text "○"
            text task
                text "试试改右边的 padding 和 radius"
            button del
                text "✕"

    row foot
        layout row
        justify between
        align center
        padding 12 22
        background card
        border 1 hairline

        text count#count
            text "3 项未完成"
            size 12
            color faint

        button clear#clear
            text "清除已完成"
            background card
            color faint
            size 12
            padding 5 10
            radius 6
            border 1 line

/* ── 下面全是"只写样式"的规则：all 开头，不建元件 ── */

all input field when focus
    border 1 accent
    background card

all button add when hover
    background primary

all item row
    layout row
    align center
    gap 10
    padding 10 12
    background card
    radius 8
    border 1 hairline
    transition background

all item row when hover
    background surface

all button tick
    width 18
    height 18
    radius 99
    border 1 edge
    background card
    color ghost
    size 11
    padding 0
    shrink 0

all button tick when hover
    border 1 accent

all text task
    width fill
    size 13.5
    color ink

all button del
    background card
    color ghost
    size 12
    padding 2 6
    radius 5
    opacity 0.25

all button del when hover
    background wash
    color err
    opacity 1

/* +done 是运行时才会加上的类：用 + 标出来，它不参与建元件 */
all item row +done
    background surface
    opacity 0.72

all item row +done text task
    color faint

all item row +done button tick
    background accent
    border 1 accent
    color card

all button clear when hover
    background wash
    color soft

/* ── 事件：when 是事件，act 是动作 ──
/* add / toggle / text / say 是声明式动作；call 调 app/main.co 里的 Copper 函数
/* 回车（enter）和点按钮都走同一个 add_item */
button add#add when click
    act call add_item

input field#new when enter
    act call add_item

all button tick when click
    act call tick_item

all button del when click
    act call drop_item

button clear#clear when click
    act call clear_done
`;

const TODO_MAIN_CO = `/* 今日待办 · 前端逻辑（Copper）
/* 界面在 app/todo.cui：when click / when enter + act call 把事件接到这里的函数
/* 函数会收到被点元素的 #id；界面状态都存在元素上，不用另外记
/* 这一层只管"点了之后发生什么"，真正存数据的后端在 srv/todo.co

/* 数一数还剩几件没做，写进底栏 */
function refresh()
    int all = page.count("#list .row")
    int done = page.count("#list .row.done")
    if (all - done == 0)
        page.write("#count", "都做完了")
    else
        page.write("#count", join(all - done, " 项未完成"))

/* 添加：读输入框 → 空就提示 → 复制 #t1 当模板 → 改文字 → 清空输入框 */
function add_item(sel)
    str text = trim(page.read("#new"))
    if (len(text) == 0)
        page.say("先写点什么再添加")
        return

    str row = page.clone("#t1", "#list")
    page.write(row + " .task", text)
    page.write("#new", "")
    page.focus("#new")
    refresh()

/* 勾选：切 done 类，顺手把圆圈换成对勾 */
function tick_item(sel)
    page.toggle(sel, "done")
    if (page.count(sel + ".done") == 1)
        page.write(sel + " .tick", "✓")
    else
        page.write(sel + " .tick", "○")
    refresh()

/* 删掉这一条 */
function drop_item(sel)
    page.delete(sel)
    refresh()

/* 清除所有已完成的条目 */
function clear_done(sel)
    page.delete("#list .row.done")
    refresh()
`;

const TODO_CO = `/* 今日待办 · 后端逻辑（Copper）
/* 这一层只管数据，不碰界面；界面在 app/todo.cui

class Task
    str text = ""
    bool done = false

    function init(text)
        self.text = text

list tasks = []

function add_task(text)
    if (len(trim(text)) == 0)
        return false
    add new Task(text) to tasks
    return true

function finish(index)
    if (index < 0 || index >= len(tasks))
        return false
    tasks[index].done = true
    return true

function remove_at(index)
    if (index < 0 || index >= len(tasks))
        return false
    del tasks[index]
    return true

function done_count()
    int n = 0
    for t in tasks
        if (t.done)
            n++
    return n

function pending_count()
    return len(tasks) - done_count()

function clear_done()
    list keep = []
    for t in tasks
        if (!t.done)
            add t to keep
    tasks = keep
    return len(tasks)
`;

/* ─────────────────── 界面示例：登录卡片 ─────────────────── */

const LOGIN_CUI = `/* 登录卡片 · 界面示例
/* 结构也是 .cui 长出来的：一条规则一个元件，缩进就是层级

window
    background canvas
    layout stack
    justify center
    align center
    height fill

    box card
        width 360
        background card
        radius 14
        padding 26
        border 1 line
        layout column
        gap 14
        shadow 0 10 30 0 line

        text head
            text "欢迎回来"
            size 20
            weight bold
            color ink

        text sub
            text "登录后继续你的工作"
            size 12.5
            color faint

        input account
            hint "手机号或邮箱"
            width fill
            background wash
            border 1 line
            radius 8
            padding 10 12
            size 13
            color ink

        input secret
            hint "密码"
            type "password"
            width fill
            background wash
            border 1 line
            radius 8
            padding 10 12
            size 13
            color ink

        button submit
            text "登录"
            width fill
            background accent
            color card
            radius 8
            padding 10
            size 13.5
            weight medium
            transition background
            transition opacity

        text tip
            text "继续即表示同意服务条款"
            size 11.5
            color ghost
            text align center

/* ── 状态与行为：all = 只写样式，不建元件 ── */

all input account when focus
    background card
    border 1 accent

all input secret when focus
    background card
    border 1 accent

all button submit when hover
    background primary

all button submit when pressed
    opacity 0.86

/* when click 是事件，act 是动作（声明式，不是脚本，跑不炸）
/* 点一下「登录」——按钮自己多一个 done 类，下面的提示文字也换掉 */
button submit when click
    act toggle done
    act text tip "点到了 —— 界面里写的行为真的会执行"

all button submit +done
    background tint
    color accent
`;

/* ─────────────────── 后端示例：库存管理 ─────────────────── */

const STOCK_CO = `/* 库存管理 · 后端示例
/* 没有界面，纯命令行。用类 + 列表 + 字典演示增删改查。

class Item
    str name = ""
    int count = 0
    float price = 0.0

    function init(name, count, price)
        self.name = name
        self.count = count
        self.price = price

    function value()
        return count * price

    function info()
        return join(name, " × ", count, "（单价 ", price, "，合计 ", round(value()), "）")

list stock = []

function find(name)
    for i in range(len(stock))
        if (stock[i].name == name)
            return i
    return -1

function put(name, count, price)
    int i = find(name)
    if (i >= 0)
        stock[i].count += count
        return stock[i]
    Item it = new Item(name, count, price)
    add it to stock
    return it

function take(name, count)
    int i = find(name)
    if (i < 0)
        print(join("没有这个货：", name))
        return false
    if (stock[i].count < count)
        print(join(name, " 不够，只剩 ", stock[i].count))
        return false
    stock[i].count -= count
    return true

put("螺丝", 200, 0.5)
put("垫片", 500, 0.1)
put("扳手", 30, 24.0)
put("螺丝", 100, 0.5)

print("=== 入库后 ===")
for it in stock
    print(it.info())

take("扳手", 5)
take("电钻", 1)

print("")
print("=== 出库后 ===")
float total = 0
for it in stock
    print(it.info())
    total += it.value()
print(join("库存总值：", round(total)))

dict 分类 = {"紧固件": 2, "工具": 1}
print("")
for k, v in 分类
    print(join(k, " 有 ", v, " 种"))
`;

/* ─────────────────── 模板表 ─────────────────── */

export const TEMPLATES: Template[] = [
  {
    id: 'todo',
    name: '今日待办',
    desc: '完整软件：界面 .cui + 前端逻辑 .co + 后端 .co，三层分开，可一键编译成 EXE',
    kind: 'app',
    files: {
      'project.json': projectJson('app/todo.cui', '今日待办'),
      'app/todo.cui': TODO_CUI,
      'app/main.co': TODO_MAIN_CO,
      'srv/todo.co': TODO_CO
    },
    preview: { logic: { 'app/main.co': TODO_MAIN_CO } }
  },
  {
    id: 'login',
    name: '登录卡片',
    desc: '界面示例：结构全部由 .cui 规则生成，输入框焦点态、按钮悬停与按下',
    kind: 'ui',
    files: {
      'project.json': projectJson('app/login.cui', '登录界面'),
      'app/login.cui': LOGIN_CUI
    }
  },
  {
    id: 'stock',
    name: '库存管理',
    desc: '后端示例：类、列表、字典、函数，纯命令行跑',
    kind: 'backend',
    files: files('main.co', '库存管理', STOCK_CO)
  },
  { id: 'blank', name: '空白工程', desc: '只含 main.co 与 project.json，一张白纸', kind: 'lang', files: files('main.co', 'Copper 工程', TPL_BLANK) },
  { id: 'starter', name: '入门示例', desc: '变量 / 条件 / 循环 / 列表，十行看懂 Copper', kind: 'lang', files: files('main.co', 'Copper 入门', TPL_STARTER) },
  { id: 'advanced', name: '进阶示例', desc: '函数 / 集合 / 字典 / 计时，写法速查', kind: 'lang', files: files('main.co', 'Copper 进阶', TPL_ADVANCED) },
  { id: 'class', name: '类与对象', desc: '字段 / 方法 / 继承 / super，面向对象起步', kind: 'lang', files: files('main.co', 'Copper 类示例', TPL_CLASS) },
  { id: 'pointer', name: '指针示例', desc: 'alloc / free 手动内存，一格一格自己管', kind: 'lang', files: files('main.co', '指针示例', TPL_POINTER_GAME) }
];

/** 打开已有 .cui 时按文件路径找回它自带的预览逻辑（app/*.co）：
 *  结构不需要模板带 HTML —— .cui 自己就会长出界面；
 *  行为也不再需要 JS —— act call 接到 Copper 函数。 */
export function previewForCui(file: string): { logic?: Record<string, string> } | undefined {
  const norm = file.replace(/\\/g, '/');
  for (const t of TEMPLATES) {
    if (!t.preview) continue;
    const key = Object.keys(t.files).find((k) => k.endsWith('.cui'));
    if (key && norm.endsWith('/' + key)) return t.preview;
  }
  return undefined;
}
