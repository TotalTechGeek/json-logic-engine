// @ts-check
'use strict'

import {
  ReduceIterator,
  AsyncReduceIterator
} from './structures/ReduceIterator.js'
import YieldStructure from './structures/Yield.js'
import checkYield from './utilities/checkYield.js'
import { isSync } from './constants.js'
import declareSync from './utilities/declareSync.js'
import { build } from './compiler.js'

// Todo: Pursue support for yielding within the built functions.
// It will be extremely difficult to leverage the yields here.
function isDeterministic (method, engine, buildState) {
  if (Array.isArray(method)) {
    return method.every((i) => isDeterministic(i, engine, buildState))
  }
  if (method && typeof method === 'object') {
    const func = Object.keys(method)[0]
    const lower = method[func]
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
function createYieldingControl (name, method, asyncMethod) {
  return {
    yields: true,
    method: (input, context, above, engine) => {
      let arr = input
      let cur = null
      if (!Array.isArray(input)) {
        arr = input.arr
        cur = input.cur
      }
      const executed = method(input, context, above, engine)
      const iter = new ReduceIterator(arr, cur, executed)
      while (!iter.done()) {
        const cur = iter.next()
        if (checkYield(cur)) {
          return new YieldStructure({
            yield: cur,
            _name: name,
            _input: iter.state()
          })
        }
      }
      return iter.result()
    },
    asyncMethod: async (input, context, above, engine) => {
      let arr = input
      let cur = null
      if (!Array.isArray(input)) {
        arr = input.arr
        cur = input.cur
      }
      const executed = asyncMethod(input, context, above, engine)
      const iter = new AsyncReduceIterator(arr, cur, executed)
      while (!iter.done()) {
        const cur = await iter.next()
        if (checkYield(cur)) {
          return new YieldStructure({
            yield: cur,
            _name: name,
            _input: iter.state()
          })
        }
      }
      return iter.result()
    },
    traverse: false
  }
}
const ifYield = createYieldingControl(
  'ifYield',
  (input, context, above, engine) => (cur, item, arr, iter) => {
    if (arr.length % 2 === 0) {
      arr.push(null)
    }
    // if it's an even spot, and not the last item, run the condition.
    if ((iter._position & 1) === 0 && iter._position !== arr.length - 1) {
      const test = engine.run(item, context, {
        above
      })
      if (!test) {
        iter.skip()
      }
      return test
    } else if (iter._position & 1) {
      // if it's odd, then we are done.
      iter.dump()
    }

    return engine.run(item, context, {
      above
    })
  },
  (input, context, above, engine) => async (cur, item, arr, iter) => {
    if (arr.length % 2 === 0) {
      arr.push(null)
    }
    // if it's an even spot, and not the last item, run the condition.
    if ((iter._position & 1) === 0 && iter._position !== arr.length - 1) {
      const test = await engine.run(item, context, {
        above
      })
      if (!test) {
        iter.skip()
      }
      return test
    } else if (iter._position & 1) {
      // if it's odd, then we are done.
      iter.dump()
    }

    return engine.run(item, context, {
      above
    })
  }
)
const someYield = createArrayIterativeMethod(
  'someYield',
  (input, context, above, engine) => (cur, item, arr, iter) => {
    const currentItem = engine.run(iter.map, item, {
      above: [input, context, ...above]
    })
    if (currentItem) {
      iter.dump()
      return currentItem
    }
    return false
  },
  (input, context, above, engine) => async (cur, item, arr, iter) => {
    const currentItem = await engine.run(iter.map, item, {
      above: [input, context, ...above]
    })
    if (currentItem) {
      iter.dump()
      return currentItem
    }
    return false
  },
  false
)
const everyYield = createArrayIterativeMethod(
  'everyYield',
  (input, context, above, engine) => (cur, item, arr, iter) => {
    const currentItem = engine.run(iter.map, item, {
      above: [input, context, ...above]
    })
    if (!currentItem) {
      iter.dump()
      return false
    }
    return currentItem
  },
  (input, context, above, engine) => async (cur, item, arr, iter) => {
    const currentItem = await engine.run(iter.map, item, {
      above: [input, context, ...above]
    })
    if (!currentItem) {
      iter.dump()
      return false
    }
    return currentItem
  },
  true
)
const filterYield = createArrayIterativeMethod(
  'filterYield',
  (input, context, above, engine) => (cur, item, arr, iter) => {
    const currentItem = engine.run(iter.map, item, {
      above: [input, context, ...above]
    })
    if (checkYield(currentItem)) return currentItem
    if (currentItem) cur.push(item)
    return cur
  },
  (input, context, above, engine) => async (cur, item, arr, iter) => {
    const currentItem = await engine.run(iter.map, item, {
      above: [input, context, ...above]
    })
    if (checkYield(currentItem)) return currentItem
    if (currentItem) cur.push(item)
    return cur
  },
  () => []
)
const mapYield = createArrayIterativeMethod(
  'mapYield',
  (input, context, above, engine) => (cur, item, arr, iter) => {
    const currentItem = engine.run(iter.map, item, {
      above: [input, context, ...above]
    })
    if (checkYield(currentItem)) return currentItem
    cur.push(currentItem)
    return cur
  },
  (input, context, above, engine) => async (cur, item, arr, iter) => {
    const currentItem = await engine.run(iter.map, item, {
      above: [input, context, ...above]
    })
    if (checkYield(currentItem)) return currentItem
    cur.push(currentItem)
    return cur
  },
  () => []
)
const reduceYield = createArrayIterativeMethod(
  'reduceYield',
  (input, context, above, engine) => (cur, item, arr, iter) => {
    return engine.run(
      iter.map,
      {
        accumulator: cur,
        current: item
      },
      {
        above: [input, context, ...above]
      }
    )
  },
  (input, context, above, engine) => async (cur, item, arr, iter) => {
    return engine.run(
      iter.map,
      {
        accumulator: cur,
        current: item
      },
      {
        above: [input, context, ...above]
      }
    )
  }
)
function createArrayIterativeMethod (
  name,
  method,
  asyncMethod,
  defaultInitializer
) {
  const result = {
    yields: true,
    deterministic: (data, buildState) => {
      return (
        isDeterministic(data[0], buildState.engine, buildState) &&
        isDeterministic(data[1], buildState.engine, {
          ...buildState,
          insideIterator: true
        })
      )
    },
    build: (input, context, above, engine, buildState) => {
      buildState.useContext = true
      return declareSync(() => result.method(input, context, above, engine))
    },
    asyncBuild: (input, context, above, engine, buildState) => {
      buildState.useContext = true
      const [selector, mapper] = input
      // const selectFunction = engine.build(selector, {}, { top: EfficientTop })
      // const mapFunction = engine.build(mapper, {}, { top: EfficientTop })
      const selectFunction = build(selector, {
        engine,
        async: true,
        avoidInlineAsync: true
      })
      const mapFunction = build(mapper, {
        engine,
        state: {},
        async: true,
        avoidInlineAsync: true
      })
      if (isSync(selectFunction) && isSync(mapFunction)) {
        return declareSync(() =>
          result.method(input, context, above, engine.fallback)
        )
      }
      return () => result.asyncMethod(input, context, above, engine)
    },
    method: (input, context, above, engine) => {
      let defaultCur = defaultInitializer
      if (typeof defaultInitializer === 'function') {
        defaultCur = defaultInitializer()
      }
      let arr
      let cur
      let map = null
      if (Array.isArray(input)) {
        const [selector, mapper, defaultValue] = input
        const selected =
          engine.run(selector, context, {
            above
          }) || []
        if (checkYield(selected)) {
          // todo: add extraction of the existing yields.
          return new YieldStructure({
            _input: [selector, mapper, defaultValue],
            _name: name,
            yields: selected.yields()
          })
        }
        arr = selected
        map = mapper
        cur = defaultValue === 0 ? 0 : defaultValue || defaultCur
      } else {
        arr = input.arr
        cur = input.cur
        map = input.map
      }
      const executed = method(input, context, above, engine)
      const iter = new ReduceIterator(arr, cur, executed)
      iter.map = map
      while (!iter.done()) {
        const cur = iter.next()
        if (checkYield(cur)) {
          return new YieldStructure({
            yields: cur.yields(),
            _name: name,
            _input: {
              ...iter.state(),
              map
            }
          })
        }
      }
      return iter.result()
    },
    asyncMethod: async (input, context, above, engine) => {
      let defaultCur = defaultInitializer
      if (typeof defaultInitializer === 'function') {
        defaultCur = defaultInitializer()
      }
      let arr
      let cur
      let map = null
      if (Array.isArray(input)) {
        const [selector, mapper, defaultValue] = input
        const selected =
          (await engine.run(selector, context, {
            above
          })) || []
        if (checkYield(selected)) {
          // todo: add extraction of the existing yields.
          return new YieldStructure({
            _name: name,
            _input: [selector, mapper, defaultValue],
            yields: selected.yields()
          })
        }
        arr = selected
        map = mapper
        cur = defaultValue === 0 ? 0 : defaultValue || defaultCur
      } else {
        arr = input.arr
        cur = input.cur
        map = input.map
      }
      const executed = asyncMethod(input, context, above, engine)
      const iter = new AsyncReduceIterator(arr, cur, executed)
      iter.map = map
      while (!iter.done()) {
        const cur = await iter.next()
        if (checkYield(cur)) {
          return new YieldStructure({
            yields: cur.yields(),
            _name: name,
            _input: {
              ...iter.state(),
              map
            }
          })
        }
      }
      return iter.result()
    },
    traverse: false
  }
  return result
}
export { someYield }
export { everyYield }
export { filterYield }
export { mapYield }
export { reduceYield }
export { ifYield }
export default {
  someYield,
  everyYield,
  filterYield,
  mapYield,
  reduceYield,
  ifYield
}
