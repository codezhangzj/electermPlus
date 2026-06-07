/**
 * theme related functions
 */

import {
  settingMap
} from '../common/constants'
import { convertTheme } from '../common/terminal-theme'
import {
  defaultTheme,
  getBuiltinThemes,
  isBuiltinTheme
} from '../common/theme-defaults'

export default Store => {
  Store.prototype.getTerminalThemes = function () {
    return getBuiltinThemes()
  }

  Store.prototype.setTheme = function (id) {
    if (!isBuiltinTheme(id)) {
      id = defaultTheme().id
    }
    window.store.updateConfig({
      theme: id
    })
  }

  Store.prototype.addTheme = function (theme) {
    window.store.addItem(theme, settingMap.terminalThemes)
  }

  Store.prototype.editTheme = function (id, updates) {
    return window.store.editItem(
      id, updates, settingMap.terminalThemes
    )
  }

  Store.prototype.delTheme = function ({ id }) {
    window.store.delItem({ id }, settingMap.terminalThemes)
  }

  Store.prototype.getThemeConfig = function () {
    const { store } = window
    const all = store.getSidebarList(settingMap.terminalThemes)
    return (all.find(d => d.id === store.config.theme) || defaultTheme()).themeConfig || {}
  }

  Store.prototype.fixThemes = function (themes) {
    const builtinThemes = getBuiltinThemes()
    return themes.map(t => {
      const builtinTheme = builtinThemes.find(theme => theme.id === t.id)
      if (builtinTheme) {
        Object.assign(t, builtinTheme)
      } else if (!t.uiThemeConfig) {
        t.uiThemeConfig = defaultTheme().uiThemeConfig
      }
      return t
    }).filter(t => isBuiltinTheme(t.id))
  }

  Store.prototype.setItermThemes = function (arr) {
    window.store.itermThemes = arr
  }

  Store.prototype.fetchItermThemes = async function () {
    const list = await window.pre.runGlobalAsync('listItermThemes')
    window.store.setItermThemes(
      list.map(d => {
        const obj = convertTheme(d)
        return {
          ...obj,
          id: 'iterm#' + obj.name,
          readonly: true,
          type: 'iterm'
        }
      })
    )
  }
}
