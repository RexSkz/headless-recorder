import Block from '@/modules/code-generator/block'
import {
  headlessActions,
  eventsToRecord,
  eventsByContextMenu,
  eventsOptimized,
} from '@/modules/code-generator/constants'

export const defaults = {
  wrapAsync: false,
  headless: true,
  waitForNavigation: true,
  waitForSelectorOnClick: true,
  blankLinesBetweenBlocks: true,
  dataAttribute: '',
  showPlaywrightFirst: true,
  key: 'Tab',
}

export default class BaseGenerator {
  constructor(options) {
    this._options = Object.assign(defaults, options)
    this._blocks = []
    this._frame = 'page'
    this._frameId = 0
    this._allFrames = {}
    this._screenshotCounter = 0

    // Maintain the order for opened tabs so that we can
    // handle the "tab change" event at the reply phase.
    //
    // This relys on a chromium implementation every time a tab is
    // created which generates an auto-increment id:
    // components/sessions/core/session_id_generator.cc:60
    //
    // We can assume the initial tab id is `0`.
    //
    // Please refer to `_handleTabCreate` and `_handleTabChange`
    // for more details.
    this._tabIds = [0]

    this._hasNavigation = false
  }

  generate() {
    throw new Error('Not implemented.')
  }

  _getHeader() {
    let hdr = this._options.wrapAsync ? this._wrappedHeader : this._header
    hdr = this._options.headless ? hdr : hdr?.replace('launch()', 'launch({ headless: false })')
    return hdr
  }

  _getFooter() {
    return this._options.wrapAsync ? this._wrappedFooter : this._footer
  }

  _parseEvents(events) {
    let result = ''

    if (!events) return result

    for (let i = 0; i < events.length; i++) {
      const { action, selector, value, href, key, tagName, frameId, frameUrl } = events[i]
      const escapedSelector = selector ? selector?.replace(/\\/g, '\\\\') : selector

      // we need to keep a handle on what frames events originate from
      this._setFrames(frameId, frameUrl)

      switch (action) {
        case eventsToRecord.KEYDOWN:
          this._blocks.push(this._handleKeyDown(key, events, i))
          break
        case eventsByContextMenu.HOVER:
          this._blocks.push(this._handleHover(escapedSelector))
          break
        case eventsByContextMenu.MOUSEMOVE:
          this._blocks.push(this._handleMousemove(escapedSelector, value))
          break
        case eventsToRecord.CLICK:
          this._blocks.push(this._handleClick(escapedSelector, events, i))
          break
        case eventsToRecord.CHANGE:
          if (tagName === 'SELECT') {
            this._blocks.push(this._handleChange(escapedSelector, value))
          }
          break
        case eventsOptimized.FILL:
          this._blocks.push(this._handleFill(escapedSelector, value))
          break
        case headlessActions.GOTO:
          this._blocks.push(this._handleGoto(href, frameId))
          break
        case headlessActions.VIEWPORT:
          this._blocks.push(this._handleViewport(value.width, value.height))
          break
        case headlessActions.NAVIGATION:
          this._blocks.push(this._handleWaitForNavigation())
          this._hasNavigation = true
          break
        case headlessActions.TAB_CREATE:
          this._blocks.push(this._handleTabCreate(value))
          break
        case headlessActions.TAB_CHANGE:
          this._blocks.push(this._handleTabChange(value))
          break
        case headlessActions.SCREENSHOT:
          this._blocks.push(this._handleScreenshot(value))
          break
      }
    }

    if (this._hasNavigation && this._options.waitForNavigation) {
      const block = new Block(this._frameId, {
        type: headlessActions.NAVIGATION_PROMISE,
        value: 'const navigationPromise = page.waitForNavigation()',
      })
      this._blocks.unshift(block)
    }

    this._postProcess()

    const indent = this._options.wrapAsync ? '  ' : ''
    const newLine = `\n`

    for (let block of this._blocks) {
      const lines = block.getLines()
      for (let line of lines) {
        result += indent + line.value + newLine
      }
    }

    return result
  }

  _setFrames(frameId, frameUrl) {
    if (frameId && frameId !== 0) {
      this._frameId = frameId
      this._frame = `frame_${frameId}`
      this._allFrames[frameId] = frameUrl
    } else {
      this._frameId = 0
      this._frame = 'page'
    }
  }

  _postProcess() {
    // when events are recorded from different frames, we want to add a frame setter near the code that uses that frame
    if (Object.keys(this._allFrames).length > 0) {
      this._postProcessSetFrames()
    }

    if (this._options.blankLinesBetweenBlocks && this._blocks.length > 0) {
      this._postProcessAddBlankLines()
    }
  }

  _handleKeyDown(key, events, index) {
    const block = new Block(this._frameId)
    const waitForPopup =
      events[index + 1]?.action === headlessActions.TAB_CREATE ? events[index + 1] : false
    if (waitForPopup) {
      block.addLine({
        type: eventsToRecord.KEYDOWN,
        value: `{
  const [newPage] = await Promise.all([
    page.waitForEvent('popup'),
    ${this._frame}.keyboard.press('${key}'),
  ])
  page = newPage
}`,
      })
    } else {
      block.addLine({
        type: eventsToRecord.KEYDOWN,
        value: `await ${this._frame}.keyboard.press('${key}'),`,
      })
    }
    return block
  }

  _handleFill(selector, value) {
    const block = new Block(this._frameId)
    block.addLine({
      type: eventsToRecord.KEYDOWN,
      value: `await ${this._frame}.fill('${selector}', '${this._escapeUserInput(value)}')`,
    })
    return block
  }

  _handleHover(selector) {
    return new Block(this._frameId, {
      type: eventsToRecord.CHANGE,
      value: `await ${this._frame}.hover('${selector}')`,
    })
  }

  _handleMousemove(selector, { x, y }) {
    return new Block(this._frameId, {
      type: eventsByContextMenu.MOUSEMOVE,
      value: `await ${this._frame}.mouse.move(${x}, ${y}, { steps: 100 }) // ${selector}`,
    })
  }

  _handleClick(selector, events, index) {
    const block = new Block(this._frameId)
    if (this._options.waitForSelectorOnClick) {
      block.addLine({
        type: eventsToRecord.CLICK,
        value: `await ${this._frame}.waitForSelector('${selector}')`,
      })
    }
    const waitForPopup =
      events[index + 1]?.action === headlessActions.TAB_CREATE ? events[index + 1] : false
    if (waitForPopup) {
      block.addLine({
        type: eventsToRecord.CLICK,
        value: `{
  const t = await Promise.all([
    page.waitForEvent('popup'),
    ${this._frame}.click('${selector}'),
  ])
  page = t[0]
}`,
      })
    } else {
      block.addLine({
        type: eventsToRecord.CLICK,
        value: `await ${this._frame}.click('${selector}')`,
      })
    }
    return block
  }

  _handleChange(selector, value) {
    return new Block(this._frameId, {
      type: eventsToRecord.CHANGE,
      value: `await ${this._frame}.select('${selector}', '${value}')`,
    })
  }

  _handleGoto(href) {
    return new Block(this._frameId, {
      type: headlessActions.GOTO,
      value: `await ${this._frame}.goto('${href}')`,
    })
  }

  _handleViewport() {
    throw new Error('Not implemented.')
  }

  _handleScreenshot(value) {
    this._screenshotCounter += 1

    if (value) {
      return new Block(this._frameId, {
        type: headlessActions.SCREENSHOT,
        value: `const element${this._screenshotCounter} = await page.$('${value}')
await element${this._screenshotCounter}.screenshot({ path: 'screenshot_${this._screenshotCounter}.png' })`,
      })
    }

    return new Block(this._frameId, {
      type: headlessActions.SCREENSHOT,
      value: `await ${this._frame}.screenshot({ path: 'screenshot_${this._screenshotCounter}.png', fullPage: true })`,
    })
  }

  _handleWaitForNavigation() {
    const block = new Block(this._frameId)
    if (this._options.waitForNavigation) {
      block.addLine({
        type: headlessActions.NAVIGATION,
        value: `await navigationPromise`,
      })
    }
    return block
  }

  _handleTabCreate(value) {
    if (value) {
      this._tabIds.push(value)
    }
    // no code generated here
    return new Block(this._frameId)
  }

  _handleTabChange(value) {
    const block = new Block(this._frameId)
    if (value) {
      const pageIndex = Math.max(this._tabIds.indexOf(value), 0)
      block.addLine({
        type: headlessActions.TAB_CHANGE,
        value: `page = context.pages()[${pageIndex}]`,
      })
      block.addLine({
        type: headlessActions.TAB_CHANGE,
        value: `await page.bringToFront()`,
      })
    }
    return block
  }

  _postProcessSetFrames() {
    for (let [i, block] of this._blocks.entries()) {
      const lines = block.getLines()
      for (let line of lines) {
        if (line.frameId && Object.keys(this._allFrames).includes(line.frameId.toString())) {
          const declaration = `const frame_${line.frameId} = frames.find(f => f.url() === '${
            this._allFrames[line.frameId]
          }')`
          this._blocks[i].addLineToTop({
            type: headlessActions.FRAME_SET,
            value: declaration,
          })
          this._blocks[i].addLineToTop({
            type: headlessActions.FRAME_SET,
            value: 'let frames = await page.frames()',
          })
          delete this._allFrames[line.frameId]
          break
        }
      }
    }
  }

  _postProcessAddBlankLines() {
    let i = 0
    while (i <= this._blocks.length) {
      const blankLine = new Block()
      blankLine.addLine({ type: null, value: '' })
      this._blocks.splice(i, 0, blankLine)
      i += 2
    }
  }

  _escapeUserInput(value) {
    return value?.replace(/\\/g, '\\\\')?.replace(/'/g, "\\'")
  }
}
