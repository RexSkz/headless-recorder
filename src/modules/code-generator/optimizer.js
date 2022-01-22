import { eventsToRecord, eventsOptimized, headlessActions } from './constants'
import { isPrintableKey, isIMECompositionKey, isModifierKey } from './key-types'

export default class Optimizer {
  constructor(options) {
    this.options = options
  }

  _squashKeydownAndChangeToFill(events) {
    const result = []
    for (const item of events) {
      switch (item.action) {
        case eventsToRecord.CHANGE: {
          // Don't squash the CHANGE event for SELECT
          if (item.tagName === 'SELECT') {
            result.push({ ...item })
            continue
          }
          // fallthrough
        }
        // eslint-disable-next-line no-fallthrough
        case eventsToRecord.KEYDOWN: {
          const nullKey = item.key === null
          const printableKey = isPrintableKey(item.key)
          const imeCompositionKey = isIMECompositionKey(item.key)
          // Just a normal KEYDOWN event.
          if (!nullKey && !printableKey && !imeCompositionKey) {
            result.push({ ...item })
            continue
          }
          const newChar = nullKey || imeCompositionKey ? '' : item.key
          // This is the start of a FILL event.
          if (!result.length) {
            result.push({
              ...item,
              action: eventsOptimized.FILL,
              value: item.value + newChar,
            })
            continue
          }
          // If 2 events happen in the same element, we can combine them.
          // Try to merge this event to the previous FILL event.
          const last = result[result.length - 1]
          if (
            last.action === eventsOptimized.FILL &&
            last.frameId === item.frameId &&
            last.href === item.href &&
            last.selector === item.selector &&
            last.tagName === item.tagName
          ) {
            last.value = item.value + newChar
            continue
          }
          // This is another start of a FILL event.
          result.push({
            ...item,
            action: eventsOptimized.FILL,
            value: item.value + newChar,
          })
          break
        }
        default:
          result.push({ ...item })
      }
    }
    return result
  }

  _removeDuplicateWaits(events) {
    const result = []
    for (const item of events) {
      if (result.length) {
        const last = result[result.length - 1]
        if (last.action === item.action && last.action === headlessActions.NAVIGATION) {
          continue
        }
      }
      result.push({ ...item })
    }
    return result
  }

  _removeDuplicateModifierKeyEvents(events) {
    const result = []
    for (const item of events) {
      if (result.length) {
        const last = result[result.length - 1]
        if (
          item.key === last.key &&
          item.action === last.action &&
          item.action === eventsToRecord.KEYDOWN &&
          isModifierKey(item.key) &&
          item.frameId === last.frameId
        ) {
          continue
        }
      }
      result.push({ ...item })
    }
    return result
  }

  optimize(events) {
    events = this._squashKeydownAndChangeToFill(events)
    events = this._removeDuplicateWaits(events)
    events = this._removeDuplicateModifierKeyEvents(events)
    return events
  }
}
