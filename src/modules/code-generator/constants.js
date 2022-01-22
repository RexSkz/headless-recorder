export const headlessActions = {
  GOTO: 'GOTO',
  VIEWPORT: 'VIEWPORT',
  WAITFORSELECTOR: 'WAITFORSELECTOR',
  NAVIGATION: 'NAVIGATION',
  NAVIGATION_PROMISE: 'NAVIGATION_PROMISE',
  TAB_CREATE: 'TAB_CREATE',
  TAB_CHANGE: 'TAB_CHANGE',
  FRAME_SET: 'FRAME_SET',
  SCREENSHOT: 'SCREENSHOT',
}

export const eventsToRecord = {
  CLICK: 'click',
  DBLCLICK: 'dblclick',
  CHANGE: 'change',
  KEYDOWN: 'keydown',
  SELECT: 'select',
  SUBMIT: 'submit',
  LOAD: 'load',
  UNLOAD: 'unload',
}

export const eventsOptimized = {
  FILL: 'fill',
}

export const headlessTypes = {
  PUPPETEER: 'puppeteer',
  PLAYWRIGHT: 'playwright',
  RESULTS: 'results',
}
