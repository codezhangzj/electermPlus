/**
 * database default should init
 */

function parsor (themeTxt) {
  return themeTxt.split('\n').reduce((prev, line) => {
    let [key = '', value = ''] = line.split('=')
    key = key.trim()
    value = value.trim()
    if (!key || !value) {
      return prev
    }
    prev[key] = value
    return prev
  }, {})
}

const ios18LightUi = () => {
  return parsor(`
main=#F9FBFC
main-dark=#EEF5F8
main-light=#FFFFFF
text=#263943
text-light=#10222D
text-dark=#748490
text-disabled=#8B9AA5
primary=#2FA8D6
info=#6B76E8
success=#31C176
error=#E25E54
warn=#F0B35A
  `)
}

const ios18DarkUi = () => {
  return parsor(`
main=#101C24
main-dark=#0B141A
main-light=#22323D
text=#DDEBF0
text-light=#FFFFFF
text-dark=#95AAB4
text-disabled=#60737E
primary=#2FA8D6
info=#6B76E8
success=#31C176
error=#FF6B63
warn=#FFD37A
  `)
}

const ios18GlassUi = () => {
  return parsor(`
main=#DFEAF0
main-dark=#DDE8EE
main-light=#FFFFFF
text=#263943
text-light=#13242F
text-dark=#748490
text-disabled=#8B9AA5
primary=#2FA8D6
info=#6B76E8
success=#31C176
error=#E25E54
warn=#F0B35A
  `)
}

const ios18LightTerminal = () => {
  return {
    foreground: '#172B36',
    background: '#FFFFFF',
    cursor: '#13242F',
    cursorAccent: '#FFFFFF',
    selectionBackground: 'rgba(47, 168, 214, 0.22)',
    black: '#172B36',
    red: '#E25E54',
    green: '#2EA66C',
    yellow: '#D38422',
    blue: '#257EA8',
    magenta: '#6B76E8',
    cyan: '#2FA8D6',
    white: '#F4F8FA',
    brightBlack: '#687B87',
    brightRed: '#F2766D',
    brightGreen: '#31C176',
    brightYellow: '#F0B35A',
    brightBlue: '#2FA8D6',
    brightMagenta: '#858CF0',
    brightCyan: '#56C7E8',
    brightWhite: '#FFFFFF'
  }
}

const ios18DarkTerminal = () => {
  return {
    foreground: '#DDEBF0',
    background: '#0E171E',
    cursor: '#31C176',
    cursorAccent: '#0E171E',
    selectionBackground: 'rgba(255, 255, 255, 0.18)',
    black: '#101C24',
    red: '#FF6B63',
    green: '#31C176',
    yellow: '#FFD37A',
    blue: '#7CD4FF',
    magenta: '#A8A7FF',
    cyan: '#7BE3D0',
    white: '#DDEBF0',
    brightBlack: '#5F727E',
    brightRed: '#FF918A',
    brightGreen: '#98F0B6',
    brightYellow: '#FFE0A3',
    brightBlue: '#A9E3FF',
    brightMagenta: '#C7C5FF',
    brightCyan: '#A7EFE2',
    brightWhite: '#F4FAFC'
  }
}

const ios18GlassTerminal = () => {
  return {
    foreground: '#172B36',
    background: 'rgba(255, 255, 255, 0.58)',
    cursor: '#13242F',
    cursorAccent: '#FFFFFF',
    selectionBackground: 'rgba(107, 118, 232, 0.22)',
    black: '#172B36',
    red: '#E25E54',
    green: '#2EA66C',
    yellow: '#D38422',
    blue: '#257EA8',
    magenta: '#6B76E8',
    cyan: '#2FA8D6',
    white: '#F4F8FA',
    brightBlack: '#687B87',
    brightRed: '#F2766D',
    brightGreen: '#31C176',
    brightYellow: '#F0B35A',
    brightBlue: '#2FA8D6',
    brightMagenta: '#858CF0',
    brightCyan: '#56C7E8',
    brightWhite: '#FFFFFF'
  }
}

export function defaultTheme () {
  return {
    id: 'default',
    name: 'iOS18 白底工作台',
    themeConfig: ios18LightTerminal(),
    uiThemeConfig: ios18LightUi()
  }
}

export function defaultThemeDark () {
  return {
    id: 'defaultDark',
    name: 'iOS18 黑底专注',
    themeConfig: ios18DarkTerminal(),
    uiThemeConfig: ios18DarkUi()
  }
}

export function defaultThemeGlass () {
  return {
    id: 'defaultGlass',
    name: 'iOS18 磨砂透明',
    themeConfig: ios18GlassTerminal(),
    uiThemeConfig: ios18GlassUi()
  }
}

export function defaultThemeLight () {
  return defaultThemeDark()
}

export function getBuiltinThemes () {
  return [
    defaultTheme(),
    defaultThemeDark(),
    defaultThemeGlass()
  ]
}

export function isBuiltinTheme (id) {
  return getBuiltinThemes().some(theme => theme.id === id)
}
