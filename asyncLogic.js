'use strict'
const {
  createProxy
} = require('./proxy')
const checkYield = require('./utilities/checkYield')
const defaultMethods = require('./defaultMethods')
const Yield = require('./structures/Yield')
const EngineObject = require('./structures/EngineObject')

/* istanbul ignore next */
function compose (...funcs) {
  return funcs.reduce((a, b) => {
    if (typeof a === 'function') {
      return async function () {
        return b(await a(...arguments))
      }
    }
    return async function () {
      return b(await a)
    }
  })
}

class AsyncLogicEngine {
  constructor (methods = defaultMethods, options = { yieldSupported: false }) {
    this.methods = methods
    this.options = options
  }

  async parse (func, data, context, above) {
    if (this.methods[func]) {
      if (typeof this.methods[func] === 'function') {
        const input = await this.run(data, context, { proxy: false, above })
        if (this.options.yieldSupported && await checkYield(input)) return input
        const result = await this.methods[func](input, context, above, this)
        return Array.isArray(result) ? createProxy(await Promise.all(result), result['../'] || above || context) : result
      }

      if (typeof this.methods[func] === 'object') {
        const { asyncMethod, method, traverse: shouldTraverse } = this.methods[func]
        const parsedData = shouldTraverse ? await this.run(data, context, { proxy: false, above }) : data
        if (this.options.yieldSupported && await checkYield(parsedData)) return parsedData
        const result = await (asyncMethod || method)(parsedData, context, above, this)
        return Array.isArray(result) ? createProxy(await Promise.all(result), result['../'] || above || context) : result
      }
    }
  }

  addMethod (name, method) {
    this.methods[name] = method
  }

  async run (logic, data = {}, options = {
    proxy: true
  }) {
    if (typeof data === 'object' && options.proxy) {
      data = createProxy(data)
    }

    const { above } = options

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

  /* istanbul ignore next */
  compose (func, data, context, above) {
    if (this.methods[func]) {
      if (typeof this.methods[func] === 'function') {
        const input = this.build(data, context, { proxy: false, above, top: false })
        return compose(input, input => this.methods[func](input, context, above, this))
      }

      if (typeof this.methods[func] === 'object') {
        const { asyncMethod, method, traverse: shouldTraverse, asyncBuild } = this.methods[func]
        const parsedData = shouldTraverse ? this.build(data, context, { proxy: false, above }) : data

        if (asyncBuild) {
          return asyncBuild(parsedData, context, above, this)
        }

        return compose(parsedData, input => (asyncMethod || method)(input, context, above, this))
      }
    }
  }

  /* istanbul ignore next */
  build (logic, data = {}, options = {
    top: true
  }) {
    const { above } = options

    if (options.top) {
      const constructedFunction = this.build(logic, createProxy(data, above), { top: false })

      return invokingData => {
        Object.keys(data).forEach(key => delete data[key])

        if (typeof invokingData === 'object') {
          Object.assign(data, invokingData)
        } else {
          data.__ = invokingData
        }

        return constructedFunction()
      }
    }

    if (Array.isArray(logic)) {
      const result = logic.map(i => this.build(i, data, { top: false }))
      return () => Promise.all(result.map(i => {
        if (typeof i === 'function') {
          return i()
        }
        return i
      }))
    }

    if (logic && typeof logic === 'object') {
      const [func] = Object.keys(logic)
      const result = this.compose(func, logic[func], data, above)
      return result
    }

    return logic
  }
}

module.exports = AsyncLogicEngine
