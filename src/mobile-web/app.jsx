import { useEffect, useState } from 'react'
import logoUrl from '../client/assets/logo/electerm-plus-mark.svg'
import MobileTerminal from './mobile-terminal.jsx'
import {
  createSshSession,
  getAuthStatus,
  login,
  logout
} from './api.js'

const RECENT_HOSTS_KEY = 'electerm-mobile-recent-hosts'
const emptyConnection = {
  host: '',
  username: '',
  port: '22',
  password: ''
}

function readRecentHosts () {
  try {
    const value = JSON.parse(window.localStorage.getItem(RECENT_HOSTS_KEY) || '[]')
    return Array.isArray(value) ? value.slice(0, 5) : []
  } catch {
    return []
  }
}

function saveRecentHost (connection) {
  const recent = readRecentHosts().filter(item => (
    item.host !== connection.host ||
    item.port !== connection.port ||
    item.username !== connection.username
  ))
  const next = [{
    host: connection.host,
    name: connection.host,
    port: connection.port,
    username: connection.username
  }, ...recent].slice(0, 5)
  window.localStorage.setItem(RECENT_HOSTS_KEY, JSON.stringify(next))
  return next
}

export default function MobileSshApp () {
  const [authState, setAuthState] = useState('checking')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [view, setView] = useState('home')
  const [connection, setConnection] = useState(emptyConnection)
  const [recentHosts, setRecentHosts] = useState(readRecentHosts)
  const [connecting, setConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  const [hostKeyPrompt, setHostKeyPrompt] = useState(null)
  const [activeServer, setActiveServer] = useState(null)
  const [sessionId, setSessionId] = useState('')

  useEffect(() => {
    getAuthStatus()
      .then(result => setAuthState(result.authenticated ? 'authenticated' : 'guest'))
      .catch(() => setAuthState('guest'))
  }, [])

  useEffect(() => {
    const viewport = window.visualViewport
    const root = document.documentElement
    let frame = 0
    const updateViewportHeight = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        root.style.setProperty(
          '--mobile-viewport-height',
          `${Math.round(viewport?.height || window.innerHeight)}px`
        )
      })
    }
    updateViewportHeight()
    viewport?.addEventListener('resize', updateViewportHeight)
    window.addEventListener('resize', updateViewportHeight)
    return () => {
      viewport?.removeEventListener('resize', updateViewportHeight)
      window.removeEventListener('resize', updateViewportHeight)
      if (frame) window.cancelAnimationFrame(frame)
      root.style.removeProperty('--mobile-viewport-height')
    }
  }, [])

  const submitLogin = async (event) => {
    event.preventDefault()
    setLoginError('')
    try {
      await login(loginPassword)
      setLoginPassword('')
      setAuthState('authenticated')
    } catch (err) {
      setLoginError(err.message)
    }
  }

  const submitConnection = async (event, acceptHostFingerprint = '') => {
    event?.preventDefault()
    if (connecting) return
    setConnecting(true)
    setConnectionError('')
    try {
      const result = await createSshSession({
        ...connection,
        acceptHostFingerprint,
        cols: 80,
        rows: 24
      })
      const server = {
        host: connection.host.trim(),
        name: connection.host.trim(),
        port: Number(connection.port),
        username: connection.username.trim()
      }
      setRecentHosts(saveRecentHost(server))
      setActiveServer(server)
      setSessionId(result.sessionId)
      setHostKeyPrompt(null)
      setConnection(current => ({ ...current, password: '' }))
      setView('terminal')
    } catch (err) {
      if (err.status === 401) {
        setAuthState('guest')
        setLoginError('登录会话已过期，请重新登录。')
      } else if (err.code === 'HOST_KEY_CONFIRM_REQUIRED') {
        setHostKeyPrompt(err.hostKeyPrompt)
      } else {
        setConnectionError(err.message)
      }
    } finally {
      setConnecting(false)
    }
  }

  const openConnection = (recent) => {
    setConnection({
      host: recent?.host || '',
      username: recent?.username || '',
      port: String(recent?.port || 22),
      password: ''
    })
    setConnectionError('')
    setHostKeyPrompt(null)
    setView('quick')
  }

  const disconnect = () => {
    setSessionId('')
    setActiveServer(null)
    setView('home')
  }

  const doLogout = async () => {
    try { await logout() } catch {}
    disconnect()
    setAuthState('guest')
  }

  const updateConnection = (event) => {
    const { name, value } = event.target
    setConnection(current => ({ ...current, [name]: value }))
  }

  return (
    <main className='mobile-ssh-page'>
      <section className='mobile-ssh-app' aria-label='Electerm Plus 移动 SSH'>
        <header className='mobile-app-header'>
          <div className='mobile-brand'>
            <img src={logoUrl} alt='' />
            <div>
              <strong>Electerm Plus</strong>
              <span>移动 SSH</span>
            </div>
          </div>
          {authState === 'authenticated'
            ? (
              <button className='logout-button' type='button' onClick={doLogout}>退出登录</button>
              )
            : <span className='gateway-status'><i aria-hidden='true' />安全网关</span>}
        </header>

        {authState === 'checking' && (
          <div className='mobile-view loading-view'>正在检查安全会话…</div>
        )}

        {authState === 'guest' && (
          <div className='mobile-view login-view'>
            <div className='login-copy'>
              <span className='login-icon'>›_</span>
              <h1>登录移动终端</h1>
              <p>使用网关管理员密码继续。登录状态只保存在 HttpOnly 安全 Cookie 中。</p>
            </div>
            <form className='login-form' onSubmit={submitLogin}>
              <label htmlFor='mobile-admin-password'>管理员密码</label>
              <input
                id='mobile-admin-password'
                type='password'
                value={loginPassword}
                onChange={event => setLoginPassword(event.target.value)}
                autoComplete='current-password'
                required
              />
              {loginError && <p className='form-error' role='alert'>{loginError}</p>}
              <button className='primary-button' type='submit'>安全登录</button>
            </form>
          </div>
        )}

        {authState === 'authenticated' && view === 'home' && (
          <div className='mobile-view home-view'>
            <div className='mobile-view-heading'>
              <div>
                <h1>SSH 连接</h1>
                <p>{recentHosts.length ? `${recentHosts.length} 个最近连接` : '尚无最近连接'}</p>
              </div>
              <button className='primary-button compact-button' type='button' onClick={() => openConnection()}>
                新建连接
              </button>
            </div>

            <div className='demo-notice secure-notice'>
              <span>已登录</span>
              <p>终端流量通过同源 WSS 转发，SSH 密码不会写入浏览器存储。</p>
            </div>

            {recentHosts.length
              ? (
                <div className='server-list'>
                  {recentHosts.map(recent => (
                    <button
                      className='server-row'
                      type='button'
                      key={`${recent.username}@${recent.host}:${recent.port}`}
                      onClick={() => openConnection(recent)}
                    >
                      <span className='server-avatar' aria-hidden='true'>{recent.host.slice(0, 1).toUpperCase()}</span>
                      <span className='server-copy'>
                        <strong>{recent.host}</strong>
                        <small>{recent.username}@{recent.host}:{recent.port}</small>
                      </span>
                      <svg viewBox='0 0 24 24' aria-hidden='true'><path d='m9 18 6-6-6-6' /></svg>
                    </button>
                  ))}
                </div>
                )
              : (
                <div className='empty-state'>
                  <strong>还没有连接记录</strong>
                  <span>新建连接后只保存主机、端口和用户名，不保存 SSH 密码。</span>
                </div>
                )}
          </div>
        )}

        {authState === 'authenticated' && view === 'quick' && (
          <div className='mobile-view quick-view'>
            <div className='subpage-heading'>
              <button className='icon-button' type='button' aria-label='返回' onClick={() => setView('home')}>
                <svg viewBox='0 0 24 24' aria-hidden='true'><path d='m15 18-6-6 6-6' /></svg>
              </button>
              <div>
                <h1>建立 SSH 连接</h1>
                <p>目标必须在网关主机白名单中</p>
              </div>
            </div>

            <form className='quick-connect-form' onSubmit={submitConnection}>
              <label htmlFor='mobile-ssh-host'>主机地址</label>
              <input
                id='mobile-ssh-host'
                name='host'
                value={connection.host}
                onChange={updateConnection}
                autoCapitalize='none'
                autoCorrect='off'
                spellCheck='false'
                required
              />

              <label htmlFor='mobile-ssh-user'>用户名</label>
              <input
                id='mobile-ssh-user'
                name='username'
                value={connection.username}
                onChange={updateConnection}
                autoCapitalize='none'
                autoCorrect='off'
                spellCheck='false'
                autoComplete='username'
                required
              />

              <label htmlFor='mobile-ssh-port'>端口</label>
              <input
                id='mobile-ssh-port'
                name='port'
                type='number'
                inputMode='numeric'
                min='1'
                max='65535'
                value={connection.port}
                onChange={updateConnection}
                required
              />

              <label htmlFor='mobile-ssh-password'>SSH 密码</label>
              <input
                id='mobile-ssh-password'
                name='password'
                type='password'
                value={connection.password}
                onChange={updateConnection}
                autoComplete='off'
                required
              />

              {connectionError && <p className='form-error' role='alert'>{connectionError}</p>}

              {hostKeyPrompt && (
                <div className='host-key-prompt' role='alert'>
                  <strong>{hostKeyPrompt.name}</strong>
                  {(hostKeyPrompt.instructions || []).map(line => <span key={line}>{line}</span>)}
                  <button
                    className='warning-button'
                    type='button'
                    disabled={connecting}
                    onClick={() => submitConnection(null, hostKeyPrompt.fingerprint)}
                  >
                    我已核对，信任此指纹
                  </button>
                </div>
              )}

              <button className='primary-button connect-button' type='submit' disabled={connecting}>
                {connecting ? '正在连接…' : '建立连接'}
              </button>
            </form>
          </div>
        )}

        {authState === 'authenticated' && view === 'terminal' && activeServer && sessionId && (
          <MobileTerminal
            server={activeServer}
            sessionId={sessionId}
            onDisconnect={disconnect}
          />
        )}
      </section>
    </main>
  )
}
