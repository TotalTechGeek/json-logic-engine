// @ts-check
'use strict'

import checkYield from './utilities/checkYield.js'
import defaultMethods from './defaultMethods.js'
import YieldStructure from './structures/Yield.js'
import EngineObject from './structures/EngineObject.js'
import LogicEngine from './logic.js'
import asyncPool from './asyncPool.js'
import { Sync, isSync } from './constants.js'
import declareSync from './utilities/declareSync.js'
import { buildAsync } from './compiler.js'
import omitUndefined from './utilities/omitUndefined.js'

/**
 * An engine capable of running asynchronous JSON Logic.
 */
class AsyncLogicEngine {
  /**
   *
   * @param {Object} methods An object that stores key-value pairs between the names of the commands & the functions they execute.
   * @param {{ yieldSupported?: Boolean, disableInline?: Boolean, permissive?: boolean }} options
   */
  constructor (
    methods = defaultMethods,
    options = { yieldSupported: false, disableInline: false, permissive: false }
  ) {
    this.methods = { ...methods }
    /** @type {{yieldSupported?: Boolean, disableInline?: Boolean, permissive?: boolean}} */
    this.options = { ...options }
    this.disableInline = options.disableInline
    this.async = true
    this.fallback = new LogicEngine(methods, options)
  }

  /**
   * An internal method used to parse through the JSON Logic at a lower level.
   * @param {*} logic The logic being executed.
   * @param {*} context The context of the logic being run (input to the function.)
   * @param {*} above The context above (can be used for handlebars-style data traversal.)
   * @returns {Promise<{ func: string, result: * }>}
   */
  async _parse (logic, context, above) {
    const [func] = Object.keys(logic)
    const data = logic[func]
    if (this.methods[func]) {
      if (typeof this.methods[func] === 'function') {
        const input = await this.run(data, context, { above })
        if (this.options.yieldSupported && (await checkYield(input))) {
          return { result: input, func }
        }
        const result = await this.methods[func](input, context, above, this)
        return { result: Array.isArray(result) ? Promise.all(result) : result, func }
      }

      if (typeof this.methods[func] === 'object') {
        const { asyncMethod, method, traverse } = this.methods[func]
        const shouldTraverse =
          typeof traverse === 'undefined' ? true : traverse
        const parsedData = shouldTraverse
          ? await this.run(data, context, { above })
          : data

        if (this.options.yieldSupported && (await checkYield(parsedData))) {
          return { result: parsedData, func }
        }

        const result = await (asyncMethod || method)(
          parsedData,
          context,
          above,
          this
        )
        return { result: Array.isArray(result) ? Promise.all(result) : result, func }
      }
    }
    if (this.options.permissive) return { result: logic, func }
    throw new Error(`Method '${func}' was not found in the Logic Engine.`)
  }

  /**
   *
   * @param {String} name The name of the method being added.
   * @param {Function|{ traverse?: Boolean, method?: Function, asyncMethod?: Function, deterministic?: Function | Boolean }} method
   * @param {{ deterministic?: Boolean, yields?: Boolean, useContext?: Boolean, async?: Boolean, sync?: Boolean }} annotations This is used by the compiler to help determine if it can optimize the function being generated.
   */
  addMethod (
    name,
    method,
    { deterministic, async, sync, yields, useContext } = {}
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

    Object.assign(method, omitUndefined({ yields, deterministic, useContext }))
    // @ts-ignore
    this.fallback.addMethod(name, method, { deterministic, yields, useContext })
    this.methods[name] = declareSync(method, sync)
  }

  /**
   * Adds a batch of functions to the engine
   * @param {String} name
   * @param {Object} obj
   * @param {{ deterministic?: Boolean, yields?: Boolean, useContext?: Boolean, async?: Boolean, sync?: Boolean }} annotations Not recommended unless you're sure every function from the module will match these annotations.
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
   *
   * @param {*} logic The logic to be executed
   * @param {*} data The data being passed in to the logic to be executed against.
   * @param {{ above?: any }} options Options for the invocation
   * @returns {Promise}
   */
  async run (logic, data = {}, options = {}) {
    const { above = [] } = options
    if (Array.isArray(logic)) {
      const result = await Promise.all(
        logic.map((i) => this.run(i, data, { above }))
      )

      if (this.options.yieldSupported && (await checkYield(result))) {
        return new EngineObject({
          result
        })
      }

      return result
    }

    if (logic && typeof logic === 'object' && Object.keys(logic).length > 0) {
      const { func, result } = await this._parse(logic, data, above)

      if (this.options.yieldSupported && (await checkYield(result))) {
        if (result instanceof YieldStructure) {
          if (result._input) {
            result._logic = { [func]: result._input }
          }
          if (!result._logic) {
            result._logic = logic
          }
          return result
        }

        return new EngineObject({
          result: { [func]: result.data.result }
        })
      }

      return result
    }

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
      if (top === true && constructedFunction && !constructedFunction[Sync]) {
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

export default AsyncLogicEngine
