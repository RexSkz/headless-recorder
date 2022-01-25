import badge from '@/services/badge'
import browser from '@/services/browser'
import storage from '@/services/storage'
import { popupActions, recordingControls } from '@/services/constants'
import { overlayActions } from '@/modules/overlay/constants'
import { headlessActions } from '@/modules/code-generator/constants'

import CodeGenerator from '@/modules/code-generator'

const MENU_ID_PREFIX = 'HEADLESS_RECORDER_CONTEXT_MENU_'

const CONTEXT_MENU_ID = {
  RECORD_HOVER: 'RECORD_HOVER',
  COPY_SELECTOR: 'COPY_SELECTOR',
}

chrome.contextMenus.create({
  title: 'Headless Recorder Action',
  id: MENU_ID_PREFIX,
  enabled: false,
})
chrome.contextMenus.create({
  title: 'Record hover event on element',
  contexts: ['all'],
  id: MENU_ID_PREFIX + CONTEXT_MENU_ID.RECORD_HOVER,
  parentId: MENU_ID_PREFIX,
})
chrome.contextMenus.create({
  title: 'Copy element selector',
  contexts: ['all'],
  id: MENU_ID_PREFIX + CONTEXT_MENU_ID.COPY_SELECTOR,
  parentId: MENU_ID_PREFIX,
})

class Background {
  constructor() {
    this._recording = []

    this._boundedContextMenuHandler = this.handleContextMenuClick.bind(this)

    this._boundedMessageHandler = this.handleMessage.bind(this)
    this._boundedOverlayHandler = this.handleOverlayMessage.bind(this)

    this._boundedTabCreateHandler = this.handleTabCreate.bind(this)
    this._boundedTabChangeHandler = this.handleTabChange.bind(this)

    this._boundedNavigationHandler = this.handleNavigation.bind(this)
    this._boundedSPAHandler = this.handleHistoryOrFragmentChange.bind(this)

    this._boundedWaitHandler = () => badge.wait()

    this._badgeState = ''
    this._isPaused = false

    // Some events are sent double on page navigations to simplify the event recorder.
    // We keep some simple state to disregard events if needed.
    this._hasGoto = false
    this._hasViewPort = false
  }

  init() {
    chrome.extension.onConnect.addListener(port => {
      port.onMessage.addListener(msg => this.handlePopupMessage(msg))
    })
  }

  async start() {
    await this.cleanUp()

    this._badgeState = ''
    this._hasGoto = false
    this._hasViewPort = false

    await browser.injectContentScript()
    this.toggleOverlay({ open: true, clear: true })

    chrome.contextMenus.update(MENU_ID_PREFIX, { enabled: true })
    chrome.contextMenus.onClicked.addListener(this._boundedContextMenuHandler)

    chrome.runtime.onMessage.addListener(this._boundedMessageHandler)
    chrome.runtime.onMessage.addListener(this._boundedOverlayHandler)

    chrome.tabs.onCreated.addListener(this._boundedTabCreateHandler)
    chrome.tabs.onActivated.addListener(this._boundedTabChangeHandler)

    chrome.webNavigation.onCompleted.addListener(this._boundedNavigationHandler)
    chrome.webNavigation.onBeforeNavigate.addListener(this._boundedWaitHandler)
    chrome.webNavigation.onHistoryStateUpdated.addListener(this._boundedSPAHandler)
    chrome.webNavigation.onReferenceFragmentUpdated.addListener(this._boundedSPAHandler)

    badge.start()
  }

  stop() {
    this._badgeState = this._recording.length > 0 ? '1' : ''

    chrome.contextMenus.update(MENU_ID_PREFIX, { enabled: false })
    chrome.contextMenus.onClicked.removeListener(this._boundedContextMenuHandler)

    chrome.runtime.onMessage.removeListener(this._boundedMessageHandler)
    // do not remove overlay handler

    chrome.tabs.onCreated.removeListener(this._boundedTabCreateHandler)
    chrome.tabs.onActivated.removeListener(this._boundedTabChangeHandler)

    chrome.webNavigation.onCompleted.removeListener(this._boundedNavigationHandler)
    chrome.webNavigation.onBeforeNavigate.removeListener(this._boundedWaitHandler)
    chrome.webNavigation.onHistoryStateUpdated.removeListener(this._boundedSPAHandler)
    chrome.webNavigation.onReferenceFragmentUpdated.removeListener(this._boundedSPAHandler)

    badge.stop(this._badgeState)

    storage.set({ recording: this._recording })
  }

  pause() {
    badge.pause()
    this._isPaused = true
  }

  unPause() {
    badge.start()
    this._isPaused = false
  }

  cleanUp() {
    this._recording = []
    this._isPaused = false
    badge.reset()

    return new Promise(function(resolve) {
      chrome.storage.local.remove('recording', () => resolve())
    })
  }

  recordCurrentUrl(href) {
    if (!this._hasGoto) {
      this.handleMessage({
        selector: undefined,
        value: undefined,
        action: headlessActions.GOTO,
        href,
      })
      this._hasGoto = true
    }
  }

  recordCurrentViewportSize(value) {
    if (!this._hasViewPort) {
      this.handleMessage({
        selector: undefined,
        value,
        action: headlessActions.VIEWPORT,
      })
      this._hasViewPort = true
    }
  }

  recordNavigation() {
    this.handleMessage({
      selector: undefined,
      value: undefined,
      action: headlessActions.NAVIGATION,
    })
  }

  recordTabCreate(value) {
    this.handleMessage({
      selector: undefined,
      value,
      action: headlessActions.TAB_CREATE,
    })
  }

  recordTabChange(value) {
    this.handleMessage({
      selector: undefined,
      value,
      action: headlessActions.TAB_CHANGE,
    })
  }

  recordScreenshot(value) {
    this.handleMessage({
      selector: undefined,
      value,
      action: headlessActions.SCREENSHOT,
    })
  }

  handleContextMenuClick({ menuItemId }) {
    switch (menuItemId) {
      case MENU_ID_PREFIX + CONTEXT_MENU_ID.RECORD_HOVER:
        browser.sendTabMessage({ action: 'RECORD_HOVER' })
        break
      case MENU_ID_PREFIX + CONTEXT_MENU_ID.COPY_SELECTOR:
        browser.sendTabMessage({ action: 'COPY_SELECTOR' })
        break
      default: // does nothing
    }
  }

  handleMessage(msg, sender) {
    if (msg.control) {
      return this.handleRecordingMessage(msg, sender)
    }

    if (msg.type === 'SIGN_CONNECT') {
      return
    }

    // NOTE: To account for clicks etc. we need to record the frameId
    // and url to later target the frame in playback
    msg.frameId = sender ? sender.frameId : null
    msg.frameUrl = sender ? sender.url : null

    if (!this._isPaused) {
      this._recording.push(msg)
      storage.set({ recording: this._recording })
    }
  }

  async handleOverlayMessage({ control }) {
    if (!control) {
      return
    }

    if (control === overlayActions.RESTART) {
      chrome.storage.local.set({ restart: true })
      chrome.storage.local.set({ clear: false })
      chrome.runtime.onMessage.removeListener(this._boundedOverlayHandler)
      this.stop()
      this.cleanUp()
      this.start()
    }

    if (control === overlayActions.CLOSE) {
      this.toggleOverlay()
      chrome.runtime.onMessage.removeListener(this._boundedOverlayHandler)
    }

    if (control === overlayActions.COPY) {
      const { options = {} } = await storage.get('options')
      const generator = new CodeGenerator(options)
      const code = generator.generate(this._recording)

      browser.sendTabMessage({
        action: 'CODE',
        value: options?.code?.showPlaywrightFirst ? code.playwright : code.puppeteer,
      })
    }

    if (control === overlayActions.STOP) {
      chrome.storage.local.set({ clear: true })
      chrome.storage.local.set({ pause: false })
      chrome.storage.local.set({ restart: false })
      this.stop()
    }

    if (control === overlayActions.UNPAUSE) {
      chrome.storage.local.set({ pause: false })
      this.unPause()
    }

    if (control === overlayActions.PAUSE) {
      chrome.storage.local.set({ pause: true })
      this.pause()
    }

    // TODO: the next 3 events do not need to be listened in background
    // content script controller, should be able to handle that directly from overlay
    if (control === overlayActions.CLIPPED_SCREENSHOT) {
      browser.sendTabMessage({ action: overlayActions.TOGGLE_SCREENSHOT_CLIPPED_MODE })
    }

    if (control === overlayActions.FULL_SCREENSHOT) {
      browser.sendTabMessage({ action: overlayActions.TOGGLE_SCREENSHOT_MODE })
    }

    if (control === overlayActions.ABORT_SCREENSHOT) {
      browser.sendTabMessage({ action: overlayActions.CLOSE_SCREENSHOT_MODE })
    }
  }

  handleRecordingMessage({ control, href, value, coordinates }) {
    if (control === recordingControls.EVENT_RECORDER_STARTED) {
      badge.setText(this._badgeState)
    }

    if (control === recordingControls.GET_VIEWPORT_SIZE) {
      this.recordCurrentViewportSize(coordinates)
    }

    if (control === recordingControls.GET_CURRENT_URL) {
      this.recordCurrentUrl(href)
    }

    if (control === recordingControls.GET_SCREENSHOT) {
      this.recordScreenshot(value)
    }
  }

  handlePopupMessage(msg) {
    if (!msg.action) {
      return
    }

    if (msg.action === popupActions.START) {
      this.start()
    }

    if (msg.action === popupActions.STOP) {
      browser.sendTabMessage({ action: popupActions.STOP })
      this.stop()
    }

    if (msg.action === popupActions.CLEAN_UP) {
      chrome.runtime.onMessage.removeListener(this._boundedOverlayHandler)
      msg.value && this.stop()
      this.toggleOverlay()
      this.cleanUp()
    }

    if (msg.action === popupActions.PAUSE) {
      if (!msg.stop) {
        browser.sendTabMessage({ action: popupActions.PAUSE })
      }
      this.pause()
    }

    if (msg.action === popupActions.UN_PAUSE) {
      if (!msg.stop) {
        browser.sendTabMessage({ action: popupActions.UN_PAUSE })
      }
      this.unPause()
    }
  }

  async handleNavigation({ frameId }) {
    await browser.injectContentScript()
    this.toggleOverlay({ open: true, pause: this._isPaused })

    if (frameId === 0) {
      this.recordNavigation()
    }
  }

  handleHistoryOrFragmentChange({ frameId }) {
    if (frameId === 0) {
      this.recordNavigation()
    }
  }

  handleTabCreate(tab) {
    this.recordTabCreate(tab.id)
  }

  handleTabChange(activeInfo) {
    this.recordTabChange(activeInfo.tabId)
  }

  // TODO: Use a better naming convention for this arguments
  toggleOverlay({ open = false, clear = false, pause = false } = {}) {
    browser.sendTabMessage({ action: overlayActions.TOGGLE_OVERLAY, value: { open, clear, pause } })
  }
}

window.headlessRecorder = new Background()
window.headlessRecorder.init()
