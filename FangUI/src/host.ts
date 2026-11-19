/* FangUI 宿主适配层。
 *
 * 框架本身不认任何具体环境：Copper 的 `import` 要读文件，编译要写文件，
 * 这些能力由宿主注入。Float Studio 注入 Tauri 的实现；Node 里注入 fs；
 * 浏览器里不注入，用到的功能会给出明确提示，而不是悄悄失败。
 */

export type FangHost = {
  /** 读一个脚本文件的源码（Copper 的 import 用） */
  readText(path: string): Promise<string>;
};

let host: FangHost | null = null;

/** 注入宿主能力；传 null 表示卸载 */
export function setFangHost(h: FangHost | null): void {
  host = h;
}

/** 拿到宿主；没注入就返回 null（调用方决定降级还是报错） */
export function fangHost(): FangHost | null {
  return host;
}

/** 必须要有宿主的能力：没注入直接抛人话 */
export function needFangHost(what: string): FangHost {
  if (!host) {
    throw new Error(`${what} 需要宿主能力：先调用 setFangHost({ readText })`);
  }
  return host;
}
