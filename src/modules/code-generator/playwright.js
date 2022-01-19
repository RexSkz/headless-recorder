import Block from '@/modules/code-generator/block'
import { headlessActions, eventsToRecord } from '@/modules/code-generator/constants'
import BaseGenerator from '@/modules/code-generator/base-generator'

const importPlaywright = `const { chromium } = require('playwright');\n`

const header = `const browser = await chromium.launch()
const context = await browser.newContext()
let page = await context.newPage()`

const footer = `await browser.close()`

const wrappedHeader = `(async () => {
  ${header}\n`

const wrappedFooter = `  ${footer}
})()`

export default class PlaywrightCodeGenerator extends BaseGenerator {
  constructor(options) {
    super(options)
    this._header = header
    this._footer = footer
    this._wrappedHeader = wrappedHeader
    this._wrappedFooter = wrappedFooter
  }

  generate(events) {
    return importPlaywright + this._getHeader() + this._parseEvents(events) + this._getFooter()
  }

  _handleViewport(width, height) {
    return new Block(this._frameId, {
      type: headlessActions.VIEWPORT,
      value: `await ${this._frame}.setViewportSize({ width: ${width}, height: ${height} })`,
    })
  }

  _handleClick(selector, events, index) {
    const block = super._handleClick(selector, events, index)
    if (this._options.waitForNetworkIdleAfterClick) {
      block.addLine({
        type: eventsToRecord.CLICK,
        value: `await page.waitForLoadState('networkidle')`,
      })
    }
    return block
  }

  _handleChange(selector, value) {
    return new Block(this._frameId, {
      type: headlessActions.CHANGE,
      value: `await ${this._frame}.selectOption('${selector}', '${value}')`,
    })
  }
}
