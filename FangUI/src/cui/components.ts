/* 组件目录：给文档、补全、测试用的"说明书数据"。
 *
 * 样式在 src/styles/components.ts，这里只登记"有哪些组件、各有什么变体"。
 * 好处是三处共用一份事实：编辑器补全、docs/components.md、smoke 测试。
 */

export type ComponentSpec = {
  /** 元件名（.cui 里写在行首的词） */
  name: string;
  /** 分组，文档按它分节 */
  group: '按钮' | '输入' | '选择' | '容器' | '数据展示' | '反馈' | '浮层' | '文本';
  /** 一句话说明 */
  summary: string;
  /** 可用变体类名 */
  variants: string[];
  /** 可用尺寸类名 */
  sizes: string[];
  /** 常用属性（写 .cui 时的关键字） */
  props: string[];
  /** 典型写法，直接进文档示例 */
  sample?: string;
};

export const COMPONENTS: ComponentSpec[] = [
  {
    name: 'button', group: '按钮', summary: '按钮：默认标准款，accent 只放一个',
    variants: ['accent', 'standard', 'subtle', 'ghost', 'outline', 'danger', 'link', 'icon', 'pill', 'disabled', 'loading'],
    sizes: ['s', 'm', 'l'],
    props: ['text', 'name', 'value', 'disabled', 'animation'],
    sample: 'button primary\n    text "保存"\n    accent'
  },
  {
    name: 'tab', group: '按钮', summary: '页签：放在 tabs 里，配 act go 切页',
    variants: ['active', 'disabled'],
    sizes: [],
    props: ['text', 'name'],
    sample: 'tab t1 active\n    text "总览"'
  },
  {
    name: 'menuitem', group: '按钮', summary: '菜单项：放在 menu 里，danger 标红',
    variants: ['danger', 'disabled'],
    sizes: [],
    props: ['text', 'disabled'],
    sample: 'menuitem m1\n    text "删除"\n    danger'
  },
  {
    name: 'link', group: '按钮', summary: '超链接：走 href，muted 弱化',
    variants: ['muted'],
    sizes: [],
    props: ['href', 'target', 'text'],
    sample: 'link docs\n    text "文档"\n    href "https://…"'
  },
  {
    name: 'input', group: '输入', summary: '单行输入框：focus 有下沿强调线，err 标红',
    variants: ['err', 'bare', 'search', 'disabled'],
    sizes: ['s', 'm', 'l'],
    props: ['hint', 'value', 'type', 'name', 'readonly', 'required', 'disabled', 'autofocus'],
    sample: 'input name\n    hint "项目名…"\n    width fill'
  },
  {
    name: 'textarea', group: '输入', summary: '多行输入框：可拖拽改高',
    variants: ['disabled'],
    sizes: [],
    props: ['hint', 'value', 'rows', 'cols', 'name', 'readonly'],
    sample: 'textarea note\n    hint "写点什么…"\n    rows 4'
  },
  {
    name: 'checkbox', group: '选择', summary: '复选框：自绘方块，focus 有环',
    variants: ['l', 'disabled'],
    sizes: [],
    props: ['name', 'checked', 'value', 'disabled'],
    sample: 'checkbox agree\n    name agree\n    checked'
  },
  {
    name: 'radio', group: '选择', summary: '单选框：同名一组互斥',
    variants: ['l', 'disabled'],
    sizes: [],
    props: ['name', 'checked', 'value', 'disabled'],
    sample: 'radio size-m\n    name size\n    checked'
  },
  {
    name: 'switch', group: '选择', summary: '开关：默认关，加 checked 打开',
    variants: ['s', 'l', 'disabled'],
    sizes: [],
    props: ['name', 'checked', 'disabled'],
    sample: 'switch notify\n    checked'
  },
  {
    name: 'slider', group: '选择', summary: '滑杆：范围取值',
    variants: ['disabled'],
    sizes: [],
    props: ['value', 'min', 'max', 'step', 'name'],
    sample: 'slider volume\n    min 0\n    max 100\n    value 60'
  },
  {
    name: 'dropdown', group: '选择', summary: '下拉选择：option 装在里面',
    variants: ['s', 'l', 'disabled'],
    sizes: [],
    props: ['name', 'multiple', 'value'],
    sample: 'dropdown kind\n    option a\n        text "卡片"\n        selected'
  },
  {
    name: 'form', group: '容器', summary: '表单容器：when submit 收整张表',
    variants: [],
    sizes: [],
    props: ['name'],
    sample: 'form profile\n    when submit\n        act say "已提交"'
  },
  {
    name: 'field', group: '容器', summary: '字段（标签 + 控件），inline 横排',
    variants: ['inline'],
    sizes: [],
    props: [],
    sample: 'field name\n    label\n        text "项目名"\n    input\n        hint "…"'
  },
  {
    name: 'card', group: '容器', summary: '卡片：分层靠发丝边，浮起才用阴影',
    variants: ['flat', 'raised', 'sunken', 'interactive'],
    sizes: [],
    props: ['padding', 'radius', 'background'],
    sample: 'card stat raised\n    heading\n        text "本周新增"'
  },
  {
    name: 'section', group: '容器', summary: '带标题的内容分区',
    variants: ['pad', 'gap'],
    sizes: [],
    props: [],
    sample: 'section body\n    gap'
  },
  {
    name: 'grid', group: '容器', summary: '网格：默认自动等分，fit 收紧最后一列',
    variants: ['fit', 'tight'],
    sizes: [],
    props: ['columns', 'gap', 'auto rows'],
    sample: 'grid cards\n    columns repeat(3, 1fr)\n    gap 12'
  },
  {
    name: 'toolbar', group: '容器', summary: '工具条：横排、可换行',
    variants: ['between'],
    sizes: [],
    props: ['gap', 'wrap'],
    sample: 'toolbar actions\n    between'
  },
  {
    name: 'list', group: '容器', summary: '列表容器，divided 出分隔线',
    variants: ['divided'],
    sizes: [],
    props: [],
    sample: 'list rows\n    divided'
  },
  {
    name: 'item', group: '容器', summary: '列表项：可选中、可交互',
    variants: ['selected', 'interactive', 'dense'],
    sizes: [],
    props: [],
    sample: 'item row-a\n    interactive'
  },
  {
    name: 'table', group: '数据展示', summary: '表格：里面用 row / cell / heading，自动变 tr / td / th',
    variants: ['zebra', 'bordered', 'compact'],
    sizes: [],
    props: ['width'],
    sample: 'table data\n    zebra'
  },
  {
    name: 'badge', group: '数据展示', summary: '徽标 / 计数：四种语义色',
    variants: ['plain', 'ok', 'warn', 'err', 'info', 'l'],
    sizes: [],
    props: ['text'],
    sample: 'badge n\n    text "3"'
  },
  {
    name: 'tag', group: '数据展示', summary: '标签：筛选条件、分类',
    variants: ['accent', 'pill'],
    sizes: [],
    props: ['text'],
    sample: 'tag t\n    text "设计"\n    accent'
  },
  {
    name: 'avatar', group: '数据展示', summary: '头像：圆形，可装图片',
    variants: ['s', 'l', 'round', 'ring'],
    sizes: [],
    props: ['text'],
    sample: 'avatar me\n    text "方"\n    ring'
  },
  {
    name: 'icon', group: '数据展示', summary: '内置图标：text / name 写图标名',
    variants: [],
    sizes: [],
    props: ['text', 'name', 'color', 'size'],
    sample: 'icon gear\n    text "settings"\n    size 16'
  },
  {
    name: 'progress', group: '数据展示', summary: '进度条：value 0~100',
    variants: ['l', 'ok', 'err'],
    sizes: [],
    props: ['value', 'max'],
    sample: 'progress bar\n    value 60'
  },
  {
    name: 'spinner', group: '数据展示', summary: '加载指示',
    variants: ['s', 'l'],
    sizes: [],
    props: [],
    sample: 'spinner'
  },
  {
    name: 'skeleton', group: '数据展示', summary: '骨架占位：加载中的灰条',
    variants: ['text', 'title', 'block', 'circle'],
    sizes: [],
    props: ['width', 'height'],
    sample: 'skeleton title'
  },
  {
    name: 'alert', group: '反馈', summary: '提示横幅：info / ok / warn / err',
    variants: ['info', 'ok', 'warn', 'err', 'banner'],
    sizes: [],
    props: [],
    sample: 'alert tip ok\n    icon\n        text "success"\n    text "已完成"'
  },
  {
    name: 'empty', group: '反馈', summary: '空状态：图标 + 一句话',
    variants: [],
    sizes: [],
    props: [],
    sample: 'empty none\n    icon\n        text "folder"\n    text "还没有内容"'
  },
  {
    name: 'toast', group: '反馈', summary: '轻提示：act open 显示，4 秒自动走',
    variants: ['ok', 'err', 'sticky'],
    sizes: [],
    props: [],
    sample: 'toast saved\n    text "已保存"\n    ok'
  },
  {
    name: 'tip', group: '反馈', summary: '悬停提示：贴在父元素上',
    variants: ['below'],
    sizes: [],
    props: ['text'],
    sample: 'button help\n    text "?"\n    tip\n        text "快捷键 Ctrl+S"'
  },
  {
    name: 'overlay', group: '浮层', summary: '遮罩层：open 打开，点空白处关闭',
    variants: ['top'],
    sizes: [],
    props: [],
    sample: 'overlay confirm\n    modal\n        …'
  },
  {
    name: 'modal', group: '浮层', summary: '对话框面板：Esc 关，Tab 在内部循环',
    variants: ['s', 'l', 'plain'],
    sizes: [],
    props: [],
    sample: 'modal sheet\n    heading\n        text "确认删除？"'
  },
  {
    name: 'drawer', group: '浮层', summary: '抽屉：右滑入，left 从左滑入',
    variants: ['left'],
    sizes: [],
    props: [],
    sample: 'drawer detail\n    heading\n        text "详情"'
  },
  {
    name: 'popover', group: '浮层', summary: '锚定浮层：比菜单自由，能装任意内容',
    variants: [],
    sizes: [],
    props: [],
    sample: 'popover info\n    text "更多说明"'
  },
  {
    name: 'menu', group: '浮层', summary: '菜单：open 展开，自带 pop 动效',
    variants: ['static', 'open'],
    sizes: [],
    props: [],
    sample: 'menu more\n    menuitem m1\n        text "重命名"'
  },
  {
    name: 'text', group: '文本', summary: '文本：muted / strong / mono / caption / lead',
    variants: ['muted', 'strong', 'mono', 'caption', 'lead'],
    sizes: [],
    props: ['text', 'size', 'color', 'weight'],
    sample: 'text note\n    text "改左边，右边立刻变"\n    caption'
  },
  {
    name: 'code', group: '文本', summary: '代码块：inline 退化成行内片段',
    variants: ['inline'],
    sizes: [],
    props: ['text', 'name'],
    sample: 'code sample\n    text "setTheme(\'dark\')"\n    inline'
  },
  {
    name: 'heading', group: '文本', summary: '小标题：page / sub 两级',
    variants: ['page', 'sub'],
    sizes: [],
    props: ['text'],
    sample: 'heading h\n    text "本周概览"\n    page'
  },
  {
    name: 'label', group: '文本', summary: '字段标签：req 自动加星号',
    variants: ['req', 'strong'],
    sizes: [],
    props: ['text'],
    sample: 'label l\n    text "邮箱"\n    req'
  },
  {
    name: 'divider', group: '容器', summary: '分割线：vertical 竖排版本',
    variants: ['vertical'],
    sizes: [],
    props: [],
    sample: 'divider'
  }
];

/** 按分组切好，文档生成器按这个顺序输出。 */
export const COMPONENT_GROUPS: ComponentSpec['group'][] = ['按钮', '输入', '选择', '容器', '数据展示', '反馈', '浮层', '文本'];

/** 某个元件的变体清单；补全用。 */
export const VARIANTS_OF: Record<string, string[]> = Object.fromEntries(
  COMPONENTS.map((c) => [c.name, [...c.variants, ...c.sizes]])
);

/** 全局能用的类名（变体之外的通用工具类）。 */
export const UTILITIES = [
  'center', 'middle', 'between', 'end', 'wrap', 'fill', 'fit',
  'pill', 'round', 'nowrap', 'mono', 'muted', 'strong'
];
