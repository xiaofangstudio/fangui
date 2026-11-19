// FangUI 设计令牌 —— Fangwork 生态统一设计语言的唯一出处
// 风格基调：现代 Fluent（WinUI 3 式）—— 扁平为底 + 轻拟物点缀
// 层级靠分层底色与细描边表达，阴影极轻；改这里，所有组件跟着变

const radius = { xs: '2px', s: '4px', m: '8px', l: '12px', full: '999px' }
const space = { xs: '4px', s: '8px', m: '12px', l: '16px', xl: '24px', xxl: '36px' }
const font = { caption: '12px', body: '14px', subtitle: '20px', title: '28px' }

export const light = {
  color: {
    // 品牌强调色（WinUI 系统蓝打底，定稿时改这一个值）
    accent: '#005FB8',
    accentHover: '#1A73C9',
    accentPressed: '#0054A6',
    onAccent: '#FFFFFF',

    // 文本（Fluent type 分级）
    text: '#1B1B1B',
    textSecondary: '#5D5D5D',
    textDisabled: '#9D9D9D',
    textOnAccentSecondary: 'rgba(255, 255, 255, 0.78)',

    // 背景与层
    bg: '#F3F3F3',          // 窗口底（Mica 的纯色近似）
    layer: '#FFFFFF',       // 卡片 / 浮层
    layerAlt: '#F9F9F9',    // 次级卡片

    // 控件状态层（Fluent control fills 的纯色近似）
    control: '#FBFBFB',
    controlHover: '#F6F6F6',
    controlPressed: '#F1F1F1',
    controlDisabled: 'rgba(249, 249, 249, 0.5)',

    // 描边
    controlStroke: 'rgba(0, 0, 0, 0.06)',      // 控件细描边
    controlStrongStroke: 'rgba(0, 0, 0, 0.12)', // 强描边 / 输入框
    divider: 'rgba(0, 0, 0, 0.08)',

    // 语义色
    success: '#0F7B0F',
    warning: '#9D5D00',
    danger: '#C42B1C',
    dangerHover: '#D13C2D',
    dangerPressed: '#B1251A',

    // 焦点环（双层）
    focusOuter: '#000000',
    focusInner: '#FFFFFF',

    // 轻阴影（只给浮层用，控件不靠阴影分层）
    shadowFlyout: '0 4px 8px rgba(0, 0, 0, 0.14)',
    shadowDialog: '0 8px 16px rgba(0, 0, 0, 0.14)',
  },
  radius,
  space,
  font,
}

export const dark = {
  color: {
    accent: '#4CC2FF',
    accentHover: '#5CCBFF',
    accentPressed: '#3EA8E6',
    onAccent: '#001322',

    text: '#FFFFFF',
    textSecondary: '#C8C8C8',
    textDisabled: '#787878',
    textOnAccentSecondary: 'rgba(0, 19, 34, 0.72)',

    bg: '#202020',
    layer: '#2B2B2B',
    layerAlt: '#262626',

    control: '#2D2D2D',
    controlHover: '#323232',
    controlPressed: '#373737',
    controlDisabled: 'rgba(45, 45, 45, 0.5)',

    controlStroke: 'rgba(255, 255, 255, 0.07)',
    controlStrongStroke: 'rgba(255, 255, 255, 0.14)',
    divider: 'rgba(255, 255, 255, 0.08)',

    success: '#6CCB5F',
    warning: '#F7C244',
    danger: '#FF99A4',
    dangerHover: '#FFA9B3',
    dangerPressed: '#F07E8C',

    focusOuter: '#FFFFFF',
    focusInner: '#000000',

    shadowFlyout: '0 4px 8px rgba(0, 0, 0, 0.37)',
    shadowDialog: '0 8px 16px rgba(0, 0, 0, 0.37)',
  },
  radius,
  space,
  font,
}

const themes = { light, dark }
let active = 'light'

export function setTheme(name) {
  if (!themes[name]) throw new Error(`FangUI: 未知主题 "${name}"，可选 light / dark`)
  active = name
}

export function getTheme() {
  return active
}

// 取令牌：token('color.accent')、token('radius.s')
export function token(path) {
  let node = themes[active]
  for (const key of path.split('.')) {
    node = node?.[key]
    if (node === undefined) throw new Error(`FangUI: 令牌不存在 "${path}"`)
  }
  return node
}
