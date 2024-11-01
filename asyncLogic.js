// @ts-check
'use strict'

import defaultMethods from './defaultMethods.js'
import LogicEngine from './logic.js'
import asyncPool from './asyncPool.js'
import { Sync, isSync } from './constants.js'
import declareSync from './utilities/declareSync.js'
import { buildAsync } from './compiler.js'
import omitUndefined from './utilities/omitUndefined.js'
import { optimize } from './async_optimizer.js'
import { applyPatches } from './compatibility.js'

/**
 * An engine capable of running asynchronous JSON Logic.
 */
class AsyncLogicEngine {
  /**
   * Creates a new instance of the Logic Engine.
   *
   * "compatible" applies a few patches to make it compatible with the preferences of mainline JSON Logic.
   * The main changes are:
   * - In mainline: "all" will return false if the array is empty; by default, we return true.
   * - In mainline: empty arrays are falsey; in our implementation, they are truthy.
   *
   * @param {Object} methods An object that stores key-value pairs between the names of the commands & the functions they execute.
   * @param {{ disableInline?: Boolean, disableInterpretedOptimization?: boolean, permissive?: boolean, compatible?: boolean }} options
   */
  constructor (
    methods = defaultMethods,
    options = { disableInline: false, disableInterpretedOptimization: false, permissive: false }
  ) {
    this.methods = { ...methods }
    /** @type {{disableInline?: Boolean, disableInterpretedOptimization?: Boolean }} */
    this.options = { disableInline: options.disableInline, disableInterpretedOptimization: options.disableInterpretedOptimization }
    this.disableInline = options.disableInline
    this.disableInterpretedOptimization = options.disableInterpretedOptimization
    this.async = true
    this.fallback = new LogicEngine(methods, options)

    if (options.compatible) applyPatches(this)

    this.optimizedMap = new WeakMap()
    this.missesSinceSeen = 0

    if (!this.isData) {
      if (!options.permissive) this.isData = () => false
      else this.isData = (data, key) => !(key in this.methods)
    }

    this.fallback.isData = this.isData
  }

  /**
   * Determines the truthiness of a value.
   * You can override this method to change the way truthiness is determined.
   * @param {*} value
   * @returns
   */
  truthy (value) {
    return value
  }

  /**
   * An internal method used to parse through the JSON Logic at a lower level.
   * @param {*} logic The logic being executed.
   * @param {*} context The context of the logic being run (input to the function.)
   * @param {*} above The context above (can be used for handlebars-style data traversal.)
   * @returns {Promise<*>}
   */
  async _parse (logic, context, above) {
    const [func] = Object.keys(logic)
    const data = logic[func]

    if (this.isData(logic, func)) return logic

    if (!this.methods[func]) throw new Error(`Method '${func}' was not found in the Logic Engine.`)

    if (typeof this.methods[func] === 'function') {
      const input = await this.run(data, context, { above })

      const result = await this.methods[func](input, context, above, this)
      return Array.isArray(result) ? Promise.all(result) : result
    }

    if (typeof this.methods[func] === 'object') {
      const { asyncMethod, method, traverse } = this.methods[func]
      const shouldTraverse =
          typeof traverse === 'undefined' ? true : traverse
      const parsedData = shouldTraverse
        ? await this.run(data, context, { above })
        : data

      const result = await (asyncMethod || method)(
        parsedData,
        context,
        above,
        this
      )
      return Array.isArray(result) ? Promise.all(result) : result
    }

    throw new Error(`Method '${func}' is not set up properly.`)
  }

  /**
   *
   * @param {String} name The name of the method being added.
   * @param {Function|{ traverse?: Boolean, method?: Function, asyncMethod?: Function, deterministic?: Function | Boolean }} method
   * @param {{ deterministic?: Boolean, useContext?: Boolean, async?: Boolean, sync?: Boolean }} annotations This is used by the compiler to help determine if it can optimize the function being generated.
   */
  addMethod (
    name,
    method,
    { deterministic, async, sync, useContext } = {}
  ) {
    if (typeof async === 'undefined' && typeof sync === 'undefined') sync = false
    if (typeof sync !== 'undefined') async = !sync
    if (typeof async !== 'undefined') sync = !async

    if (typeof method === 'function') {
      if (async) {
        method = { asyncMethod: method, traverse: true }
      } else {
        method = { method, traverse: true }
      }
    } else {
      method = { ...method }
    }

    Object.assign(method, omitUndefined({ deterministic, useContext }))
    // @ts-ignore
    this.fallback.addMethod(name, method, { deterministic, useContext })
    this.methods[name] = declareSync(method, sync)
  }

  /**
   * Adds a batch of functions to the engine
   * @param {String} name
   * @param {Object} obj
   * @param {{ deterministic?: Boolean, useContext?: Boolean, async?: Boolean, sync?: Boolean }} annotations Not recommended unless you're sure every function from the module will match these annotations.
   */
  addModule (name, obj, annotations = {}) {
    Object.getOwnPropertyNames(obj).forEach((key) => {
      if (typeof obj[key] === 'function' || typeof obj[key] === 'object') {
        this.addMethod(
          `${name}${name ? '.' : ''}${key}`,
          obj[key],
          annotations
        )
      }
    })
  }

  /**
   * Runs the logic against the data.
   *
   * NOTE: With interpreted optimizations enabled, it will cache the execution plan for the logic for
   * future invocations; if you plan to modify the logic, you should disable this feature, by passing
   * `disableInterpretedOptimization: true` in the constructor.
   *
   * If it detects that a bunch of dynamic objects are being passed in, and it doesn't see the same object,
   * it will disable the interpreted optimization.
   *
   * @param {*} logic The logic to be executed
   * @param {*} data The data being passed in to the logic to be executed against.
   * @param {{ above?: any }} options Options for the invocation
   * @returns {Promise}
   */
  async run (logic, data = {}, options = {}) {
    const { above = [] } = options

    // OPTIMIZER BLOCK //
    if (this.missesSinceSeen > 500) {
      this.disableInterpretedOptimization = true
      this.missesSinceSeen = 0
    }

    if (!this.disableInterpretedOptimization && typeof logic === 'object' && logic && !this.optimizedMap.has(logic)) {
      this.optimizedMap.set(logic, optimize(logic, this, above))
      this.missesSinceSeen++
      return typeof this.optimizedMap.get(logic) === 'function' ? this.optimizedMap.get(logic)(data, above) : this.optimizedMap.get(logic)
    }

    if (!this.disableInterpretedOptimization && logic && typeof logic === 'object' && this.optimizedMap.get(logic)) {
      this.missesSinceSeen = 0
      return typeof this.optimizedMap.get(logic) === 'function' ? this.optimizedMap.get(logic)(data, above) : this.optimizedMap.get(logic)
    }
    // END OPTIMIZER BLOCK //

    if (Array.isArray(logic)) {
      const res = []
      // Note: In the past, it used .map and Promise.all; this can be changed in the future
      // if we want it to run concurrently.
      for (let i = 0; i < logic.length; i++) res.push(await this.run(logic[i], data, { above }))
      return res
    }

    if (logic && typeof logic === 'object' && Object.keys(logic).length > 0) return this._parse(logic, data, above)

    return logic
  }

  /**
   *
   * @param {*} logic The logic to be built.
   * @param {{ top?: Boolean, above?: any, max?: Number }} options
   * @returns {Promise<Function>}
   */
  async build (logic, options = {}) {
    const { above = [], max = 100, top = true } = options
    this.fallback.truthy = this.truthy
    if (top) {
      const constructedFunction = await buildAsync(logic, {
        engine: this,
        above,
        async: true,
        state: {}
      })

      const result = declareSync((...args) => {
        if (top === true) {
          try {
            const result =
              typeof constructedFunction === 'function'
                ? constructedFunction(...args)
                : constructedFunction
            return Promise.resolve(result)
          } catch (err) {
            return Promise.reject(err)
          }
        }

        const result =
          typeof constructedFunction === 'function'
            ? constructedFunction(...args)
            : constructedFunction

        return result
      }, top !== true && isSync(constructedFunction))
      // we can avoid the async pool if the constructed function is synchronous since the data
      // can't be updated :)
      if (top === true && constructedFunction && !constructedFunction[Sync] && typeof constructedFunction === 'function') {
        // we use this async pool so that we can execute these in parallel without having
        // concerns about the data.
        return asyncPool({
          free: [result],
          max,
          create: () => this.build(logic, { ...options, above })
        })
      } else {
        return typeof constructedFunction === 'function' || top === true
          ? result
          : constructedFunction
      }
    }

    return logic
  }
}
Object.assign(AsyncLogicEngine.prototype.truthy, { IDENTITY: true })
export default AsyncLogicEngine
