/* 界面宿主桥的「插口」。
 *
 * 只放类型和全局状态，不 import 任何东西——内建表（builtins.ts）要用它，
 * 而内建表又被解释器（interp.ts → codegen.ts）依赖，桥的实现（pagehost.ts）
 * 又依赖解释器。把插口单独放一层，环就断了。
 */

/** page.* 能碰界面的全部能力。选择器语法与 .cui 的编译产物一致
 *  （元件 → [data-t="…"]，类 → .cls，实例 → #id）。 */
export type PageBridge = {
  /** 读：输入框取值，其它元件取文字 */
  read(sel: string): string;
  /** 写：输入框写值，其它元件写文字（命中几个写几个） */
  write(sel: string, value: string): void;
  /** 加类 */
  add(sel: string, cls: string): void;
  /** 去类 */
  remove(sel: string, cls: string): void;
  /** 切换类（有就删没有就加） */
  toggle(sel: string, cls: string): void;
  /** 删除元素（命中的全删） */
  delete(sel: string): void;
  /** 复制一个元素到目标末尾，返回新元素的 #id */
  clone(sel: string, into: string): string;
  /** 命中了几个元素 */
  count(sel: string): number;
  /** 弹一句提示 */
  say(msg: string): void;
  /** 让输入框获得焦点 */
  focus(sel: string): void;
};

let bridge: PageBridge | null = null;

/** 注入界面宿主。预览面板和编译产物各注入一次；不注入时 page.* 明确报错。 */
export function setPageBridge(b: PageBridge | null): void {
  bridge = b;
}

export function needPageBridge(): PageBridge {
  if (!bridge) {
    throw new Error('page.* 是界面逻辑函数：写在 app/*.co 里，由 .cui 的 act call 调用；单独运行时没有界面可操作');
  }
  return bridge;
}
