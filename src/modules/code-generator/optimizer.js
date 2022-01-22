import { eventsToRecord, headlessActions } from './constants'

export default class Optimizer {
  constructor(options) {
    this.options = options
  }

  squashKeydownToType(events) {
    const result = []
    for (const item of events) {
      if (result.length) {
        const last = result[result.length - 1]
        if (
          last.action === item.action &&
          last.action === eventsToRecord.KEYDOWN &&
          last.frameId === item.frameId &&
          last.href === item.href &&
          last.selector === item.selector &&
          last.tagName === item.tagName
        ) {
          result[result.length - 1] = item
          continue
        }
      }
      result.push(item)
    }
    return result
  }

  removeDuplicateWaits(events) {
    const result = []
    for (const item of events) {
      if (result.length) {
        const last = result[result.length - 1]
        if (last.action === item.action && last.action === headlessActions.NAVIGATION) {
          continue
        }
      }
      result.push(item)
    }
    return result
  }

  optimize(events) {
    events = this.squashKeydownToType(events)
    events = this.removeDuplicateWaits(events)
    return events
  }
}
