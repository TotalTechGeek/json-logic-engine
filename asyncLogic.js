'use strict'
const {
  createProxy
} = require('./proxy')
const checkYield = require('./utilities/checkYield')
const defaultMethods = require('./defaultMethods')
const Yield = require('./structures/Yield')
const EngineObject = require('./structures/EngineObject')
const LogicEngine = require('./logic')
const asyncPool = require('./asyncPool')
const { Sync, Override } = require('./constants')
const declareSync = require('./utilities/declareSync')

function compose (...funcs) {
  return funcs.reduce((a, b) => {
    if (typeof a === 'function') {
      if (a[Sync]) {
        return declareSync(function () {
          return b(a(...arguments))
        }, b[Sync])
      }

      return async function () {
        const result = await a(...arguments)
        return b(result)
      }
    }

    if (b[Sync]) {
      return declareSync(function () {
        return b(a)
      }, true)
    }

    // async function?
    return function () {
      // await a?
      return b(a)
    }
  })
}

class AsyncLogicEngine {
  constructor (methods = defaultMethods, options = { yieldSupported: false }) {
    this.methods = methods
    this.options = options
    this.fallback = new LogicEngine(methods, options)
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

  addMethod (name, method, { async = false, sync = !async } = {}) {
    this.methods[name] = declareSync(method, sync)
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

  compose (func, data, context, above) {
    function createLambda (func, engine) {
      return declareSync(function (input) {
        return func(input, context, above, engine)
      }, func[Sync])
    }

    if (this.methods[func]) {
      if (typeof this.methods[func] === 'function') {
        const input = this.build(data, context, { proxy: false, above, top: false })
        return compose(input, createLambda(this.methods[func], this))
      }

      if (typeof this.methods[func] === 'object') {
        const { asyncMethod, method, traverse: shouldTraverse, asyncBuild } = this.methods[func]
        const parsedData = shouldTraverse ? this.build(data, context, { proxy: false, above, top: false }) : data

        if (asyncBuild) {
          return asyncBuild(parsedData, context, above, this)
        }

        return compose(parsedData, createLambda(asyncMethod || method, this))
      }
    }
  }

  build (logic, data = {}, options = {
    top: true
  }) {
    const { above } = options

    if (options.top) {
      const constructedFunction = this.build(logic, createProxy(data, above), { top: false })

      const result = declareSync(invokingData => {
        Object.keys(data).forEach(key => delete data[key])

        if (typeof invokingData === 'object') {
          Object.assign(data, invokingData)
        } else {
          data[Override] = invokingData
        }

        const result = constructedFunction()
        return (options.top === true) ? Promise.resolve(result) : result
      }, (options.top !== true) && (constructedFunction[Sync] || false))

      // we can avoid the async pool if the constructed function is synchronous since the data
      // can't be updated :)
      if (options.top === true && !constructedFunction[Sync]) {
        // we use this async pool so that we can execute these in parallel without having
        // concerns about the data.
        return asyncPool({
          free: [result],
          max: 100,
          create: () => this.build(logic, {}, options)
        })
      } else {
        return result
      }
    }

    if (Array.isArray(logic)) {
      const result = logic.map(i => this.build(i, data, { top: false }))

      // checks if any of the functions aren't synchronous
      if (result.some(i => typeof i === 'function' && !i[Sync])) {
        // if so, treat it like an async
        return () => Promise.all(result.map(i => typeof i === 'function' ? i() : i))
      } else {
        return declareSync(() => result.map(i => typeof i === 'function' ? i() : i))
      }
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
