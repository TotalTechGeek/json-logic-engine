// @ts-check
'use strict'

import asyncIterators from './async_iterators.js'
import { Sync, isSync } from './constants.js'
import declareSync from './utilities/declareSync.js'
import { build, buildString } from './compiler.js'
import chainingSupported from './utilities/chainingSupported.js'
import InvalidControlInput from './errors/InvalidControlInput.js'
import { splitPathMemoized } from './utilities/splitPath.js'

function isDeterministic (method, engine, buildState) {
  if (Array.isArray(method)) {
    return method.every((i) => isDeterministic(i, engine, buildState))
  }
  if (method && typeof method === 'object') {
    const func = Object.keys(method)[0]
    const lower = method[func]

    if (engine.isData(method, func)) return true
    if (!engine.methods[func]) throw new Error(`Method '${func}' was not found in the Logic Engine.`)

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

function isSyncDeep (method, engine, buildState) {
  if (Array.isArray(method)) {
    return method.every((i) => isSyncDeep(i, engine, buildState))
  }

  if (method && typeof method === 'object') {
    const func = Object.keys(method)[0]
    const lower = method[func]
    if (engine.isData(method, func)) return true
    if (!engine.methods[func]) throw new Error(`Method '${func}' was not found in the Logic Engine.`)
    if (engine.methods[func].traverse === false) return typeof engine.methods[func][Sync] === 'function' ? engine.methods[func][Sync](lower, buildState) : engine.methods[func][Sync]
    return typeof engine.methods[func][Sync] === 'function' ? engine.methods[func][Sync](lower, buildState) : engine.methods[func][Sync] && isSyncDeep(lower, engine, buildState)
  }

  return true
}

const defaultMethods = {
  '+': (data) => {
    if (typeof data === 'string') return +data
    if (typeof data === 'number') return +data
    let res = 0
    for (let i = 0; i < data.length; i++) res += +data[i]
    return res
  },
  '*': (data) => {
    let res = 1
    for (let i = 0; i < data.length; i++) res *= +data[i]
    return res
  },
  '/': (data) => {
    let res = data[0]
    for (let i = 1; i < data.length; i++) res /= +data[i]
    return res
  },
  '-': (data) => {
    if (typeof data === 'string') return -data
    if (typeof data === 'number') return -data
    if (data.length === 1) return -data[0]
    let res = data[0]
    for (let i = 1; i < data.length; i++) res -= +data[i]
    return res
  },
  '%': (data) => {
    let res = data[0]
    for (let i = 1; i < data.length; i++) res %= +data[i]
    return res
  },
  max: (data) => Math.max(...data),
  min: (data) => Math.min(...data),
  in: ([item, array]) => (array || []).includes(item),
  '>': ([a, b]) => a > b,
  '<': ([a, b, c]) => (c === undefined ? a < b : a < b && b < c),
  preserve: {
    traverse: false,
    method: declareSync((i) => i, true),
    [Sync]: () => true
  },
  if: {
    method: (input, context, above, engine) => {
      if (!Array.isArray(input)) throw new InvalidControlInput(input)

      if (input.length === 1) return engine.run(input[0], context, { above })
      if (input.length < 2) return null

      input = [...input]
      if (input.length % 2 !== 1) input.push(null)

      // fallback to the default if the condition is false
      const onFalse = input.pop()

      // while there are still conditions
      while (input.length) {
        const check = input.shift()
        const onTrue = input.shift()

        const test = engine.run(check, context, { above })

        // if the condition is true, run the true branch
        if (engine.truthy(test)) return engine.run(onTrue, context, { above })
      }

      return engine.run(onFalse, context, { above })
    },
    [Sync]: (data, buildState) => isSyncDeep(data, buildState.engine, buildState),
    deterministic: (data, buildState) => {
      return isDeterministic(data, buildState.engine, buildState)
    },
    asyncMethod: async (input, context, above, engine) => {
      if (!Array.isArray(input)) throw new InvalidControlInput(input)

      // check the bounds
      if (input.length === 1) return engine.run(input[0], context, { above })
      if (input.length < 2) return null

      input = [...input]

      if (input.length % 2 !== 1) input.push(null)

      // fallback to the default if the condition is false
      const onFalse = input.pop()

      // while there are still conditions
      while (input.length) {
        const check = input.shift()
        const onTrue = input.shift()

        const test = await engine.run(check, context, { above })

        // if the condition is true, run the true branch
        if (engine.truthy(test)) return engine.run(onTrue, context, { above })
      }

      return engine.run(onFalse, context, { above })
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
  or: (arr, _1, _2, engine) => {
    for (let i = 0; i < arr.length; i++) {
      if (engine.truthy(arr[i])) return arr[i]
    }
    return arr[arr.length - 1]
  },
  and: (arr, _1, _2, engine) => {
    for (let i = 0; i < arr.length; i++) {
      if (!engine.truthy(arr[i])) return arr[i]
    }
    return arr[arr.length - 1]
  },
  substr: ([string, from, end]) => {
    if (end < 0) {
      const result = string.substr(from)
      return result.substr(0, result.length + end)
    }
    return string.substr(from, end)
  },
  length: ([i]) => {
    if (typeof i === 'string' || Array.isArray(i)) return i.length
    if (i && typeof i === 'object') return Object.keys(i).length
    return 0
  },
  get: {
    method: ([data, key, defaultValue], context, above, engine) => {
      const notFound = defaultValue === undefined ? null : defaultValue

      const subProps = splitPathMemoized(String(key))
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
  // Adding this to spec something out, not to merge it quite yet
  val: {
    method: (args, context, above) => {
      let result = context
      let start = 0
      if (Array.isArray(args[0]) && args[0].length === 1) {
        start++
        const climb = +Math.abs(args[0][0])
        let pos = 0
        for (let i = 0; i < climb; i++) {
          result = above[pos++]
          if (i === above.length - 1 && Array.isArray(result)) {
            above = result
            result = result[0]
            pos = 1
          }
        }
      }

      for (let i = start; i < args.length; i++) {
        if (args[i] === null) continue
        if (result === null || result === undefined) return null
        result = result[args[i]]
      }
      if (typeof result === 'undefined') return null
      return result
    },
    deterministic: false
  },
  var: (key, context, above, engine) => {
    let b
    if (Array.isArray(key)) {
      b = key[1]
      key = key[0]
    }
    let iter = 0
    while (
      typeof key === 'string' &&
      key.startsWith('../') &&
      iter < above.length
    ) {
      context = above[iter++]
      key = key.substring(3)
      // A performance optimization that allows you to pass the previous above array without spreading it as the last argument
      if (iter === above.length && Array.isArray(context)) {
        iter = 0
        above = context
        context = above[iter++]
      }
    }

    const notFound = b === undefined ? null : b
    if (typeof key === 'undefined' || key === '' || key === null) {
      if (engine.allowFunctions || typeof context !== 'function') {
        return context
      }
      return null
    }
    const subProps = splitPathMemoized(String(key))
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
    if (engine.allowFunctions || typeof context !== 'function') {
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
  some: createArrayIterativeMethod('some', true),
  all: createArrayIterativeMethod('every', true),
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
      const result = defaultMethods.some.compile(data, buildState)
      return result ? buildState.compile`!(${result})` : false
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
      const { async } = buildState
      let [selector, mapper, defaultValue] = data
      selector = buildString(selector, buildState)
      if (typeof defaultValue !== 'undefined') {
        defaultValue = buildString(defaultValue, buildState)
      }
      const mapState = {
        ...buildState,
        extraArguments: 'above',
        avoidInlineAsync: true
      }
      mapper = build(mapper, mapState)
      const aboveArray = mapper.aboveDetected ? '[null, context, above]' : 'null'

      buildState.methods.push(mapper)
      if (async) {
        if (!isSync(mapper) || selector.includes('await')) {
          buildState.detectAsync = true
          if (typeof defaultValue !== 'undefined') {
            return `await asyncIterators.reduce(${selector} || [], (a,b) => methods[${
              buildState.methods.length - 1
            }]({ accumulator: a, current: b }, ${aboveArray}), ${defaultValue})`
          }
          return `await asyncIterators.reduce(${selector} || [], (a,b) => methods[${
            buildState.methods.length - 1
          }]({ accumulator: a, current: b }, ${aboveArray}))`
        }
      }
      if (typeof defaultValue !== 'undefined') {
        return `(${selector} || []).reduce((a,b) => methods[${
          buildState.methods.length - 1
        }]({ accumulator: a, current: b }, ${aboveArray}), ${defaultValue})`
      }
      return `(${selector} || []).reduce((a,b) => methods[${
        buildState.methods.length - 1
      }]({ accumulator: a, current: b }, ${aboveArray}))`
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
            above: [selector, context, above]
          }
        )
      }
      if (typeof defaultValue === 'undefined') {
        return selector.reduce(func)
      }
      return selector.reduce(func, defaultValue)
    },
    [Sync]: (data, buildState) => isSyncDeep(data, buildState.engine, buildState),
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
              above: [selector, context, above]
            }
          )
        },
        defaultValue
      )
    },
    traverse: false
  },
  '!': (value, _1, _2, engine) => Array.isArray(value) ? !engine.truthy(value[0]) : !engine.truthy(value),
  '!!': (value, _1, _2, engine) => Boolean(Array.isArray(value) ? engine.truthy(value[0]) : engine.truthy(value)),
  cat: (arr) => {
    if (typeof arr === 'string') return arr
    let res = ''
    for (let i = 0; i < arr.length; i++) res += arr[i]
    return res
  },
  keys: ([obj]) => typeof obj === 'object' ? Object.keys(obj) : [],
  pipe: {
    traverse: false,
    [Sync]: (data, buildState) => isSyncDeep(data, buildState.engine, buildState),
    method: (args, context, above, engine) => {
      if (!Array.isArray(args)) throw new Error('Data for pipe must be an array')
      let answer = engine.run(args[0], context, { above: [args, context, above] })
      for (let i = 1; i < args.length; i++) answer = engine.run(args[i], answer, { above: [args, context, above] })
      return answer
    },
    asyncMethod: async (args, context, above, engine) => {
      if (!Array.isArray(args)) throw new Error('Data for pipe must be an array')
      let answer = await engine.run(args[0], context, { above: [args, context, above] })
      for (let i = 1; i < args.length; i++) answer = await engine.run(args[i], answer, { above: [args, context, above] })
      return answer
    },
    compile: (args, buildState) => {
      let res = buildState.compile`${args[0]}`
      for (let i = 1; i < args.length; i++) res = buildState.compile`${build(args[i], { ...buildState, extraArguments: 'above' })}(${res}, [null, context, above])`
      return res
    },
    deterministic: (data, buildState) => {
      if (!Array.isArray(data)) return false
      data = [...data]
      const first = data.shift()
      return isDeterministic(first, buildState.engine, buildState) && isDeterministic(data, buildState.engine, { ...buildState, insideIterator: true })
    }
  },
  eachKey: {
    traverse: false,
    [Sync]: (data, buildState) => isSyncDeep(Object.values(data[Object.keys(data)[0]]), buildState.engine, buildState),
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
              // @ts-ignore Never[] is not accurate
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

function createArrayIterativeMethod (name, useTruthy = false) {
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
    [Sync]: (data, buildState) => isSyncDeep(data, buildState.engine, buildState),
    method: (input, context, above, engine) => {
      if (!Array.isArray(input)) throw new InvalidControlInput(input)
      let [selector, mapper] = input
      selector =
        engine.run(selector, context, {
          above
        }) || []

      return selector[name]((i, index) => {
        const result = engine.run(mapper, i, {
          above: [{ item: selector, index }, context, above]
        })
        return useTruthy ? engine.truthy(result) : result
      })
    },
    asyncMethod: async (input, context, above, engine) => {
      if (!Array.isArray(input)) throw new InvalidControlInput(input)
      let [selector, mapper] = input
      selector =
        (await engine.run(selector, context, {
          above
        })) || []
      return asyncIterators[name](selector, (i, index) => {
        const result = engine.run(mapper, i, {
          above: [{ item: selector, index }, context, above]
        })
        return useTruthy ? engine.truthy(result) : result
      })
    },
    compile: (data, buildState) => {
      if (!Array.isArray(data)) throw new InvalidControlInput(data)
      const { async } = buildState
      const [selector, mapper] = data

      const mapState = {
        ...buildState,
        avoidInlineAsync: true,
        iteratorCompile: true,
        extraArguments: 'index, above'
      }

      const method = build(mapper, mapState)
      const aboveArray = method.aboveDetected ? buildState.compile`[{ item: null, index: x }, context, above]` : buildState.compile`null`

      if (async) {
        if (!isSyncDeep(mapper, buildState.engine, buildState)) {
          buildState.detectAsync = true
          return buildState.compile`await asyncIterators[${name}](${selector} || [], async (i, x) => ${method}(i, x, ${aboveArray}))`
        }
      }

      return buildState.compile`(${selector} || [])[${name}]((i, x) => ${method}(i, x, ${aboveArray}))`
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
  return buildState.insideIterator && !String(data).includes('../../')
}
Object.assign(defaultMethods.missing, {
  deterministic: false
})
Object.assign(defaultMethods.missing_some, {
  deterministic: false
})
// @ts-ignore Allow custom attribute
defaultMethods['<'].compile = function (data, buildState) {
  if (!Array.isArray(data)) return false
  if (data.length === 2) return buildState.compile`(${data[0]} < ${data[1]})`
  if (data.length === 3) return buildState.compile`(${data[0]} < ${data[1]} && ${data[1]} < ${data[2]})`
  return false
}
// @ts-ignore Allow custom attribute
defaultMethods['<='].compile = function (data, buildState) {
  if (!Array.isArray(data)) return false
  if (data.length === 2) return buildState.compile`(${data[0]} <= ${data[1]})`
  if (data.length === 3) return buildState.compile`(${data[0]} <= ${data[1]} && ${data[1]} <= ${data[2]})`
  return false
}
// @ts-ignore Allow custom attribute
defaultMethods.min.compile = function (data, buildState) {
  if (!Array.isArray(data)) return false
  return `Math.min(${data
    .map((i) => buildString(i, buildState))
    .join(', ')})`
}
// @ts-ignore Allow custom attribute
defaultMethods.max.compile = function (data, buildState) {
  if (!Array.isArray(data)) return false
  return `Math.max(${data
    .map((i) => buildString(i, buildState))
    .join(', ')})`
}
// @ts-ignore Allow custom attribute
defaultMethods['>'].compile = function (data, buildState) {
  if (!Array.isArray(data)) return false
  if (data.length !== 2) return false
  return buildState.compile`(${data[0]} > ${data[1]})`
}
// @ts-ignore Allow custom attribute
defaultMethods['>='].compile = function (data, buildState) {
  if (!Array.isArray(data)) return false
  if (data.length !== 2) return false
  return buildState.compile`(${data[0]} >= ${data[1]})`
}
// @ts-ignore Allow custom attribute
defaultMethods['=='].compile = function (data, buildState) {
  if (!Array.isArray(data)) return false
  if (data.length !== 2) return false
  return buildState.compile`(${data[0]} == ${data[1]})`
}
// @ts-ignore Allow custom attribute
defaultMethods['!='].compile = function (data, buildState) {
  if (!Array.isArray(data)) return false
  if (data.length !== 2) return false
  return buildState.compile`(${data[0]} != ${data[1]})`
}
// @ts-ignore Allow custom attribute
defaultMethods.if.compile = function (data, buildState) {
  if (!Array.isArray(data)) return false
  if (data.length < 3) return false

  data = [...data]
  if (data.length % 2 !== 1) data.push(null)
  const onFalse = data.pop()

  let res = buildState.compile``
  while (data.length) {
    const condition = data.shift()
    const onTrue = data.shift()
    res = buildState.compile`${res} engine.truthy(${condition}) ? ${onTrue} : `
  }

  return buildState.compile`(${res} ${onFalse})`
}
// @ts-ignore Allow custom attribute
defaultMethods['==='].compile = function (data, buildState) {
  if (!Array.isArray(data)) return false
  if (data.length !== 2) return false
  return buildState.compile`(${data[0]} === ${data[1]})`
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
  if (!buildState.engine.truthy.IDENTITY) return false
  if (Array.isArray(data)) {
    return `(${data.map((i) => buildString(i, buildState)).join(' || ')})`
  } else {
    return `(${buildString(data, buildState)}).reduce((a,b) => a||b, false)`
  }
}

// @ts-ignore Allow custom attribute
defaultMethods.in.compile = function (data, buildState) {
  if (!Array.isArray(data)) return false
  return buildState.compile`(${data[1]} || []).includes(${data[0]})`
}

// @ts-ignore Allow custom attribute
defaultMethods.and.compile = function (data, buildState) {
  if (!buildState.engine.truthy.IDENTITY) return false
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
  if (typeof data === 'string') return JSON.stringify(data)
  if (!Array.isArray(data)) return false
  let res = buildState.compile`''`
  for (let i = 0; i < data.length; i++) res = buildState.compile`${res} + ${data[i]}`
  return buildState.compile`(${res})`
}

// @ts-ignore Allow custom attribute
defaultMethods['!'].compile = function (
  data,
  buildState
) {
  if (Array.isArray(data)) return buildState.compile`(!engine.truthy(${data[0]}))`
  return buildState.compile`(!engine.truthy(${data}))`
}

defaultMethods.not = defaultMethods['!']

// @ts-ignore Allow custom attribute
defaultMethods['!!'].compile = function (data, buildState) {
  if (Array.isArray(data)) return buildState.compile`(!!engine.truthy(${data[0]}))`
  return `(!!engine.truthy(${data}))`
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
    const pieces = splitPathMemoized(key)
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

    if (key === '../index' && buildState.iteratorCompile) return 'index'

    // this counts the number of var accesses to determine if they're all just using this override.
    // this allows for a small optimization :)
    if (typeof key === 'undefined' || key === null || key === '') return 'context'
    if (typeof key !== 'string' && typeof key !== 'number') return false

    key = key.toString()
    if (key.includes('../')) return false

    const pieces = splitPathMemoized(key)
    const [top] = pieces
    buildState.varTop.add(top)

    if (!buildState.engine.allowFunctions) buildState.methods.preventFunctions = a => typeof a === 'function' ? null : a
    else buildState.methods.preventFunctions = a => a

    // support older versions of node
    if (!chainingSupported) {
      return `(methods.preventFunctions(((a,b) => (typeof a === 'undefined' || a === null) ? b : a)(${pieces.reduce(
        (text, i) => `(${text}||0)[${JSON.stringify(i)}]`,
        '(context||0)'
      )}, ${buildString(defaultValue, buildState)})))`
    }
    return `(methods.preventFunctions(context${pieces
      .map((i) => `?.[${JSON.stringify(i)}]`)
      .join('')} ?? ${buildString(defaultValue, buildState)}))`
  }
  return false
}

// @ts-ignore Allowing a optimizeUnary attribute that can be used for performance optimizations
defaultMethods['+'].optimizeUnary = defaultMethods['-'].optimizeUnary = defaultMethods.var.optimizeUnary = defaultMethods['!'].optimizeUnary = defaultMethods['!!'].optimizeUnary = defaultMethods.cat.optimizeUnary = true

export default {
  ...defaultMethods
}
