const { isSync, Override } = require('./constants')
const declareSync = require('./utilities/declareSync')
// eslint-disable-next-line no-unused-vars
const asyncIterators = require('./async_iterators')

function isDeterministic (method, engine, buildState) {
  if (Array.isArray(method)) {
    return method.every(i => isDeterministic(i, engine, buildState))
  }

  if (method && typeof method === 'object') {
    const func = Object.keys(method)[0]
    const lower = method[func]

    if (engine.methods[func].traverse === false) {
      return typeof engine.methods[func].deterministic === 'function' ? engine.methods[func].deterministic(lower, buildState) : engine.methods[func].deterministic
    }
    return typeof engine.methods[func].deterministic === 'function' ? engine.methods[func].deterministic(lower, buildState) : engine.methods[func].deterministic && isDeterministic(lower, engine, buildState)
  }

  return true
}

function buildString (method, buildState = {}) {
  const { notTraversed = [], functions = {}, methods = [], state, async, above = [], processing = [], engine } = buildState
  if (Array.isArray(method)) {
    return '[' + method.map(i => buildString(i, buildState)).join(', ') + ']'
  }

  let asyncDetected = false
  function makeAsync (result) {
    buildState.asyncDetected |= asyncDetected
    if (async && asyncDetected) { return `await ${result}` }
    return result
  }

  if (method && typeof method === 'object') {
    const func = Object.keys(method)[0]
    functions[func] = functions[func] || 2

    if (!buildState.engine.disableInline && engine.methods[func] && isDeterministic(method, engine, buildState)) {
      // console.log(method)

      if (isSync(engine.methods[func])) {
        return JSON.stringify((engine.fallback || engine).run(method))
      }

      if (async && !buildState.avoidInlineAsync) {
        processing.push(engine.run(method).then(i => JSON.stringify(i)))
        return `__%%%${processing.length - 1}%%%__`
      }
    }

    if (engine.methods[func] && engine.methods[func].compile) {
      const str = engine.methods[func].compile(method[func], buildState)
      if ((str || '').startsWith('await')) buildState.asyncDetected = true
      if (str !== false) return str
    }

    if (typeof engine.methods[func] === 'function') {
      functions[func] = 1

      asyncDetected = !isSync(engine.methods[func])
      return makeAsync(`gen["${func}"](` + buildString(method[func], buildState) + ')')
    } else {
      if (engine.methods[func] && engine.methods[func].traverse) {
        functions[func] = 1

        return makeAsync(`gen["${func}"](` + buildString(method[func], buildState) + ')')
      } else {
        if (engine.methods[func]) {
          if (async) {
            if ((engine.methods[func].asyncBuild || engine.methods[func].build)) {
              const builder = engine.methods[func].asyncBuild || engine.methods[func].build
              const result = builder(method[func], state, above, engine)
              methods.push(result)
              asyncDetected = !isSync(result)
              return makeAsync(`methods[${methods.length - 1}]()`)
            }
          } else {
            if (engine.methods[func].build) {
              methods.push(engine.methods[func].build(method[func], state, above, engine))
              return makeAsync(`methods[${methods.length - 1}]()`)
            }
          }
        }

        asyncDetected = Boolean(async && engine.methods[func] && engine.methods[func].asyncMethod)
        functions[func] = 1
        notTraversed.push(method[func])
        return makeAsync(`gen["${func}"](` + `notTraversed[${notTraversed.length - 1}]` + ')')
      }
    }
  }

  return JSON.stringify(method)
}

function build (method, { notTraversed = [], functions = {}, methods = [], state = {}, engine, processing = [], async = engine.async, above = [], asyncDetected = false } = {}) {
  const buildState = { notTraversed, functions, methods, state, async, engine, above, processing, asyncDetected }
  const str = buildString(method, buildState)
  return processBuiltString(method, str, buildState)
}

async function buildAsync (method, { notTraversed = [], functions = {}, methods = [], state = {}, engine, processing = [], async = engine.async, above = [], asyncDetected = false } = {}) {
  const buildState = { notTraversed, functions, methods, state, async, engine, above, processing, asyncDetected }
  const str = buildString(method, buildState)
  buildState.processing = await Promise.all(buildState.processing)
  // console.log(buildState.processing)
  return processBuiltString(method, str, buildState)
}

function processBuiltString (method, str, buildState) {
  const gen = {}

  // eslint-disable-next-line no-unused-vars
  const { functions, state, async, engine, above, methods, notTraversed, processing } = buildState

  processing.forEach((item, x) => {
    str = str.replace(`__%%%${x}%%%__`, item)
  })

  Object.keys(functions).forEach(key => {
    if (functions[key] === 2) return
    if (typeof engine.methods[key] === 'function') {
      gen[key] = input => engine.methods[key](input, state, above, engine)
    } else {
      if (async && engine.methods[key].asyncMethod) {
        buildState.asyncDetected = true
        gen[key] = input => engine.methods[key].asyncMethod(input, state, above, engine)
      } else {
        gen[key] = input => engine.methods[key].method(input, state, above, engine)
      }
    }
  })

  if (!Object.keys(functions).length) {
    return method
  }

  // eslint-disable-next-line no-unused-vars
  const copyState = (context) => {
    if (typeof context === 'object') {
      // Object.keys(state).forEach(key => {
      //   delete state[key]
      // })
      Object.assign(state, context)
    } else {
      state[Override] = context
    }
  }

  let cleanup = ''
  let copyStateCall = 'copyState(context);'

  if (buildState.varUseOverride === buildState.varAccesses && buildState.varUseOverride) {
    // copyStateCall = 'state[Override] = context;'
    copyStateCall = ''
    while (str.includes('state[Override]')) { str = str.replace('state[Override]', 'context') }
  } else {
    if (buildState.varUseOverride) {
      cleanup += 'delete state[Override];'
    } else {
      copyStateCall = 'Object.assign(state, context);'
      if (!buildState.varFallbacks && !Object.keys(buildState.methods).length && !buildState.missingUsed) {
        copyStateCall = ''
        ;(buildState.varTop || []).forEach(key => {
          // copyStateCall += `state[${JSON.stringify(key)}]=context?.[${JSON.stringify(key)}];`

          const stateString = `state?.[${JSON.stringify(key)}]`
          const contextString = `context?.[${JSON.stringify(key)}]`
          while (str.includes(stateString)) { str = str.replace(stateString, contextString) }
        })
      }
    }
  }

  if (!buildState.varAccesses && !buildState.missingUsed && !Object.keys(buildState.methods).length) {
    copyStateCall = ''
  }

  if (!(!buildState.varFallbacks && !Object.keys(buildState.methods).length && !buildState.missingUsed)) {
    ;([...(buildState.varTop || [])]).forEach(key => {
      cleanup += `delete state[${JSON.stringify(key)}];`
    })
  }

  const final = `${buildState.asyncDetected ? 'async' : ''} (context) => { ${copyStateCall} const result = ${str}; ${cleanup} return result }`

  // console.log(str)
  // console.log(final)

  // eslint-disable-next-line no-eval
  return declareSync(eval(final), !buildState.asyncDetected)
}

module.exports = { build, buildAsync, buildString }
