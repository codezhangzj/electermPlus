import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { getTerminalWebSocketUrl } from './api.js'

const shortcutData = {
  Esc: '\x1b',
  Tab: '\t',
  '↑': '\x1b[A',
  '↓': '\x1b[B',
  '←': '\x1b[D',
  '→': '\x1b[C'
}

export default function MobileTerminal ({ server, sessionId, onDisconnect }) {
  const terminalHostRef = useRef(null)
  const terminalRef = useRef(null)
  const socketRef = useRef(null)
  const sendInputRef = useRef(() => {})
  const ctrlActiveRef = useRef(false)
  const [ctrlActive, setCtrlActive] = useState(false)
  const [status, setStatus] = useState('连接中')

  useEffect(() => {
    const terminal = new Terminal({
      allowProposedApi: false,
      convertEol: false,
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: "'SFMono-Regular', 'SF Mono', Menlo, Monaco, Consolas, monospace",
      fontSize: 12,
      scrollback: 5000,
      theme: {
        background: '#101d25',
        foreground: '#dcebf0',
        cursor: '#69d6ff',
        black: '#101d25',
        blue: '#69d6ff',
        cyan: '#69d6ff',
        green: '#68dc96',
        red: '#f2837c',
        yellow: '#f0c36a'
      }
    })
    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(terminalHostRef.current)
    terminalRef.current = terminal
    const textarea = terminal.textarea
    textarea?.setAttribute('aria-label', 'Terminal input')
    textarea?.setAttribute('autocomplete', 'off')
    textarea?.setAttribute('autocapitalize', 'none')
    textarea?.setAttribute('autocorrect', 'off')
    textarea?.setAttribute('enterkeyhint', 'enter')
    textarea?.setAttribute('inputmode', 'text')
    textarea?.setAttribute('spellcheck', 'false')

    const socket = new window.WebSocket(getTerminalWebSocketUrl(sessionId))
    socket.binaryType = 'arraybuffer'
    socketRef.current = socket
    const pendingInput = []

    const sendInput = (data) => {
      const payload = JSON.stringify({ type: 'input', data })
      if (socket.readyState === window.WebSocket.CONNECTING) {
        pendingInput.push(payload)
        return
      }
      if (socket.readyState === window.WebSocket.OPEN) socket.send(payload)
    }
    sendInputRef.current = sendInput

    const handleTerminalInput = (data) => {
      if (ctrlActiveRef.current && data.length === 1) {
        const charCode = data.charCodeAt(0)
        if (charCode >= 1 && charCode <= 26) {
          sendInput(data)
          ctrlActiveRef.current = false
          setCtrlActive(false)
          return
        }
        const code = data.toUpperCase().charCodeAt(0) - 64
        if (code >= 1 && code <= 26) {
          sendInput(String.fromCharCode(code))
          ctrlActiveRef.current = false
          setCtrlActive(false)
          return
        }
      }
      sendInput(data)
    }

    const dataDisposable = terminal.onData(handleTerminalInput)
    let resizeTimer = 0
    let pendingResize = null
    const sendResize = () => {
      if (!pendingResize || socket.readyState !== window.WebSocket.OPEN) return
      socket.send(JSON.stringify({ type: 'resize', ...pendingResize }))
      pendingResize = null
    }
    const resizeDisposable = terminal.onResize(({ cols, rows }) => {
      pendingResize = { cols, rows }
      if (resizeTimer) window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        resizeTimer = 0
        sendResize()
      }, 80)
    })

    let fitFrame = 0
    const scheduleFit = () => {
      if (fitFrame) return
      fitFrame = window.requestAnimationFrame(() => {
        fitFrame = 0
        try { fitAddon.fit() } catch {}
      })
    }

    socket.addEventListener('open', () => {
      for (const payload of pendingInput) socket.send(payload)
      pendingInput.length = 0
      if (pendingResize) {
        if (resizeTimer) window.clearTimeout(resizeTimer)
        resizeTimer = 0
        sendResize()
      }
      setStatus('已连接')
      scheduleFit()
    })
    socket.addEventListener('message', event => {
      if (typeof event.data === 'string') {
        try {
          const message = JSON.parse(event.data)
          if (message.type === 'closed') {
            setStatus('已断开')
            terminal.writeln(`\r\n\x1b[31m${message.reason}\x1b[0m`)
          }
        } catch {
          terminal.write(event.data)
        }
        return
      }
      terminal.write(new Uint8Array(event.data))
    })
    socket.addEventListener('close', () => setStatus('已断开'))
    socket.addEventListener('error', () => {
      setStatus('连接错误')
      terminal.writeln('\r\n\x1b[31m终端 WebSocket 连接失败。\x1b[0m')
    })

    const resizeObserver = new window.ResizeObserver(scheduleFit)
    resizeObserver.observe(terminalHostRef.current)
    window.visualViewport?.addEventListener('resize', scheduleFit)
    scheduleFit()

    return () => {
      window.visualViewport?.removeEventListener('resize', scheduleFit)
      resizeObserver.disconnect()
      if (fitFrame) window.cancelAnimationFrame(fitFrame)
      if (resizeTimer) window.clearTimeout(resizeTimer)
      dataDisposable.dispose()
      resizeDisposable.dispose()
      if (socket.readyState === window.WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'close' }))
      }
      socket.close()
      terminal.dispose()
      sendInputRef.current = () => {}
      socketRef.current = null
      terminalRef.current = null
    }
  }, [sessionId])

  const focusTerminal = () => terminalRef.current?.focus()
  const keepTerminalFocus = (event) => event.preventDefault()

  const sendShortcut = (key) => {
    if (key === 'Ctrl') {
      ctrlActiveRef.current = !ctrlActiveRef.current
      setCtrlActive(ctrlActiveRef.current)
      focusTerminal()
      return
    }
    sendInputRef.current(shortcutData[key])
    focusTerminal()
  }

  const disconnect = () => {
    const socket = socketRef.current
    if (socket?.readyState === window.WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'close' }))
    }
    onDisconnect()
  }

  return (
    <div className='mobile-view terminal-view'>
      <div className='terminal-heading'>
        <button className='icon-button' type='button' aria-label='返回服务器列表' onClick={disconnect}>
          <svg viewBox='0 0 24 24' aria-hidden='true'><path d='m15 18-6-6 6-6' /></svg>
        </button>
        <div className='terminal-server-copy'>
          <strong>{server.name}</strong>
          <small>{server.username}@{server.host}:{server.port}</small>
        </div>
        <span className={`connected-badge ${status === '已连接' ? 'online' : ''}`}>
          <i aria-hidden='true' />{status}
        </span>
      </div>

      <div className='terminal-screen' onClick={focusTerminal}>
        <div className='xterm-host' ref={terminalHostRef} />
      </div>

      <div className='keyboard-hint'>
        <span>轻触终端，使用 iPhone 系统键盘输入</span>
        <button className='keyboard-button' type='button' onPointerDown={keepTerminalFocus} onClick={focusTerminal}>打开键盘</button>
      </div>

      <div className='terminal-shortcuts' aria-label='终端快捷键'>
        {['Ctrl', 'Esc', 'Tab', '↑', '↓', '←', '→'].map(key => (
          <button
            className={ctrlActive && key === 'Ctrl' ? 'active' : ''}
            type='button'
            key={key}
            aria-pressed={key === 'Ctrl' ? ctrlActive : undefined}
            onPointerDown={keepTerminalFocus}
            onClick={() => sendShortcut(key)}
          >
            {key}
          </button>
        ))}
      </div>

      <footer className='terminal-footer'>
        <span>WSS · UTF-8 · xterm-256color</span>
        <button type='button' onClick={disconnect}>断开</button>
      </footer>
    </div>
  )
}
