'use strict'
const {
  createProxy
} = require('./proxy')
const asyncIterators = require('./async_iterators')
const { Sync, Override, EfficientTop } = require('./constants')
const declareSync = require('./utilities/declareSync')

function undefinedToNull (value) {
  return typeof value === 'undefined' ? null : value
}

const defaultMethods = {
  '+': data => data.reduce((a, b) => a + b, 0),
  '*': data => data.reduce((a, b) => a * b),
  '/': data => data.reduce((a, b) => a / b),
  '-': data => data.reduce((a, b) => a - b),
  '%': data => data.reduce((a, b) => a % b),
  max: data => Math.max(...data),
  min: data => Math.min(...data),
  in: ([item, array]) => array.includes(item),
  '>': ([a, b]) => a > b,
  '<': ([a, b]) => a < b,
  preserve: {
    traverse: false,
    method: declareSync(i => i)
  },
  if: {
    method: ([check, onTrue, onFalse], context, above, engine) => {
      const test = engine.run(check, context, {
        proxy: false,
        above
      })
      return engine.run(test ? onTrue : onFalse, context, {
        proxy: false,
        above
      })
    },
    asyncMethod: async ([check, onTrue, onFalse], context, above, engine) => {
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
  '<=': ([a, b]) => a <= b,
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
    if (end <= 0) {
      end = string.length - from + end
    }
    return string.substr(from, end)
  },
  var: (key, context, above, engine) => {
    // if (Array.isArray(key)) {
    //   if (key.length === 0) return context
    //   return key.map(i => defaultMethods.var(i, context, above, engine))
    // }
    if (!key && context && context[Override]) return context[Override]
    if (!key) return context
    if (typeof context !== 'object' && key.startsWith('../')) {
      return engine.methods.var(key.substring(3), above, undefined, engine)
    }

    if (engine.allowFunctions || typeof context[key] !== 'function') { return undefinedToNull(context[key]) }
  },
  missing: (checked, context, above, engine) => {
    return checked.filter(key => {
      if (!key) return context
      if (typeof context !== 'object' && key.startsWith('../')) {
        return engine.methods.missing(key.substring(3), above)
      }
      return typeof context[key] === 'undefined'
    })
  },
  map: createArrayIterativeMethod('map'),
  some: createArrayIterativeMethod('some'),
  merge: arrays => arrays.flat(),
  every: createArrayIterativeMethod('every'),
  filter: createArrayIterativeMethod('filter'),
  reduce: {
    method: ([selector, mapper, defaultValue], context, above, engine) => {
      defaultValue = engine.run(defaultValue, context, {
        proxy: false,
        above
      })
      const needsProxy = !selector.var

      selector = engine.run(selector, context, {
        proxy: false,
        above
      })

      if (needsProxy) {
        selector = createProxy(selector, context)
      }

      const func = (accumulator, current) => {
        return engine.run(mapper, createProxy({
          accumulator,
          current
        }, selector), {
          proxy: false,
          above: selector
        })
      }

      if (typeof defaultValue === 'undefined') {
        return selector.reduce(func)
      }

      return selector.reduce(func, defaultValue)
    },
    asyncMethod: async ([selector, mapper, defaultValue], context, above, engine) => {
      defaultValue = await engine.run(defaultValue, context, {
        proxy: false,
        above
      })
      const needsProxy = !selector.var
      selector = await engine.run(selector, context, {
        proxy: false,
        above
      })

      if (needsProxy) {
        selector = createProxy(selector, context)
      }

      return asyncIterators.reduce(selector, (accumulator, current) => {
        return engine.run(mapper, createProxy({
          accumulator,
          current
        }, selector), {
          proxy: false,
          above: selector
        })
      }, defaultValue)
    },
    traverse: false
  },
  not: value => !value,
  '!': value => !value,
  '!!': value => Boolean(value),
  concat: arr => arr.join(''),
  keys: obj => Object.keys(obj),
  eachKey: {
    traverse: false,
    method: (object, context, above, engine) => {
      const result = Object.keys(object).reduce((accumulator, key) => {
        const item = object[key]
        Object.defineProperty(accumulator, key, {
          enumerable: true,
          value: engine.run(item, createProxy({ key }, context), { above, proxy: false })
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
          value: await engine.run(item, createProxy({ key }, context), { above, proxy: false })
        })
        return accumulator
      }, {})
      return result
    }
  }
}

function createArrayIterativeMethod (name) {
  return {
    build: ([selector, mapper], context, above, engine) => {
      selector = engine.build(selector, {}, {
        top: EfficientTop,
        above
      })
      mapper = engine.build(mapper, {}, { top: EfficientTop, above: createProxy(selector, context) })
      return () => {
        return selector(context)[name](i => {
          return mapper(i)
        })
      }
    },
    method: ([selector, mapper], context, above, engine) => {
      const needsProxy = !selector.var
      selector = engine.run(selector, context, {
        proxy: false,
        above
      })
      if (needsProxy) {
        selector = createProxy(selector, context)
      }
      return selector[name](i => {
        return engine.run(mapper, i, {
          proxy: false,
          above: selector
        })
      })
    },
    asyncMethod: async ([selector, mapper], context, above, engine) => {
      const needsProxy = !selector.var
      selector = await engine.run(selector, context, {
        proxy: false,
        above
      })
      if (needsProxy) {
        selector = createProxy(selector, context)
      }
      return asyncIterators[name](selector, i => {
        return engine.run(mapper, i, {
          proxy: false,
          above: selector
        })
      })
    },
    asyncBuild: ([selector, mapper], context, above, engine) => {
      selector = engine.build(selector, {}, {
        top: EfficientTop,
        above
      })

      mapper = engine.build(mapper, {}, { top: EfficientTop, above: createProxy(selector, context) })

      if (selector[Sync] && mapper[Sync]) {
        return declareSync(() => {
          return selector(context)[name](i => {
            return mapper(i)
          })
        })
      }
      return async () => {
        return asyncIterators[name](await selector(context), i => {
          return mapper(i)
        })
      }
    },
    traverse: false
  }
}

// declare all of the functions here synchronous
Object.keys(defaultMethods).forEach(item => {
  if (typeof defaultMethods[item] === 'function') {
    defaultMethods[item][Sync] = true
  }
})

// include the yielding iterators as well
module.exports = { ...defaultMethods, ...require('./yieldingIterators') }
