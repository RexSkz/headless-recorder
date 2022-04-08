import { finder } from '@medv/finder/finder.js'

const restrictedClassNames = ['ssc-', 'ant-', 'rc-', 'el-', 'sc-']

export default function selector(e, { dataAttribute } = {}) {
  if (dataAttribute && e.target.getAttribute(dataAttribute)) {
    return `[${dataAttribute}="${e.target.getAttribute(dataAttribute)}"]`
  }

  if (e.target.id) {
    return `#${e.target.id}`
  }

  return finder(e.target, {
    seedMinLength: 5,
    optimizedMinLength: e.target.id ? 2 : 10,
    attr: name => name === dataAttribute,
    className: name => restrictedClassNames.every(item => !name.startsWith(item)),
    idName: name => /^\d/.test(name),
  })
}
