'use strict'

const checkYield = require('./utilities/checkYield')
const defaultMethods = require('./defaultMethods')
const Yield = require('./structures/Yield')
const EngineObject = require('./structures/EngineObject')
const LogicEngine = require('./logic')
const asyncPool = require('./asyncPool')
const { Sync, isSync } = require('./constants')
const declareSync = require('./utilities/declareSync')
const { buildAsync } = require('./compiler')

class AsyncLogicEngine {
  constructor (methods = defaultMethods, options = { yieldSupported: false, disableInline: false }) {
    this.methods = methods
    this.options = options
    this.disableInline = options.disableInline
    this.async = true
    this.fallback = new LogicEngine(methods, options)
  }

  async parse (func, data, context, above) {
    if (this.methods[func]) {
      if (typeof this.methods[func] === 'function') {
        const input = await this.run(data, context, { proxy: false, above })
        if (this.options.yieldSupported && await checkYield(input)) return input
        const result = await this.methods[func](input, context, above, this)
        return Array.isArray(result) ? await Promise.all(result) : result
      }

      if (typeof this.methods[func] === 'object') {
        const { asyncMethod, method, traverse: shouldTraverse } = this.methods[func]
        const parsedData = shouldTraverse ? await this.run(data, context, { proxy: false, above }) : data
        if (this.options.yieldSupported && await checkYield(parsedData)) return parsedData
        const result = await (asyncMethod || method)(parsedData, context, above, this)
        return Array.isArray(result) ? await Promise.all(result) : result
      }
    }
  }

  addMethod (name, method, { async = false, sync = !async } = {}) {
    this.methods[name] = declareSync(method, sync)
  }

  async run (logic, data = {}, options = {
    proxy: true
  }) {
    const { above = [] } = options

    if (Array.isArray(logic)) {
      const result = await Promise.all(logic.map(i => this.run(i, data, { proxy: false, above })))

      if (this.options.yieldSupported && await checkYield(result)) {
        return new EngineObject({
          result
        })
      }

      return result
    }

    if (logic && typeof logic === 'object') {
      const [func] = Object.keys(logic)
      const result = await this.parse(func, logic[func], data, above)
      if (this.options.yieldSupported && await checkYield(result)) {
        if (result instanceof Yield) {
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

  async build (logic, data = {}, options = {
    top: true,
    above: []
  }) {
    const { above = [] } = options

    if (options.top) {
      const constructedFunction = await buildAsync(logic, { engine: this, above, async: true, state: data })

      const result = declareSync(invokingData => {
        const result = typeof constructedFunction === 'function' ? constructedFunction(invokingData) : constructedFunction
        return (options.top === true) ? Promise.resolve(result) : result
      }, (options.top !== true) && (isSync(constructedFunction)))

      // we can avoid the async pool if the constructed function is synchronous since the data
      // can't be updated :)
      if (options.top === true && constructedFunction && !constructedFunction[Sync]) {
        // we use this async pool so that we can execute these in parallel without having
        // concerns about the data.
        return asyncPool({
          free: [result],
          max: 100,
          create: () => this.build(logic, { }, { ...options, above })
        })
      } else {
        return typeof constructedFunction === 'function' || options.top === true ? result : constructedFunction
      }
    }

    return logic
  }
}

module.exports = AsyncLogicEngine
