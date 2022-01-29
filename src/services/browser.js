const CONTENT_SCRIPT_PATH = 'js/content-script.js'
const BASEURL = process.env.VUE_APP_JARVIS_HOST || 'https://jarvis.ssc.shopee.io'
const RUN_URL = `${BASEURL}/test-case/create`
const DOCS_URL = `${BASEURL}/help/instruction`
const SIGNUP_URL = `${BASEURL}/?from=Chrome+Extension`

export default {
  getActiveTab() {
    return new Promise(function(resolve) {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => resolve(tab))
    })
  },

  async sendTabMessage({ action, value, clean } = {}) {
    const tab = await this.getActiveTab()
    chrome.tabs.sendMessage(tab.id, { action, value, clean })
  },

  injectContentScript() {
    return new Promise(function(resolve) {
      chrome.tabs.executeScript({ file: CONTENT_SCRIPT_PATH, allFrames: false }, res =>
        resolve(res)
      )
    })
  },

  copyToClipboard(text) {
    return navigator.permissions.query({ name: 'clipboard-write' }).then(result => {
      if (result.state !== 'granted' && result.state !== 'prompt') {
        return Promise.reject()
      }

      navigator.clipboard.writeText(text)
    })
  },

  getCookie() {
    return new Promise(function(resolve) {
      chrome.cookies.getAll({}, res => resolve(res.find(cookie => cookie.name.startsWith('ssc_'))))
    })
  },

  getBackgroundBus() {
    return chrome.extension.connect({ name: 'recordControls' })
  },

  openOptionsPage() {
    chrome.runtime.openOptionsPage?.()
  },

  openHelpPage() {
    chrome.tabs.create({ url: DOCS_URL })
  },

  createJarvisTestCase({ events, isLoggedIn }) {
    if (!isLoggedIn) {
      chrome.tabs.create({ url: SIGNUP_URL })
      return
    }

    const data = encodeURIComponent(btoa(JSON.stringify(events)))
    const url = `${RUN_URL}#events/${data}`
    chrome.tabs.create({ url })
  },
}
