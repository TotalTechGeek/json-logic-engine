// @ts-check
'use strict'

import asyncIterators from './async_iterators.js'
import { Sync, Override, isSync } from './constants.js'
import declareSync from './utilities/declareSync.js'
import { build, buildString } from './compiler.js'
import chainingSupported from './utilities/chainingSupported.js'
import InvalidControlInput from './errors/InvalidControlInput.js'
import YieldingIterators from './yieldingIterators.js'
import { splitPath } from './utilities/splitPath.js'

function isDeterministic (method, engine, buildState) {
  if (Array.isArray(method)) {
    return method.every((i) => isDeterministic(i, engine, buildState))
  }
  if (method && typeof method === 'object') {
    const func = Object.keys(method)[0]
    const lower = method[func]

    if (!engine.methods[func] && engine.options.permissive) return true

    if (engine.methods[func].traverse === false) {
      return typeof engine.methods[func].deterministic === 'function'
        ? engine.methods[func].deterministic(lower, buildState)
        : engine.methods[func].deterministic
    }
    return typeof engine.methods[func].deterministic === 'function'
      ? engine.methods[func].deterministic(lower, buildState)
      : engine.methods[func].deterministic &&
          isDeterministic(lower, engine, buildState)
  }
  return true
}

const defaultMethods = {
  '+': (data) => [].concat(data).reduce((a, b) => +a + +b, 0),
  '*': (data) => data.reduce((a, b) => +a * +b),
  '/': (data) => data.reduce((a, b) => +a / +b),

  '-': (data) =>
  // @ts-ignore Type checking is incorrect on the following line.
    ((a) => (a.length === 1 ? (a[0] = -a[0]) : a) & 0 || a)(
      [].concat(data)
      // @ts-ignore Type checking is incorrect on the following line.
    ).reduce((a, b) => +a - +b),
  '%': (data) => data.reduce((a, b) => +a % +b),
  max: (data) => Math.max(...data),
  min: (data) => Math.min(...data),
  in: ([item, array]) => (array || []).includes(item),
  '>': ([a, b]) => a > b,
  '<': ([a, b, c]) => (c === undefined ? a < b : a < b && b < c),
  preserve: {
    traverse: false,
    method: declareSync((i) => i)
  },
  if: {
    method: (input, context, above, engine) => {
      if (!Array.isArray(input)) throw new InvalidControlInput(input)

      // check the bounds
      if (input.length < 2) {
        throw new InvalidControlInput(input)
      }

      input = [...input]

      if (input.length % 2 !== 1) {
        input.push(null)
      }

      // fallback to the default if the condition is false
      const onFalse = input.pop()

      // while there are still conditions
      while (input.length) {
        const check = input.shift()
        const onTrue = input.shift()

        const test = engine.run(check, context, {
          above
        })

        // if the condition is true, run the true branch
        if (test) {
          return engine.run(onTrue, context, {
            above
          })
        }
      }

      return engine.run(onFalse, context, {
        above
      })
    },
    deterministic: (data, buildState) => {
      return isDeterministic(data, buildState.engine, buildState)
    },
    asyncMethod: async (input, context, above, engine) => {
      if (!Array.isArray(input)) throw new InvalidControlInput(input)

      // check the bounds
      if (input.length < 2) {
        throw new InvalidControlInput(input)
      }

      input = [...input]

      if (input.length % 2 !== 1) {
        input.push(null)
      }

      // fallback to the default if the condition is false
      const onFalse = input.pop()

      // while there are still conditions
      while (input.length) {
        const check = input.shift()
        const onTrue = input.shift()

        const test = await engine.run(check, context, {
          above
        })

        // if the condition is true, run the true branch
        if (test) {
          return engine.run(onTrue, context, {
            above
          })
        }
      }

      return engine.run(onFalse, context, {
        above
      })
    },
    traverse: false
  },
  '<=': ([a, b, c]) => (c === undefined ? a <= b : a <= b && b <= c),
  '>=': ([a, b]) => a >= b,
  // eslint-disable-next-line eqeqeq
  '==': ([a, b]) => a == b,
  '===': ([a, b]) => a === b,
  // eslint-disable-next-line eqeqeq
  '!=': ([a, b]) => a != b,
  '!==': ([a, b]) => a !== b,
  xor: ([a, b]) => a ^ b,
  or: (arr) => arr.reduce((a, b) => a || b, false),
  and: (arr) => arr.reduce((a, b) => a && b),
  substr: ([string, from, end]) => {
    if (end < 0) {
      const result = string.substr(from)
      return result.substr(0, result.length + end)
    }
    return string.substr(from, end)
  },
  length: (i) => {
    if (typeof i === 'string' || Array.isArray(i)) return i.length
    if (i && typeof i === 'object') return Object.keys(i).length
    return 0
  },
  get: {
    method: ([data, key, defaultValue], context, above, engine) => {
      const notFound = defaultValue === undefined ? null : defaultValue

      const subProps = splitPath(String(key))
      for (let i = 0; i < subProps.length; i++) {
        if (data === null || data === undefined) {
          return notFound
        }
        // Descending into context
        data = data[subProps[i]]
        if (data === undefined) {
          return notFound
        }
      }
      if (engine.allowFunctions || typeof data[key] !== 'function') {
        return data
      }
    }
  },
  var: (key, context, above, engine) => {
    let b
    if (Array.isArray(key)) {
      b = key[1]
      key = key[0]
    }
    // if (!key && context && context[Override]) return context[Override]
    let iter = 0
    while (
      typeof key === 'string' &&
      key.startsWith('../') &&
      iter < above.length
    ) {
      context = above[iter++]
      key = key.substring(3)
    }
    if (context && typeof context[Override] !== 'undefined') {
      context = context[Override]
    }
    const notFound = b === undefined ? null : b
    if (typeof key === 'undefined' || key === '' || key === null) {
      if (engine.allowFunctions || typeof (context && context[key]) !== 'function') {
        return context
      }
      return null
    }
    const subProps = splitPath(String(key))
    for (let i = 0; i < subProps.length; i++) {
      if (context === null || context === undefined) {
        return notFound
      }
      // Descending into context
      context = context[subProps[i]]
      if (context === undefined) {
        return notFound
      }
    }
    if (engine.allowFunctions || typeof (context && context[key]) !== 'function') {
      return context
    }
    return null
  },
  missing: (checked, context, above, engine) => {
    return (Array.isArray(checked) ? checked : [checked]).filter((key) => {
      return defaultMethods.var(key, context, above, engine) === null
    })
  },
  missing_some: ([needCount, options], context, above, engine) => {
    const missing = defaultMethods.missing(options, context, above, engine)
    if (options.length - missing.length >= needCount) {
      return []
    } else {
      return missing
    }
  },
  map: createArrayIterativeMethod('map'),
  some: createArrayIterativeMethod('some'),
  all: createArrayIterativeMethod('every'),
  none: {
    traverse: false,
    // todo: add async build & build
    method: (val, context, above, engine) => {
      return !defaultMethods.some.method(val, context, above, engine)
    },
    asyncMethod: async (val, context, above, engine) => {
      return !(await defaultMethods.some.asyncMethod(
        val,
        context,
        above,
        engine
      ))
    },
    compile: (data, buildState) => {
      const result = `${defaultMethods.some.compile(data, buildState)}`
      return result ? `!(${result})` : false
    }
  },
  merge: (arrays) => (Array.isArray(arrays) ? [].concat(...arrays) : [arrays]),
  every: createArrayIterativeMethod('every'),
  filter: createArrayIterativeMethod('filter'),
  reduce: {
    deterministic: (data, buildState) => {
      return (
        isDeterministic(data[0], buildState.engine, buildState) &&
        isDeterministic(data[1], buildState.engine, {
          ...buildState,
          insideIterator: true
        })
      )
    },
    compile: (data, buildState) => {
      if (!Array.isArray(data)) throw new InvalidControlInput(data)
      const { above = [], state, async } = buildState
      let [selector, mapper, defaultValue] = data
      selector = buildString(selector, buildState)
      if (typeof defaultValue !== 'undefined') {
        defaultValue = buildString(defaultValue, buildState)
      }
      const mapState = {
        ...buildState,
        state: {},
        above: [selector, state, ...above],
        avoidInlineAsync: true
      }
      mapper = build(mapper, mapState)
      buildState.useContext = buildState.useContext || mapState.useContext
      buildState.methods.push(mapper)
      if (async) {
        if (!isSync(mapper) || selector.includes('await')) {
          buildState.detectAsync = true
          if (typeof defaultValue !== 'undefined') {
            return `await asyncIterators.reduce(${selector} || [], (a,b) => methods[${
              buildState.methods.length - 1
            }]({ accumulator: a, current: b }), ${defaultValue})`
          }
          return `await asyncIterators.reduce(${selector} || [], (a,b) => methods[${
            buildState.methods.length - 1
          }]({ accumulator: a, current: b }))`
        }
      }
      if (typeof defaultValue !== 'undefined') {
        return `(${selector} || []).reduce((a,b) => methods[${
          buildState.methods.length - 1
        }]({ accumulator: a, current: b }), ${defaultValue})`
      }
      return `(${selector} || []).reduce((a,b) => methods[${
        buildState.methods.length - 1
      }]({ accumulator: a, current: b }))`
    },
    method: (input, context, above, engine) => {
      if (!Array.isArray(input)) throw new InvalidControlInput(input)
      let [selector, mapper, defaultValue] = input
      defaultValue = engine.run(defaultValue, context, {
        above
      })
      selector =
        engine.run(selector, context, {
          above
        }) || []
      const func = (accumulator, current) => {
        return engine.run(
          mapper,
          {
            accumulator,
            current
          },
          {
            above: [selector, context, ...above]
          }
        )
      }
      if (typeof defaultValue === 'undefined') {
        return selector.reduce(func)
      }
      return selector.reduce(func, defaultValue)
    },
    asyncMethod: async (input, context, above, engine) => {
      if (!Array.isArray(input)) throw new InvalidControlInput(input)
      let [selector, mapper, defaultValue] = input
      defaultValue = await engine.run(defaultValue, context, {
        above
      })
      selector =
        (await engine.run(selector, context, {
          above
        })) || []
      return asyncIterators.reduce(
        selector,
        (accumulator, current) => {
          return engine.run(
            mapper,
            {
              accumulator,
              current
            },
            {
              above: [selector, context, ...above]
            }
          )
        },
        defaultValue
      )
    },
    traverse: false
  },
  not: (value) => !value,
  '!': (value) => !value,
  '!!': (value) => Boolean(value),
  cat: (arr) => (typeof arr === 'string' ? arr : arr.join('')),
  keys: (obj) => Object.keys(obj),
  eachKey: {
    traverse: false,
    method: (object, context, above, engine) => {
      const result = Object.keys(object).reduce((accumulator, key) => {
        const item = object[key]
        Object.defineProperty(accumulator, key, {
          enumerable: true,
          value: engine.run(item, context, { above })
        })
        return accumulator
      }, {})
      return result
    },
    useContext: true,
    deterministic: (data, buildState) => {
      if (data && typeof data === 'object') {
        return Object.values(data).every((i) => {
          return isDeterministic(i, buildState.engine, buildState)
        })
      }
      throw new InvalidControlInput(data)
    },
    compile: (data, buildState) => {
      // what's nice about this is that I don't have to worry about whether it's async or not, the lower entries take care of that ;)
      // however, this is not engineered support yields, I will have to make a note of that & possibly support it at a later point.
      if (data && typeof data === 'object') {
        const result = `({ ${Object.keys(data)
          .reduce((accumulator, key) => {
            accumulator.push(
              `${JSON.stringify(key)}: ${buildString(data[key], buildState)}`
            )
            return accumulator
          }, [])
          .join(',')} })`
        return result
      }
      throw new InvalidControlInput(data)
    },
    asyncMethod: async (object, context, above, engine) => {
      const result = await asyncIterators.reduce(
        Object.keys(object),
        async (accumulator, key) => {
          const item = object[key]
          Object.defineProperty(accumulator, key, {
            enumerable: true,
            value: await engine.run(item, context, { above })
          })
          return accumulator
        },
        {}
      )
      return result
    }
  }
}
function createArrayIterativeMethod (name) {
  return {
    deterministic: (data, buildState) => {
      return (
        isDeterministic(data[0], buildState.engine, buildState) &&
        isDeterministic(data[1], buildState.engine, {
          ...buildState,
          insideIterator: true
        })
      )
    },
    method: (input, context, above, engine) => {
      if (!Array.isArray(input)) throw new InvalidControlInput(input)
      let [selector, mapper] = input
      selector =
        engine.run(selector, context, {
          above
        }) || []
      return selector[name]((i) => {
        return engine.run(mapper, i, {
          above: [selector, context, ...above]
        })
      })
    },
    asyncMethod: async (input, context, above, engine) => {
      if (!Array.isArray(input)) throw new InvalidControlInput(input)
      let [selector, mapper] = input
      selector =
        (await engine.run(selector, context, {
          above
        })) || []
      return asyncIterators[name](selector, (i) => {
        return engine.run(mapper, i, {
          above: [selector, context, ...above]
        })
      })
    },
    compile: (data, buildState) => {
      if (!Array.isArray(data)) throw new InvalidControlInput(data)
      const { above = [], state, async } = buildState
      let [selector, mapper] = data
      selector = buildString(selector, buildState)
      const mapState = {
        ...buildState,
        state: {},
        above: [selector, state, ...above],
        avoidInlineAsync: true
      }
      mapper = build(mapper, mapState)
      buildState.useContext = buildState.useContext || mapState.useContext
      buildState.methods.push(mapper)
      if (async) {
        if (!isSync(mapper) || selector.includes('await')) {
          buildState.detectAsync = true
          return `await asyncIterators.${name}(${selector} || [], methods[${
            buildState.methods.length - 1
          }])`
        }
      }
      return `(${selector} || []).${name}(methods[${
        buildState.methods.length - 1
      }])`
    },
    traverse: false
  }
}
defaultMethods['?:'] = defaultMethods.if
// declare all of the functions here synchronous
Object.keys(defaultMethods).forEach((item) => {
  if (typeof defaultMethods[item] === 'function') {
    defaultMethods[item][Sync] = true
  }
  defaultMethods[item].deterministic =
    typeof defaultMethods[item].deterministic === 'undefined'
      ? true
      : defaultMethods[item].deterministic
})
// @ts-ignore Allow custom attribute
defaultMethods.var.deterministic = (data, buildState) => {
  return buildState.insideIterator && !String(data).includes('../')
}
Object.assign(defaultMethods.var, { traverse: false })
Object.assign(defaultMethods.missing, {
  deterministic: false,
  useContext: true
})
Object.assign(defaultMethods.missing_some, {
  deterministic: false,
  useContext: true
})
// @ts-ignore Allow custom attribute
defaultMethods['<'].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    if (data.length === 2) {
      return (
        '(' +
        buildString(data[0], buildState) +
        ' < ' +
        buildString(data[1], buildState) +
        ')'
      )
    }
    if (data.length === 3) {
      const a = buildString(data[0], buildState)
      const b = buildString(data[1], buildState)
      const c = buildString(data[2], buildState)
      return `${a} < ${b} && ${b} < ${c}`
    }
  }
  return false
}
// @ts-ignore Allow custom attribute
defaultMethods['<='].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    if (data.length === 2) {
      return (
        '(' +
        buildString(data[0], buildState) +
        ' <= ' +
        buildString(data[1], buildState) +
        ')'
      )
    }
    if (data.length === 3) {
      const a = buildString(data[0], buildState)
      const b = buildString(data[1], buildState)
      const c = buildString(data[2], buildState)
      return `${a} <= ${b} && ${b} <= ${c}`
    }
  }
  return false
}
// @ts-ignore Allow custom attribute
defaultMethods.min.compile = function (data, buildState) {
  if (Array.isArray(data)) {
    return `Math.min(${data
      .map((i) => buildString(i, buildState))
      .join(', ')})`
  }
  return false
}
// @ts-ignore Allow custom attribute
defaultMethods.max.compile = function (data, buildState) {
  if (Array.isArray(data)) {
    return `Math.max(${data
      .map((i) => buildString(i, buildState))
      .join(', ')})`
  }
  return false
}
// @ts-ignore Allow custom attribute
defaultMethods['>'].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    if (data.length === 2) {
      return (
        '(' +
        buildString(data[0], buildState) +
        ' > ' +
        buildString(data[1], buildState) +
        ')'
      )
    }
  }
  return false
}
// @ts-ignore Allow custom attribute
defaultMethods['>='].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    if (data.length === 2) {
      return (
        '(' +
        buildString(data[0], buildState) +
        ' >= ' +
        buildString(data[1], buildState) +
        ')'
      )
    }
  }
  return false
}
// @ts-ignore Allow custom attribute
defaultMethods['=='].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    if (data.length === 2) {
      return (
        '(' +
        buildString(data[0], buildState) +
        ' == ' +
        buildString(data[1], buildState) +
        ')'
      )
    }
  }
  return false
}
// @ts-ignore Allow custom attribute
defaultMethods['!='].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    if (data.length === 2) {
      return (
        '(' +
        buildString(data[0], buildState) +
        ' != ' +
        buildString(data[1], buildState) +
        ')'
      )
    }
  }
  return false
}
// @ts-ignore Allow custom attribute
defaultMethods.if.compile = function (data, buildState) {
  if (Array.isArray(data)) {
    if (data.length >= 3) {
      data = [...data]

      if (data.length % 2 !== 1) {
        data.push(null)
      }

      const onFalse = data.pop()

      let str = ''
      while (data.length) {
        const condition = data.shift()
        const onTrue = data.shift()
        str += `(${buildString(condition, buildState)}) ? ${buildString(onTrue, buildState)} : `
      }

      return '(' + str + `${buildString(onFalse, buildState)}` + ')'
    }
  }
  return false
}
// @ts-ignore Allow custom attribute
defaultMethods['!=='].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    if (data.length === 2) {
      return (
        '(' +
        buildString(data[0], buildState) +
        ' !== ' +
        buildString(data[1], buildState) +
        ')'
      )
    }
  }
  return false
}
// @ts-ignore Allow custom attribute
defaultMethods['==='].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    if (data.length === 2) {
      return (
        '(' +
        buildString(data[0], buildState) +
        ' === ' +
        buildString(data[1], buildState) +
        ')'
      )
    }
  }
  return false
}
// @ts-ignore Allow custom attribute
defaultMethods['+'].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    return `(${data
      .map((i) => `(+${buildString(i, buildState)})`)
      .join(' + ')})`
  } else if (typeof data === 'string' || typeof data === 'number') {
    return `(+${buildString(data, buildState)})`
  } else {
    return `([].concat(${buildString(
      data,
      buildState
    )})).reduce((a,b) => (+a)+(+b), 0)`
  }
}

// @ts-ignore Allow custom attribute
defaultMethods['%'].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    return `(${data
      .map((i) => `(+${buildString(i, buildState)})`)
      .join(' % ')})`
  } else {
    return `(${buildString(data, buildState)}).reduce((a,b) => (+a)%(+b))`
  }
}
// @ts-ignore Allow custom attribute
defaultMethods.or.compile = function (data, buildState) {
  if (Array.isArray(data)) {
    return `(${data.map((i) => buildString(i, buildState)).join(' || ')})`
  } else {
    return `(${buildString(data, buildState)}).reduce((a,b) => a||b, false)`
  }
}
// @ts-ignore Allow custom attribute
defaultMethods.in.compile = function (data, buildState) {
  if (Array.isArray(data)) {
    return `(${buildString(data[1], buildState)} || []).includes(${buildString(
      data[0],
      buildState
    )})`
  }
  return false
}
// @ts-ignore Allow custom attribute
defaultMethods.and.compile = function (data, buildState) {
  if (Array.isArray(data)) {
    return `(${data.map((i) => buildString(i, buildState)).join(' && ')})`
  } else {
    return `(${buildString(data, buildState)}).reduce((a,b) => a&&b, true)`
  }
}
// @ts-ignore Allow custom attribute
defaultMethods['-'].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    return `${data.length === 1 ? '-' : ''}(${data
      .map((i) => `(+${buildString(i, buildState)})`)
      .join(' - ')})`
  }
  if (typeof data === 'string' || typeof data === 'number') {
    return `(-${buildString(data, buildState)})`
  } else {
    return `((a=>(a.length===1?a[0]=-a[0]:a)&0||a)([].concat(${buildString(
      data,
      buildState
    )}))).reduce((a,b) => (+a)-(+b))`
  }
}
// @ts-ignore Allow custom attribute
defaultMethods['/'].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    return `(${data
      .map((i) => `(+${buildString(i, buildState)})`)
      .join(' / ')})`
  } else {
    return `(${buildString(data, buildState)}).reduce((a,b) => (+a)/(+b))`
  }
}
// @ts-ignore Allow custom attribute
defaultMethods['*'].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    return `(${data
      .map((i) => `(+${buildString(i, buildState)})`)
      .join(' * ')})`
  } else {
    return `(${buildString(data, buildState)}).reduce((a,b) => (+a)*(+b))`
  }
}
// @ts-ignore Allow custom attribute
defaultMethods.cat.compile = function (data, buildState) {
  if (typeof data === 'string') {
    return JSON.stringify(data)
  } else if (Array.isArray(data)) {
    return `(${['', ...data]
      .map((i) => buildString(i, buildState))
      .join(' + ')})`
  }
  return false
}
// @ts-ignore Allow custom attribute
defaultMethods.not.compile = defaultMethods['!'].compile = function (
  data,
  buildState
) {
  return `(!(${buildString(data, buildState)}))`
}
// @ts-ignore Allow custom attribute
defaultMethods['!!'].compile = function (data, buildState) {
  return `(!!(${buildString(data, buildState)}))`
}
defaultMethods.none.deterministic = defaultMethods.some.deterministic
defaultMethods.get.compile = function (data, buildState) {
  let defaultValue = null
  let key = data
  let obj = null
  if (Array.isArray(data) && data.length <= 3) {
    obj = data[0]
    key = data[1]
    defaultValue = typeof data[2] === 'undefined' ? null : data[2]

    // Bail out if the key is dynamic; dynamic keys are not really optimized by this block.
    if (key && typeof key === 'object') return false

    key = key.toString()
    const pieces = splitPath(key)
    if (!chainingSupported) {
      return `(((a,b) => (typeof a === 'undefined' || a === null) ? b : a)(${pieces.reduce(
        (text, i) => {
          return `(${text}||0)[${JSON.stringify(i)}]`
        },
        `(${buildString(obj, buildState)}||0)`
      )}, ${buildString(defaultValue, buildState)}))`
    }
    return `((${buildString(obj, buildState)})${pieces
      .map((i) => `?.[${buildString(i, buildState)}]`)
      .join('')} ?? ${buildString(defaultValue, buildState)})`
  }
  return false
}
// @ts-ignore Allow custom attribute
defaultMethods.var.compile = function (data, buildState) {
  let key = data
  let defaultValue = null
  buildState.varTop = buildState.varTop || new Set()
  if (
    !key ||
    typeof data === 'string' ||
    typeof data === 'number' ||
    (Array.isArray(data) && data.length <= 2)
  ) {
    if (Array.isArray(data)) {
      key = data[0]
      defaultValue = typeof data[1] === 'undefined' ? null : data[1]
    }
    if (typeof key === 'undefined' || key === null || key === '') {
      // this counts the number of var accesses to determine if they're all just using this override.
      // this allows for a small optimization :)
      return 'state[Override]'
    }
    if (typeof key !== 'string' && typeof key !== 'number') {
      buildState.useContext = true
      return false
    }
    key = key.toString()
    if (key.includes('../')) {
      buildState.useContext = true
      return false
    }
    const pieces = splitPath(key)
    const [top] = pieces
    buildState.varTop.add(top)
    // support older versions of node
    if (!chainingSupported) {
      return `(((a,b) => (typeof a === 'undefined' || a === null) ? b : a)(${pieces.reduce(
        (text, i) => {
          return `(${text}||0)[${JSON.stringify(i)}]`
        },
        '(context||0)'
      )}, ${buildString(defaultValue, buildState)}))`
    }
    return `(context${pieces
      .map((i) => `?.[${JSON.stringify(i)}]`)
      .join('')} ?? ${buildString(defaultValue, buildState)})`
  }
  buildState.useContext = true
  return false
}

export default {
  ...defaultMethods,
  ...YieldingIterators
}
