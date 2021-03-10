const {
  createProxy
} = require('./proxy')
const checkYield = require('./utilities/checkYield')
const defaultMethods = require('./defaultMethods')
const Yield = require('./structures/Yield')
const EngineObject = require('./structures/EngineObject')

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

  addMethod (name, method) {
    this.methods[name] = method
  }

  run (logic, data = {}, options = {
    proxy: true
  }) {
    if (typeof data === 'object' && options.proxy) {
      data = createProxy(data)
    }

    const { above } = options

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
          if (!result.logic) {
            result.logic = logic
          }
          return new EngineObject({ result })
        }

        return new EngineObject({
          result: { [func]: result.data.result }
        })
      }
      return result
    }

    return logic
  }
}

module.exports = LogicEngine
