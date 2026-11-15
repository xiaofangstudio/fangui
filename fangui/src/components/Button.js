import { ButtonWidget, LabelWidget } from 'deft:ui'
import { token } from '../theme/tokens.js'

// FangUI Button —— WinUI 3 式四变体
// 用法：new Button({ text: '确定', variant: 'accent', onClick })
// TODO: hover/pressed 状态切换待 demo 验证 Deft 事件 API 后接入

const VARIANTS = {
  // 强调按钮：实心 accent
  accent: () => ({
    backgroundColor: token('color.accent'),
    color: token('color.onAccent'),
    border: `1px solid ${token('color.controlStroke')}`,
  }),
  // 标准按钮：浅控件底 + 细描边
  standard: () => ({
    backgroundColor: token('color.control'),
    color: token('color.text'),
    border: `1px solid ${token('color.controlStroke')}`,
  }),
  // 次要按钮：透明底，hover 才出控件底
  subtle: () => ({
    backgroundColor: 'transparent',
    color: token('color.text'),
    border: 'none',
  }),
  // 轮廓按钮：透明底 + 强描边
  outline: () => ({
    backgroundColor: 'transparent',
    color: token('color.text'),
    border: `1px solid ${token('color.controlStrongStroke')}`,
  }),
  danger: () => ({
    backgroundColor: token('color.danger'),
    color: '#FFFFFF',
    border: 'none',
  }),
}

// Fluent 尺寸：高度 32/28/24 对应 padding
const SIZES = {
  s: () => ({ padding: '3px 10px', fontSize: token('font.caption') }),
  m: () => ({ padding: '5px 12px', fontSize: token('font.body') }),
  l: () => ({ padding: '7px 16px', fontSize: token('font.body') }),
}

export class Button {
  constructor({ text = 'Button', variant = 'standard', size = 'm', disabled = false, onClick } = {}) {
    this.el = new ButtonWidget()
    this.label = new LabelWidget()
    this.label.text = text
    this.el.addChild(this.label)

    this.variant = variant
    this.size = size
    this.el.disabled = disabled
    if (onClick) this.el.bindClick(onClick)
    this._applyStyle()
  }

  set text(value) {
    this.label.text = value
  }

  set disabled(value) {
    this.el.disabled = value
    this.label.style = { color: value ? token('color.textDisabled') : this._foreColor() }
  }

  set variant(value) {
    if (!VARIANTS[value]) throw new Error(`FangUI Button: 未知变体 "${value}"`)
    this._variant = value
    this._applyStyle()
  }

  set size(value) {
    if (!SIZES[value]) throw new Error(`FangUI Button: 未知尺寸 "${value}"`)
    this._size = value
    this._applyStyle()
  }

  _foreColor() {
    return this._variant === 'accent' ? token('color.onAccent') : token('color.text')
  }

  _applyStyle() {
    this.el.style = {
      borderRadius: token('radius.s'),   // Fluent 控件 4px 圆角
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      ...VARIANTS[this._variant](),
      ...SIZES[this._size](),
    }
    this.label.style = { color: this._foreColor(), fontSize: SIZES[this._size]().fontSize }
  }
}
