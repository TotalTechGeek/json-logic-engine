// @ts-check
'use strict'

const checkYield = require('./utilities/checkYield')
const defaultMethods = require('./defaultMethods')
const Yield = require('./structures/Yield')
const EngineObject = require('./structures/EngineObject')
// const { Override } = require('./constants')
const { build } = require('./compiler')
const declareSync = require('./utilities/declareSync')
const omitUndefined = require('./utilities/omitUndefined')

/**
 * An engine capable of running synchronous JSON Logic.
 */
class LogicEngine {
  /**
   *
   * @param {Object} methods An object that stores key-value pairs between the names of the commands & the functions they execute.
   * @param {{ yieldSupported?: Boolean, disableInline?: Boolean }} options
   */
  constructor (methods = defaultMethods, options = { yieldSupported: false, disableInline: false }) {
    this.disableInline = options.disableInline
    this.methods = methods
    this.options = options
  }

  /**
   * An internal method used to parse through the JSON Logic at a lower level.
   * @param {String} func The name of the function being executed
   * @param {*} data The data to traverse / execute upon
   * @param {*} context The context of the logic being run (input to the function.)
   * @param {*} above The context above (can be used for handlebars-style data traversal.)
   * @returns {*}
   */
  _parse (func, data, context, above) {
    if (this.methods[func]) {
      if (typeof this.methods[func] === 'function') {
        const input = this.run(data, context, { above })
        if (this.options.yieldSupported && checkYield(input)) return input
        return this.methods[func](input, context, above, this)
      }

      if (typeof this.methods[func] === 'object') {
        const { method, traverse } = this.methods[func]
        const shouldTraverse = typeof traverse === 'undefined' ? true : traverse
        const parsedData = shouldTraverse ? this.run(data, context, { above }) : data
        if (this.options.yieldSupported && checkYield(parsedData)) return parsedData
        return method(parsedData, context, above, this)
      }
    }
  }

  /**
   *
   * @param {String} name The name of the method being added.
   * @param {Function|{ traverse?: Boolean, method: Function, deterministic?: Function | Boolean }} method
   * @param {{ deterministic?: Boolean, yields?: Boolean, useContext?: Boolean }} annotations This is used by the compiler to help determine if it can optimize the function being generated.
   */
  addMethod (name, method, { deterministic, yields, useContext } = {}) {
    Object.assign(method, omitUndefined({ yields, useContext, deterministic }))
    this.methods[name] = declareSync(method)
  }

  /**
   * Adds a batch of functions to the engine
   * @param {String} name
   * @param {Object} obj
   * @param {{ deterministic?: Boolean, yields?: Boolean, useContext?: Boolean, async?: Boolean, sync?: Boolean }} annotations Not recommended unless you're sure every function from the module will match these annotations.
   */
  addModule (name, obj, annotations) {
    Object.getOwnPropertyNames(obj).forEach(key => {
      if (typeof obj[key] === 'function' || typeof obj[key] === 'object') {
        this.addMethod(`${name}${name ? '.' : ''}${key}`, obj[key], annotations)
      }
    })
  }

  /**
   *
   * @param {*} logic The logic to be executed
   * @param {*} data The data being passed in to the logic to be executed against.
   * @param {{ above?: any }} options Options for the invocation
   * @returns {*}
   */
  run (logic, data = {}, options = {}) {
    const { above = [] } = options

    if (Array.isArray(logic)) {
      const result = logic.map(i => this.run(i, data, { above }))

      if (this.options.yieldSupported && checkYield(result)) {
        return new EngineObject({
          result
        })
      }

      return result
    }

    if (logic && typeof logic === 'object') {
      const [func] = Object.keys(logic)
      const result = this._parse(func, logic[func], data, above)
      if (this.options.yieldSupported && checkYield(result)) {
        if (result instanceof Yield) {
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
   * @param {{ top?: Boolean, above?: any }} options
   * @returns {Function}
   */
  build (logic, options = { }) {
    const { above = [], top = true } = options

    if (top) {
      const constructedFunction = build(logic, {
        state: {},
        engine: this,
        above
      })

      if (typeof constructedFunction === 'function' || top === true) {
        return (...args) => {
          return typeof constructedFunction === 'function' ? constructedFunction(...args) : constructedFunction
        }
      }
      return constructedFunction
    }

    return logic
  }
}

module.exports = LogicEngine
