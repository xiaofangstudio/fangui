/* 构建期把打包好的引擎脚本当字符串内嵌（AOT 产物要用） */
declare module '*?raw' {
  const text: string;
  export default text;
}
