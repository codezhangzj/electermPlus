import { Component } from 'react'
import { refsStatic } from '../common/ref'
import AIIcon from '../icons/ai-icon'

const e = window.translate

export default class TerminalSelectionActions extends Component {
  state = {
    visible: false,
    x: 0,
    y: 0,
    text: ''
  }

  _mouseX = 0
  _mouseY = 0

  componentDidMount () {
    refsStatic.add('terminal-selection-actions', this)
    document.addEventListener('mousemove', this.onMouseMove)
  }

  componentWillUnmount () {
    refsStatic.remove('terminal-selection-actions')
    document.removeEventListener('mousemove', this.onMouseMove)
  }

  onMouseMove = (e) => {
    this._mouseX = e.clientX
    this._mouseY = e.clientY
  }

  onSelection = (txt) => {
    if (txt && txt.trim().length > 5) {
      this.setState({
        visible: true,
        x: this._mouseX,
        y: this._mouseY,
        text: txt.trim()
      })
    } else {
      this.setState({ visible: false })
    }
  }

  handleExplainWithAi = () => {
    this.setState({ visible: false })
    if (window.store && window.store.explainWithAi) {
      window.store.explainWithAi(this.state.text)
    }
  }

  render () {
    const { visible, x, y } = this.state
    if (!visible) {
      return null
    }
    const isDark = document.body.classList.contains('app-theme-defaultDark') || document.body.classList.contains('app-theme-catppuccin') || document.body.classList.contains('app-theme-nord')
    const bg = isDark ? 'linear-gradient(180deg, rgba(43, 63, 76, .9), rgba(25, 41, 51, .82))' : 'linear-gradient(180deg, rgba(255, 255, 255, .92), rgba(247, 251, 253, .82))'
    const color = isDark ? '#DDEBF0' : 'var(--text)'
    const borderColor = isDark ? 'rgba(169, 204, 224, .16)' : 'var(--ios-border)'
    return (
      <div
        style={{
          position: 'fixed',
          left: x,
          top: y - 48,
          zIndex: 9999,
          transform: 'translateX(-50%)',
          pointerEvents: 'auto'
        }}
      >
        <div
          className='terminal-selection-action-btn'
          onClick={this.handleExplainWithAi}
          style={{
            background: bg,
            backdropFilter: 'blur(32px) saturate(1.2)',
            border: `1px solid ${borderColor}`,
            boxShadow: '0 8px 18px rgba(0, 0, 0, .15), inset 0 1px 0 rgba(255, 255, 255, .1)',
            padding: '6px 12px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            fontSize: '12px',
            color,
            transition: 'all .2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)'
            e.currentTarget.style.color = '#0A84FF'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.color = color
          }}
        >
          <AIIcon className='mg1r' />
          <span>{e('explainWithAi')}</span>
        </div>
      </div>
    )
  }
}
