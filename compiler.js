// @ts-check
'use strict'

import {
  isSync,
  // Override is required for the compiler to operate as intended.
  Override
} from './constants.js'
import YieldStructure from './structures/Yield.js'
import declareSync from './utilities/declareSync.js'

// asyncIterators is required for the compiler to operate as intended.
import asyncIterators from './async_iterators.js'

/**
 * @typedef BuildState
 * Used to keep track of the compilation.
 * @property {*} [engine]
 * @property {Object} [notTraversed]
 * @property {Object} [functions]
 * @property {Object} [methods]
 * @property {Object} [state]
 * @property {Array} [processing]
 * @property {*} [async]
 * @property {Array} [above]
 * @property {Boolean} [asyncDetected]
 * @property {*} [values]
 * @property {*} [yieldUsed]
 * @property {Boolean} [useContext]
 * @property {Boolean} [avoidInlineAsync]
 *
 */

/**
 * Checks if the value passed in is a primitive JS object / value.
 * @param {*} x
 * @returns
 */
function isPrimitive (x, preserveObject) {
  if (typeof x === 'number' && (x === Infinity || x === -Infinity || Number.isNaN(x))) return false
  return (
    x === null ||
    x === undefined ||
    ['Number', 'String', 'Boolean'].includes(x.constructor.name) ||
    (!preserveObject && x.constructor.name === 'Object')
  )
}

/**
 * Checks if the method & its inputs are deterministic.
 * @param {*} method
 * @param {*} engine
 * @param {BuildState} buildState
 * @returns
 */
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

/**
 * Checks if the method & its inputs are synchronous.
 * @param {*} method
 * @param {*} engine
 */
function isDeepSync (method, engine) {
  if (!engine.async) return true

  if (Array.isArray(method)) {
    return method.every(i => isDeepSync(i, engine))
  }

  if (typeof method === 'object') {
    const func = Object.keys(method)[0]

    const lower = method[func]
    if (!isSync(engine.methods[func])) return false
    return isDeepSync(lower, engine)
  }

  return true
}

/**
 * A function that handles yields by caching the values to resumable object.
 * @param {Function} func
 * @param {*} input
 * @param {String} name
 * @param {Object} resumable
 * @returns
 */
function r (func, input, name, resumable) {
  if (resumable[name]) {
    return resumable[name]
  }
  const result = resumable[name + '_input']
    ? func(resumable[name + '_input'])
    : func(typeof input === 'function' ? input() : input)

  if (result instanceof YieldStructure) {
    if (result._input) {
      resumable[name + '_input'] = result._input
    }
    result.resumable = resumable
    throw result
  } else {
    resumable[name] = result
  }

  return result
}

/**
 * A function that handles async yields by caching the values to resumable object.
 * @param {Function} func
 * @param {*} input
 * @param {String} name
 * @param {Object} resumable
 * @returns
 */
async function rAsync (func, input, name, resumable) {
  if (resumable[name]) {
    return resumable[name]
  }

  const result = resumable[name + '_input']
    ? await func(resumable[name + '_input'])
    : await func(typeof input === 'function' ? await input() : input)

  if (result instanceof YieldStructure) {
    if (result._input) {
      resumable[name + '_input'] = result._input
    }

    result.resumable = resumable
    throw result
  } else {
    resumable[name] = result
  }

  return result
}
/**
 * Builds a string for a function that may need to yield & resume.
 * @param {String} method
 * @param {BuildState} buildState
 * @returns
 */
function buildYield (method, buildState = {}) {
  // todo: add gc so we don't save resumable state for longer than it needs to exist
  const { notTraversed = [], functions = {}, async, engine } = buildState
  const func = Object.keys(method)[0]
  buildState.yieldUsed = (buildState.yieldUsed || 0) + 1
  let asyncDetected = false
  buildState.useContext =
    buildState.useContext || (engine.methods[func] || {}).useContext

  if (typeof engine.methods[func] === 'function') {
    functions[func] = 1
    asyncDetected = !isSync(engine.methods[func])
    const stringBuildState = { ...buildState, avoidInlineAsync: true }
    const inputStr = buildString(method[func], stringBuildState)
    buildState.useContext =
      buildState.useContext || stringBuildState.useContext

    if (asyncDetected || inputStr.includes('await')) {
      buildState.asyncDetected = buildState.asyncDetected || asyncDetected
      return `await rAsync(gen["${func}"], async () => { return ${inputStr} }, 'yield${buildState.yieldUsed}', resumable)`
    }

    return `r(gen["${func}"], () => { return ${inputStr} }, 'yield${buildState.yieldUsed}', resumable)`
  } else {
    if (engine.methods[func] && engine.methods[func].traverse) {
      functions[func] = 1
      // console.log(async)
      asyncDetected = Boolean(
        async && engine.methods[func] && engine.methods[func].asyncMethod
      )

      const stringBuildState = { ...buildState, avoidInlineAsync: true }
      const inputStr = buildString(method[func], stringBuildState)

      buildState.useContext =
        buildState.useContext || stringBuildState.useContext

      if (asyncDetected || inputStr.startsWith('await')) {
        buildState.asyncDetected = buildState.asyncDetected || asyncDetected
        return `await rAsync(gen["${func}"], async () => ${inputStr}, 'yield${buildState.yieldUsed}', resumable)`
      }
      return `r(gen["${func}"], () => ${inputStr}, 'yield${buildState.yieldUsed}', resumable)`
    } else {
      // todo: make build work for yields somehow. The issue is that it pre-binds data, thus making it impossible
      asyncDetected = Boolean(
        async && engine.methods[func] && engine.methods[func].asyncMethod
      )
      functions[func] = 1
      notTraversed.push(method[func])
      buildState.useContext = true

      if (asyncDetected) {
        buildState.asyncDetected = buildState.asyncDetected || asyncDetected
        return `await rAsync(gen["${func}"], notTraversed[${
          notTraversed.length - 1
        }], 'yield${buildState.yieldUsed}', resumable)`
      }
      return `r(gen["${func}"], notTraversed[${
        notTraversed.length - 1
      }], 'yield${buildState.yieldUsed}', resumable)`
    }
  }
}
/**
 * Builds the string for the function that will be evaluated.
 * @param {*} method
 * @param {BuildState} buildState
 * @returns
 */
function buildString (method, buildState = {}) {
  const {
    notTraversed = [],
    functions = {},
    methods = [],
    state,
    async,
    above = [],
    processing = [],
    values = [],
    engine
  } = buildState
  function pushValue (value, preserveObject = false) {
    if (isPrimitive(value, preserveObject)) return JSON.stringify(value)
    values.push(value)
    return `values[${values.length - 1}]`
  }

  if (Array.isArray(method)) {
    return '[' + method.map((i) => buildString(i, buildState)).join(', ') + ']'
  }

  let asyncDetected = false

  function makeAsync (result) {
    buildState.asyncDetected = buildState.asyncDetected || asyncDetected

    if (async && asyncDetected) {
      return `await ${result}`
    }
    return result
  }

  const func = method && Object.keys(method)[0]
  buildState.useContext =
    buildState.useContext || (engine.methods[func] || {}).useContext

  if (method && typeof method === 'object') {
    if (!func) return pushValue(method)
    if (!engine.methods[func]) {
      // If we are in permissive mode, we will just return the object.
      if (engine.options.permissive) return pushValue(method, true)
      throw new Error(`Method '${func}' was not found in the Logic Engine.`)
    }
    functions[func] = functions[func] || 2

    if (
      !buildState.engine.disableInline &&
      engine.methods[func] &&
      isDeterministic(method, engine, buildState)
    ) {
      if (isDeepSync(method, engine)) {
        return pushValue((engine.fallback || engine).run(method), true)
      } else if (!buildState.avoidInlineAsync) {
        processing.push(engine.run(method).then((i) => pushValue(i)))
        return `__%%%${processing.length - 1}%%%__`
      }
    }

    if (
      engine.options.yieldSupported &&
      engine.methods[func] &&
      engine.methods[func].yields
    ) {
      return buildYield(method, buildState)
    }

    if (engine.methods[func] && engine.methods[func].compile) {
      const str = engine.methods[func].compile(method[func], buildState)

      if ((str || '').startsWith('await')) buildState.asyncDetected = true

      if (str !== false) return str
    }

    if (typeof engine.methods[func] === 'function') {
      functions[func] = 1
      asyncDetected = !isSync(engine.methods[func])

      return makeAsync(
        `gen["${func}"](` + buildString(method[func], buildState) + ')'
      )
    } else {
      if (engine.methods[func] && (typeof engine.methods[func].traverse === 'undefined' ? true : engine.methods[func].traverse)) {
        functions[func] = 1
        asyncDetected = Boolean(
          async && engine.methods[func] && engine.methods[func].asyncMethod
        )

        return makeAsync(
          `gen["${func}"](` + buildString(method[func], buildState) + ')'
        )
      } else {
        if (engine.methods[func]) {
          if (async) {
            if (engine.methods[func].asyncBuild || engine.methods[func].build) {
              const builder =
                engine.methods[func].asyncBuild || engine.methods[func].build
              const result = builder(
                method[func],
                state,
                above,
                engine,
                buildState
              )
              methods.push(result)
              asyncDetected = !isSync(result)
              return makeAsync(`methods[${methods.length - 1}]()`)
            }
          } else {
            if (engine.methods[func].build) {
              methods.push(
                engine.methods[func].build(
                  method[func],
                  state,
                  above,
                  engine,
                  buildState
                )
              )
              return makeAsync(`methods[${methods.length - 1}]()`)
            }
          }
        }

        asyncDetected = Boolean(
          async && engine.methods[func] && engine.methods[func].asyncMethod
        )

        functions[func] = 1
        notTraversed.push(method[func])

        return makeAsync(
          `gen["${func}"](` + `notTraversed[${notTraversed.length - 1}]` + ')'
        )
      }
    }
  }
  return pushValue(method)
}

/**
 * Synchronously compiles the logic to a function that can run the logic more optimally.
 * @param {*} method
 * @param {BuildState} [buildState]
 * @returns
 */
function build (method, buildState = {}) {
  Object.assign(
    buildState,
    Object.assign(
      {
        notTraversed: [],
        functions: {},
        methods: [],
        state: {},
        processing: [],
        async: buildState.engine.async,
        above: [],
        asyncDetected: false,
        values: []
      },
      buildState
    )
  )
  const str = buildString(method, buildState)
  return processBuiltString(method, str, buildState)
}

/**
 * Asynchronously compiles the logic to a function that can run the logic more optimally. Also supports async logic methods.
 * @param {*} method
 * @param {BuildState} [buildState]
 * @returns
 */
async function buildAsync (method, buildState = {}) {
  Object.assign(
    buildState,
    Object.assign(
      {
        notTraversed: [],
        functions: {},
        methods: [],
        state: {},
        processing: [],
        async: buildState.engine.async,
        above: [],
        asyncDetected: false,
        values: []
      },
      buildState
    )
  )
  const str = buildString(method, buildState)
  buildState.processing = await Promise.all(buildState.processing)
  return processBuiltString(method, str, buildState)
}

/**
 * Takes the string that's been generated and does some post-processing on it to be evaluated.
 * @param {*} method
 * @param {*} str
 * @param {BuildState} buildState
 * @returns
 */
function processBuiltString (method, str, buildState) {
  const gen = {}
  const {
    functions,
    state,
    async,
    engine,
    above,
    methods,
    notTraversed,
    processing,
    values
  } = buildState
  processing.forEach((item, x) => {
    str = str.replace(`__%%%${x}%%%__`, item)
  })
  Object.keys(functions).forEach((key) => {
    if (functions[key] === 2) return

    if (!engine.methods[key]) throw new Error(`Method '${key}' was not found in the Logic Engine.`)

    if (typeof engine.methods[key] === 'function') {
      const method = engine.methods[key]
      gen[key] = (input) => method(input, state, above, engine)
    } else {
      if (async && engine.methods[key].asyncMethod) {
        buildState.asyncDetected = true
        const method = engine.methods[key].asyncMethod
        gen[key] = (input) => method(input, state, above, engine)
      } else {
        const method = engine.methods[key].method
        gen[key] = (input) => method(input, state, above, engine)
      }
    }
  })

  if (!Object.keys(functions).length) {
    return method
  }

  let copyStateCall = 'state[Override] = context;'
  // console.log(buildState.useContext)

  if (!buildState.useContext) {
    copyStateCall = ''
    while (str.includes('state[Override]')) {
      str = str.replace('state[Override]', 'context')
    }
  }

  const final = `(state, values, methods, gen, notTraversed, Override, asyncIterators, r, rAsync) => ${buildState.asyncDetected ? 'async' : ''} (context ${
    buildState.yieldUsed ? ', resumable = {}' : ''
  }) => { ${copyStateCall} const result = ${str}; return result }`

  // console.log(str)
  // console.log(final)
  // eslint-disable-next-line no-eval
  return declareSync(globalThis.eval(final)(state, values, methods, gen, notTraversed, Override, asyncIterators, r, rAsync), !buildState.asyncDetected)
}

export { build }
export { buildAsync }
export { buildString }
export { r }
export { rAsync }
export default {
  build,
  buildAsync,
  buildString,
  r,
  rAsync
}
