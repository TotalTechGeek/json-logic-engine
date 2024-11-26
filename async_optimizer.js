// This is the synchronous version of the optimizer; which the Async one should be based on.
import { isDeterministic } from './compiler.js'
import { map } from './async_iterators.js'
import { isSync, Sync } from './constants.js'
import declareSync from './utilities/declareSync.js'

/**
 * Turns an expression like { '+': [1, 2] } into a function that can be called with data.
 * @param {*} logic
 * @param {*} engine
 * @param {string} methodName
 * @param {any[]} above
 * @returns A method that can be called to execute the logic.
 */
function getMethod (logic, engine, methodName, above) {
  const method = engine.methods[methodName]
  const called = method.asyncMethod ? method.asyncMethod : method.method ? method.method : method

  if (method.traverse === false) {
    if (typeof method[Sync] === 'function' && method[Sync](logic, { engine })) {
      const called = method.method ? method.method : method
      return declareSync((data, abv) => called(logic[methodName], data, abv || above, engine.fallback), true)
    }

    const args = logic[methodName]
    return (data, abv) => called(args, data, abv || above, engine)
  }

  const args = logic[methodName]

  if (Array.isArray(args)) {
    const optimizedArgs = args.map(l => optimize(l, engine, above))

    if (isSync(optimizedArgs) && (method.method || method[Sync])) {
      const called = method.method ? method.method : method
      return declareSync((data, abv) => {
        const evaluatedArgs = optimizedArgs.map(l => typeof l === 'function' ? l(data, abv) : l)
        return called(evaluatedArgs, data, abv || above, engine.fallback)
      }, true)
    }

    return async (data, abv) => {
      const evaluatedArgs = await map(optimizedArgs, l => typeof l === 'function' ? l(data, abv) : l)
      return called(evaluatedArgs, data, abv || above, engine)
    }
  } else {
    const optimizedArgs = optimize(args, engine, above)

    if (isSync(optimizedArgs) && (method.method || method[Sync])) {
      const called = method.method ? method.method : method
      return declareSync((data, abv) => called(typeof optimizedArgs === 'function' ? optimizedArgs(data, abv) : optimizedArgs, data, abv || above, engine), true)
    }

    return async (data, abv) => {
      return called(typeof optimizedArgs === 'function' ? await optimizedArgs(data, abv) : optimizedArgs, data, abv || above, engine)
    }
  }
}

/**
 * Processes the logic for the engine once so that it doesn't need to be traversed again.
 * @param {*} logic
 * @param {*} engine
 * @param {any[]} above
 * @returns A function that optimizes the logic for the engine in advance.
 */
export function optimize (logic, engine, above = []) {
  if (Array.isArray(logic)) {
    const arr = logic.map(l => optimize(l, engine, above))
    if (isSync(arr)) return declareSync((data, abv) => arr.map(l => typeof l === 'function' ? l(data, abv) : l), true)
    return async (data, abv) => map(arr, l => typeof l === 'function' ? l(data, abv) : l)
  };

  if (logic && typeof logic === 'object') {
    const keys = Object.keys(logic)
    const methodName = keys[0]

    const isData = engine.isData(logic, methodName)
    if (isData) return () => logic

    // If we have a deterministic function, we can just return the result of the evaluation,
    // basically inlining the operation.
    const deterministic = !engine.disableInline && isDeterministic(logic, engine, { engine })

    if (methodName in engine.methods) {
      const result = getMethod(logic, engine, methodName, above)
      if (deterministic) {
        let computed

        if (isSync(result)) {
          return declareSync(() => {
            if (!computed) computed = result()
            return computed
          }, true)
        }

        // For async, it's a little less straightforward since it could be a promise,
        // so we'll make it a closure.
        return async () => {
          if (!computed) computed = await result()
          return computed
        }
      }
      return result
    }
  }

  return logic
}
