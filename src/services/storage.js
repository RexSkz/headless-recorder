import chrome from 'webextension-polyfill'

export default {
  get(keys) {
    if (!chrome.storage || !chrome.storage.local) {
      return Promise.reject('Browser storage not available')
    }

    return chrome.storage.local.get(keys)
  },

  set(props) {
    if (!chrome.storage || !chrome.storage.local) {
      return Promise.reject('Browser storage not available')
    }

    return chrome.storage.local.set(props)
  },

  remove(keys) {
    if (!chrome.storage || !chrome.storage.local) {
      return Promise.reject('Browser storage not available')
    }

    return chrome.storage.local.remove(keys)
  },
}
