'use strict'

const checkYield = require('./utilities/checkYield')
const defaultMethods = require('./defaultMethods')
const Yield = require('./structures/Yield')
const EngineObject = require('./structures/EngineObject')
// const { Override } = require('./constants')
const { build } = require('./compiler')

class LogicEngine {
  constructor (methods = defaultMethods, options = { yieldSupported: false }) {
    this.methods = methods
    this.options = options
  }

  parse (func, data, context, above) {
    if (this.methods[func]) {
      if (typeof this.methods[func] === 'function') {
        const input = this.run(data, context, { proxy: false, above })
        if (this.options.yieldSupported && checkYield(input)) return input
        return this.methods[func](input, context, above, this)
      }

      if (typeof this.methods[func] === 'object') {
        const { method, traverse: shouldTraverse } = this.methods[func]
        const parsedData = shouldTraverse ? this.run(data, context, { proxy: false, above }) : data
        if (this.options.yieldSupported && checkYield(parsedData)) return parsedData
        return method(parsedData, context, above, this)
      }
    }
  }

  // eslint-disable-next-line no-empty-pattern
  addMethod (name, method, {} = {}) {
    this.methods[name] = method
  }

  run (logic, data = {}, options = {
    proxy: true
  }) {
    const { above = [] } = options

    if (Array.isArray(logic)) {
      const result = logic.map(i => this.run(i, data, { proxy: false, above }))

      if (this.options.yieldSupported && checkYield(result)) {
        return new EngineObject({
          result
        })
      }

      return result
    }

    if (logic && typeof logic === 'object') {
      const [func] = Object.keys(logic)
      const result = this.parse(func, logic[func], data, above)
      if (this.options.yieldSupported && checkYield(result)) {
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

  build (logic, data = {}, options = {
    top: true,
    above: []
  }) {
    const { above = [], useOther = true } = options

    if (options.top) {
      const constructedFunction = useOther
        ? build(logic, {
          state: data,
          engine: this
        })
        : this.build(logic, data, { top: false, above })
      if (typeof constructedFunction === 'function' || options.top === true) {
        return invokingData => {
          // Object.keys(data).forEach(key => delete data[key])

          // if (typeof invokingData === 'object') {
          //   Object.assign(data, invokingData)
          // } else {
          //   data[Override] = invokingData
          // }

          return typeof constructedFunction === 'function' ? constructedFunction(invokingData) : constructedFunction
        }
      }
      return constructedFunction
    }

    return logic
  }
}

module.exports = LogicEngine
