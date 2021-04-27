'use strict'

const asyncIterators = require('./async_iterators')
const { Sync, Override, isSync } = require('./constants')
const declareSync = require('./utilities/declareSync')
const { build, buildString } = require('./compiler')
const chainingSupported = require('./utilities/chainingSupported')
const InvalidControlInput = require('./errors/InvalidControlInput')

function isDeterministic (method, engine, buildState) {
  if (Array.isArray(method)) {
    return method.every(i => isDeterministic(i, engine, buildState))
  }

  if (method && typeof method === 'object') {
    const func = Object.keys(method)[0]
    const lower = method[func]

    if (engine.methods[func].traverse === false) {
      return typeof engine.methods[func].deterministic === 'function' ? engine.methods[func].deterministic(lower, buildState) : engine.methods[func].deterministic
    }
    return typeof engine.methods[func].deterministic === 'function' ? engine.methods[func].deterministic(lower, buildState) : engine.methods[func].deterministic && isDeterministic(lower, engine, buildState)
  }

  return true
}

const defaultMethods = {
  '+': data => ([].concat(data)).reduce((a, b) => (+a) + (+b), 0),
  '*': data => data.reduce((a, b) => (+a) * (+b)),
  '/': data => data.reduce((a, b) => (+a) / (+b)),
  // eslint-disable-next-line no-return-assign
  '-': data => ((a => (a.length === 1 ? a[0] = -a[0] : a) & 0 || a)([].concat(data))).reduce((a, b) => (+a) - (+b)),
  '%': data => data.reduce((a, b) => (+a) % (+b)),
  max: data => Math.max(...data),
  min: data => Math.min(...data),
  in: ([item, array]) => array.includes(item),
  '>': ([a, b]) => a > b,
  '<': ([a, b, c]) => c === undefined ? a < b : (a < b) && (b < c),
  preserve: {
    traverse: false,
    method: declareSync(i => i)
  },
  if: {
    method: (input, context, above, engine) => {
      if (!Array.isArray(input)) throw new InvalidControlInput(input)

      const [check, onTrue, onFalse] = input
      const test = engine.run(check, context, {
        proxy: false,
        above
      })
      return engine.run(test ? onTrue : onFalse, context, {
        proxy: false,
        above
      })
    },
    deterministic: (data, buildState) => {
      return isDeterministic(data, buildState.engine, buildState)
    },
    asyncMethod: async (input, context, above, engine) => {
      if (!Array.isArray(input)) throw new InvalidControlInput(input)

      const [check, onTrue, onFalse] = input
      const test = await engine.run(check, context, {
        proxy: false,
        above
      })

      return engine.run(test ? onTrue : onFalse, context, {
        proxy: false,
        above
      })
    },
    traverse: false
  },
  '<=': ([a, b, c]) => c === undefined ? a <= b : (a <= b) && (b <= c),
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
  var: (key, context, above, engine) => {
    let b

    if (Array.isArray(key)) {
      b = key[1]
      key = key[0]
    }

    // if (!key && context && context[Override]) return context[Override]

    let iter = 0
    while (typeof key === 'string' && key.startsWith('../') && iter < above.length) {
      context = above[iter++]
      key = key.substring(3)
    }
    if (context && typeof context[Override] !== 'undefined') context = context[Override]

    const notFound = (b === undefined) ? null : b

    if (typeof key === 'undefined' || key === '' || key === null) {
      return context
    }

    const subProps = String(key).split('.')
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

    if (engine.allowFunctions || typeof context[key] !== 'function') { return context }
    return null
  },
  missing: (checked, context, above, engine) => {
    return (Array.isArray(checked) ? checked : [checked]).filter(key => {
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
    // todo: add async build & build
    method: (val, context, above, engine) => {
      return !defaultMethods.some.method(val, context, above, engine)
    },
    asyncMethod: async (val, context, above, engine) => {
      return !await defaultMethods.some.asyncMethod(val, context, above, engine)
    },
    compile: (data, buildState) => {
      const result = `${defaultMethods.some.compile(data, buildState)}`
      return result ? `!(${result})` : false
    }
  },
  merge: arrays => Array.isArray(arrays) ? ([].concat(...arrays)) : [arrays],
  every: createArrayIterativeMethod('every'),
  filter: createArrayIterativeMethod('filter'),
  reduce: {
    deterministic: (data, buildState) => {
      return isDeterministic(data[0], buildState.engine, buildState) && isDeterministic(data[1], buildState.engine, { ...buildState, insideIterator: true })
    },
    compile: (data, buildState) => {
      if (!Array.isArray(data)) throw new InvalidControlInput(data)

      const { above = [], state, async } = buildState
      let [selector, mapper, defaultValue] = data

      selector = buildString(selector, buildState)
      if (typeof defaultValue !== 'undefined') { defaultValue = buildString(defaultValue, buildState) }

      mapper = build(mapper, { ...buildState, state: {}, above: [selector, state, ...above], avoidInlineAsync: true })
      buildState.methods.push(mapper)

      if (async) {
        if (!isSync(mapper) || selector.includes('await')) {
          buildState.detectAsync = true
          if (typeof defaultValue !== 'undefined') {
            return `await asyncIterators.reduce(${selector} || [], (a,b) => methods[${buildState.methods.length - 1}]({ accumulator: a, current: b }), ${defaultValue})`
          }
          return `await asyncIterators.reduce(${selector} || [], (a,b) => methods[${buildState.methods.length - 1}]({ accumulator: a, current: b }))`
        }
      }

      if (typeof defaultValue !== 'undefined') {
        return `(${selector} || []).reduce((a,b) => methods[${buildState.methods.length - 1}]({ accumulator: a, current: b }), ${defaultValue})`
      }

      return `(${selector} || []).reduce((a,b) => methods[${buildState.methods.length - 1}]({ accumulator: a, current: b }))`
    },
    method: (input, context, above, engine) => {
      if (!Array.isArray(input)) throw new InvalidControlInput(input)
      let [selector, mapper, defaultValue] = input
      defaultValue = engine.run(defaultValue, context, {
        proxy: false,
        above
      })

      selector = engine.run(selector, context, {
        proxy: false,
        above
      }) || []

      const func = (accumulator, current) => {
        return engine.run(mapper, {
          accumulator,
          current
        }, {
          proxy: false,
          above: [selector, context, ...above]
        })
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
        proxy: false,
        above
      })

      selector = await engine.run(selector, context, {
        proxy: false,
        above
      }) || []

      return asyncIterators.reduce(selector, (accumulator, current) => {
        return engine.run(mapper, {
          accumulator,
          current
        }, {
          proxy: false,
          above: [selector, context, ...above]
        })
      }, defaultValue)
    },
    traverse: false
  },
  not: value => !value,
  '!': value => !value,
  '!!': value => Boolean(value),
  cat: arr => typeof arr === 'string' ? arr : arr.join(''),
  keys: obj => Object.keys(obj),
  eachKey: {
    traverse: false,
    method: (object, context, above, engine) => {
      const result = Object.keys(object).reduce((accumulator, key) => {
        const item = object[key]
        Object.defineProperty(accumulator, key, {
          enumerable: true,
          value: engine.run(item, { key }, { above: [context, ...above], proxy: false })
        })
        return accumulator
      }, {})
      return result
    },
    asyncMethod: async (object, context, above, engine) => {
      const result = await asyncIterators.reduce(Object.keys(object), async (accumulator, key) => {
        const item = object[key]
        Object.defineProperty(accumulator, key, {
          enumerable: true,
          value: await engine.run(item, { key }, { above: [context, ...above], proxy: false })
        })
        return accumulator
      }, {})
      return result
    }
  }
}

function createArrayIterativeMethod (name) {
  return {
    deterministic: (data, buildState) => {
      return isDeterministic(data[0], buildState.engine, buildState) && isDeterministic(data[1], buildState.engine, { ...buildState, insideIterator: true })
    },
    // build: ([selector, mapper], context, above, engine) => {
    //   selector = build(selector, {
    //     above: [selector, context, ...above],
    //     engine,
    //     avoidInlineAsync: true
    //   }) || []

    //   mapper = build(mapper, { engine, state: {}, above: [selector, context, ...above], avoidInlineAsync: true })

    //   return () => {
    //     return (typeof selector === 'function' ? selector(context) || [] : selector)[name](i => {
    //       return typeof mapper === 'function' ? mapper(i) : mapper
    //     })
    //   }
    // },
    method: (input, context, above, engine) => {
      if (!Array.isArray(input)) throw new InvalidControlInput(input)

      let [selector, mapper] = input
      selector = engine.run(selector, context, {
        proxy: false,
        above
      }) || []

      return selector[name](i => {
        return engine.run(mapper, i, {
          proxy: false,
          above: [selector, context, ...above]
        })
      })
    },
    asyncMethod: async (input, context, above, engine) => {
      if (!Array.isArray(input)) throw new InvalidControlInput(input)

      let [selector, mapper] = input
      selector = (await engine.run(selector, context, {
        proxy: false,
        above
      })) || []

      return asyncIterators[name](selector, i => {
        return engine.run(mapper, i, {
          proxy: false,
          above: [selector, context, ...above]
        })
      })
    },
    compile: (data, buildState) => {
      if (!Array.isArray(data)) throw new InvalidControlInput(data)

      const { above = [], state, async } = buildState
      let [selector, mapper] = data

      selector = buildString(selector, buildState)
      mapper = build(mapper, { ...buildState, state: {}, above: [selector, state, ...above], avoidInlineAsync: true })
      buildState.methods.push(mapper)

      if (async) {
        if (!isSync(mapper) || selector.includes('await')) {
          buildState.detectAsync = true
          return `await asyncIterators.${name}(${selector} || [], methods[${buildState.methods.length - 1}])`
        }
      }

      return `(${selector} || []).${name}(methods[${buildState.methods.length - 1}])`
    },
    // asyncBuild: ([selector, mapper], context, above, engine) => {
    //   selector = build(selector, {
    //     above,
    //     engine,
    //     async: true,
    //     avoidInlineAsync: true
    //   }) || []

    //   mapper = build(mapper, { engine, state: {}, above: [selector, context, ...above], async: true, avoidInlineAsync: true })

    //   if (isSync(selector) && isSync(mapper)) {
    //     return declareSync(() => {
    //       return (typeof selector === 'function' ? selector(context) || [] : selector)[name](i => {
    //         return typeof mapper === 'function' ? mapper(i) : mapper
    //       })
    //     })
    //   }

    //   return async () => {
    //     return asyncIterators[name](typeof selector === 'function' ? await selector(context) || [] : selector, i => {
    //       return typeof mapper === 'function' ? mapper(i) : mapper
    //     })
    //   }
    // },
    traverse: false
  }
}

defaultMethods['?:'] = defaultMethods.if

// declare all of the functions here synchronous
Object.keys(defaultMethods).forEach(item => {
  if (typeof defaultMethods[item] === 'function') {
    defaultMethods[item][Sync] = true
  }

  defaultMethods[item].deterministic = defaultMethods[item].deterministic || true
})

defaultMethods.var.deterministic = (data, buildState) => {
  // console.log('what??', data, buildState.insideIterator && !String(data).includes('../'))
  return buildState.insideIterator && !String(data).includes('../')
}
defaultMethods.var.traverse = false
defaultMethods.missing.deterministic = false
defaultMethods.missing_some.deterministic = false

defaultMethods['<'].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    if (data.length === 2) {
      return '(' + buildString(data[0], buildState) + ' < ' + buildString(data[1], buildState) + ')'
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

defaultMethods['<='].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    if (data.length === 2) {
      return '(' + buildString(data[0], buildState) + ' <= ' + buildString(data[1], buildState) + ')'
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

defaultMethods.min.compile = function (data, buildState) {
  if (Array.isArray(data)) {
    return `Math.min(${data.map(i => buildString(i, buildState)).join(', ')})`
  }
  return false
}

defaultMethods.max.compile = function (data, buildState) {
  if (Array.isArray(data)) {
    return `Math.max(${data.map(i => buildString(i, buildState)).join(', ')})`
  }
  return false
}

defaultMethods['>'].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    if (data.length === 2) {
      return '(' + buildString(data[0], buildState) + ' > ' + buildString(data[1], buildState) + ')'
    }
  }
  return false
}

defaultMethods['>='].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    if (data.length === 2) {
      return '(' + buildString(data[0], buildState) + ' >= ' + buildString(data[1], buildState) + ')'
    }
  }
  return false
}

defaultMethods['=='].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    if (data.length === 2) {
      return '(' + buildString(data[0], buildState) + ' == ' + buildString(data[1], buildState) + ')'
    }
  }
  return false
}

defaultMethods['!='].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    if (data.length === 2) {
      return '(' + buildString(data[0], buildState) + ' != ' + buildString(data[1], buildState) + ')'
    }
  }
  return false
}

defaultMethods.if.compile = function (data, buildState) {
  if (Array.isArray(data)) {
    if (data.length === 2) {
      return `((${buildString(data[0], buildState)}) && ${buildString(data[1], buildState)})`
    }
    if (data.length === 3) {
      return `((${buildString(data[0], buildState)}) ? ${buildString(data[1], buildState)} : ${buildString(data[2], buildState)})`
    }
  }
  return false
}

defaultMethods['!=='].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    if (data.length === 2) {
      return '(' + buildString(data[0], buildState) + ' !== ' + buildString(data[1], buildState) + ')'
    }
  }
  return false
}

defaultMethods['==='].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    if (data.length === 2) {
      return '(' + buildString(data[0], buildState) + ' === ' + buildString(data[1], buildState) + ')'
    }
  }
  return false
}

defaultMethods['+'].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    return `(${data.map(i => {
      if (typeof i === 'number' || typeof i === 'string') {
        return i
      }
      return `+(${buildString(i, buildState)})`
    }).join(' + ')})`
  } else if (typeof data === 'string' || typeof data === 'number') {
    return `+${data}`
  } else {
    return `([].concat(${buildString(data, buildState)})).reduce((a,b) => +(+a)+(+b), 0)`
  }
}

defaultMethods['%'].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    return `(${data.map(i => {
      if (typeof i === 'number' || typeof i === 'string') {
        return i
      }
      return `+(${buildString(i, buildState)})`
    }).join(' % ')})`
  } else {
    return `(${buildString(data, buildState)}).reduce((a,b) => (+a)%(+b))`
  }
}
defaultMethods.or.compile = function (data, buildState) {
  if (Array.isArray(data)) {
    return `(${data.map(i => buildString(i, buildState)).join(' || ')})`
  } else {
    return `(${buildString(data, buildState)}).reduce((a,b) => a||b, false)`
  }
}

defaultMethods.in.compile = function (data, buildState) {
  if (Array.isArray(data)) {
    return `(${buildString(data[1], buildState)}).includes(${buildString(data[0], buildState)})`
  }
  return false
}

defaultMethods.and.compile = function (data, buildState) {
  if (Array.isArray(data)) {
    return `(${data.map(i => buildString(i, buildState)).join(' && ')})`
  } else {
    return `(${buildString(data, buildState)}).reduce((a,b) => a&&b, true)`
  }
}

defaultMethods['-'].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    return `${data.length === 1 ? '-' : ''}(${data.map(i => {
      if (typeof i === 'number' || typeof i === 'string') {
        return i
      }
      return `+(${buildString(i, buildState)})`
    }).join(' - ')})`
  } if (typeof data === 'string' || typeof data === 'number') {
    return `-${data}`
  } else {
    return `((a=>(a.length===1?a[0]=-a[0]:a)&0||a)([].concat(${buildString(data, buildState)}))).reduce((a,b) => (+a)-(+b))`
  }
}

defaultMethods['/'].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    return `(${data.map(i => {
      if (typeof i === 'number' || typeof i === 'string') {
        return i
      }
      return `+(${buildString(i, buildState)})`
    }).join(' / ')})`
  } else {
    return `(${buildString(data, buildState)}).reduce((a,b) => (+a)/(+b))`
  }
}

defaultMethods['*'].compile = function (data, buildState) {
  if (Array.isArray(data)) {
    return `(${data.map(i => {
      if (typeof i === 'number' || typeof i === 'string') {
        return i
      }
      return `+(${buildString(i, buildState)})`
    }).join(' * ')})`
  } else {
    return `(${buildString(data, buildState)}).reduce((a,b) => (+a)*(+b))`
  }
}

defaultMethods.cat.compile = function (data, buildState) {
  if (typeof data === 'string') {
    return JSON.stringify(data)
  } else if (Array.isArray(data)) {
    return `(${['', ...data].map(i => buildString(i, buildState)).join(' + ')})`
  }
  return false
}

defaultMethods.not.compile = defaultMethods['!'].compile = function (data, buildState) {
  return `(!(${buildString(data, buildState)}))`
}

defaultMethods['!!'].compile = function (data, buildState) {
  return `(!!(${buildString(data, buildState)}))`
}

defaultMethods.missing.compile = function (data, buildState) {
  buildState.missingUsed = true
  return false
}

defaultMethods.missing_some.compile = function (data, buildState) {
  buildState.missingUsed = true
  return false
}

defaultMethods.var.compile = function (data, buildState) {
  let key = data
  let defaultValue = null
  buildState.varAccesses = (buildState.varAccesses || 0) + 1
  buildState.varFallbacks = (buildState.varFallbacks || 0)
  buildState.varUseOverride = (buildState.varUseOverride || 0)
  buildState.varTop = buildState.varTop || new Set()
  if (!key || typeof data === 'string' || typeof data === 'number' || (Array.isArray(data) && data.length <= 2)) {
    if (Array.isArray(data)) {
      key = data[0]
      defaultValue = typeof data[1] === 'undefined' ? null : data[1]
    }

    if (typeof key === 'undefined' || key === null || key === '') {
      // this counts the number of var accesses to determine if they're all just using this override.
      // this allows for a small optimization :)
      buildState.varUseOverride++
      return 'state[Override]'
    }

    if (typeof key !== 'string' && typeof key !== 'number') {
      buildState.varFallbacks++
      return false
    }
    key = key.toString()

    if (key.includes('../')) {
      buildState.varFallbacks++
      return false
    }

    const pieces = key.split('.')
    const [top] = pieces
    buildState.varTop.add(top)

    // support older versions of node
    if (!chainingSupported) {
      return `(((a,b) => (typeof a === 'undefined' || a === null) ? b : a)(${pieces.reduce((text, i) => {
        return `(${text}||0)[${JSON.stringify(i)}]`
      }, '(context||0)')}, ${JSON.stringify(defaultValue)}))`
    }

    return `(context${pieces.map(i => `?.[${JSON.stringify(i)}]`).join('')} ?? ${JSON.stringify(defaultValue)})`
  }
  buildState.varFallbacks++
  return false
}

// include the yielding iterators as well
module.exports = { ...defaultMethods, ...require('./yieldingIterators') }
