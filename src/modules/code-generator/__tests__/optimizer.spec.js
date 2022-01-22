import Optimizer from '../optimizer'

describe('Optimizer', () => {
  test('it should optimize correctly', () => {
    const events = [
      {
        action: 'click',
        coordinates: null,
        frameId: 0,
        frameUrl: 'https://example.com/',
        href: null,
        keyCode: null,
        selector: '.form-control',
        tagName: 'INPUT',
        value: '',
      },
      {
        action: 'keydown',
        coordinates: null,
        frameId: 0,
        frameUrl: 'https://example.com/',
        href: null,
        keyCode: 229,
        selector: '.form-control',
        tagName: 'INPUT',
        value: '',
      },
      {
        action: 'keydown',
        coordinates: null,
        frameId: 0,
        frameUrl: 'https://example.com/',
        href: null,
        keyCode: 229,
        selector: '.form-control',
        tagName: 'INPUT',
        value: 't',
      },
      {
        action: 'keydown',
        coordinates: null,
        frameId: 0,
        frameUrl: 'https://example.com/',
        href: null,
        keyCode: 229,
        selector: '.form-control',
        tagName: 'INPUT',
        value: `t'y`,
      },
      {
        action: 'keydown',
        coordinates: null,
        frameId: 0,
        frameUrl: 'https://example.com/',
        href: null,
        keyCode: 229,
        selector: '.form-control',
        tagName: 'INPUT',
        value: `t'y'p`,
      },
      {
        action: 'keydown',
        coordinates: null,
        frameId: 0,
        frameUrl: 'https://example.com/',
        href: null,
        keyCode: 229,
        selector: '.form-control',
        tagName: 'INPUT',
        value: `t'y'pe`,
      },
      {
        action: 'keydown',
        coordinates: null,
        frameId: 0,
        frameUrl: 'https://example.com/',
        href: null,
        keyCode: 229,
        selector: '.form-control',
        tagName: 'INPUT',
        value: 'types',
      },
      {
        action: 'keydown',
        coordinates: null,
        frameId: 0,
        frameUrl: 'https://example.com/',
        href: null,
        keyCode: 13,
        selector: '.form-control',
        tagName: 'INPUT',
        value: 'types',
      },
      {
        action: 'click',
        coordinates: null,
        frameId: 0,
        frameUrl: 'https://example.com/',
        href: 'https://example.com/',
        keyCode: null,
        selector: '.no-underline',
        tagName: 'A',
      },
      {
        action: 'NAVIGATION',
        frameId: null,
        frameUrl: null,
      },
      {
        action: 'NAVIGATION',
        frameId: null,
        frameUrl: null,
      },
    ]
    const optimizer = new Optimizer({})
    const optimizedEvents = optimizer.optimize(events)

    expect(optimizedEvents.length).toEqual(4)
    expect(optimizedEvents).toEqual([events[0], events[7], events[8], events[9]])
  })
})
