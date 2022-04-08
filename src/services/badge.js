import chrome from 'webextension-polyfill'

const DEFAULT_COLOR = '#45C8F1'
const RECORDING_COLOR = '#FF0000'

const DEFAULT_LOGO = '/images/logo.png'
const RECORDING_LOGO = '/images/logo-red.png'
const PAUSE_LOGO = '/images/logo-yellow.png'

export default {
  stop(text) {
    chrome.action.setIcon({ path: DEFAULT_LOGO })
    chrome.action.setBadgeBackgroundColor({ color: DEFAULT_COLOR })
    this.setText(text)
  },

  reset() {
    this.setText('')
  },

  setText(text) {
    chrome.action.setBadgeText({ text })
  },

  pause() {
    chrome.action.setIcon({ path: PAUSE_LOGO })
  },

  start() {
    chrome.action.setIcon({ path: RECORDING_LOGO })
  },

  wait() {
    chrome.action.setBadgeBackgroundColor({ color: RECORDING_COLOR })
    this.setText('wait')
  },
}
