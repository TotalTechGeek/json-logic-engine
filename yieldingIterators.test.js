const {
  LogicEngine, AsyncLogicEngine
} = require('./index')

const Yield = require('./structures/Yield')
const EngineObject = require('./structures/EngineObject')

const sync = new LogicEngine(undefined, { yieldSupported: true })
const nosync = new AsyncLogicEngine(undefined, { yieldSupported: true })

const yieldVar = (key, context, above, engine) => {
  if (!key) return context
  if (typeof context !== 'object' && key.startsWith('../')) {
    return engine.methods.var(key.substring(3), above, undefined, engine)
  }
  if (engine.allowFunctions || typeof context[key] !== 'function') {
    if (!(key in context)) {
      return new Yield({
        message: 'Data does not exist in context.'
      })
    }
    return context[key]
  }
}

sync.addMethod('yieldVar', yieldVar)
nosync.addMethod('yieldVar', yieldVar)

describe('Sync Yielding Iterator Test', () => {
  test('someYield', () => {
    const script = {
      someYield: [[true, false, true], { var: '' }]
    }

    expect(sync.run(script)).toBe(true)

    const script2 = {
      someYield: [[{ yieldVar: 'a' }, false, false], { var: '' }]
    }
    const instance = sync.run(script2)
    expect(instance instanceof EngineObject || instance instanceof Yield).toBe(true)
    expect(sync.run(instance.logic(), { a: 10 })).toBe(10)
    expect(sync.run(instance.logic(), { a: 0 })).toBe(false)
  })

  test('everyYield', () => {
    const script = {
      everyYield: [[true, true, true], { var: '' }]
    }

    expect(sync.run(script)).toBe(true)

    const script2 = {
      everyYield: [[true, true, { yieldVar: 'a' }], { var: '' }]
    }
    const instance = sync.run(script2)
    expect(instance instanceof EngineObject || instance instanceof Yield).toBe(true)
    expect(sync.run(instance.logic(), { a: false })).toBe(false)
    expect(sync.run(instance.logic(), { a: true })).toBe(true)
  })
})

describe('ifYield', () => {
  test('it should take the first branch if the first value is truthy', () => {
    const answer = sync.run({
      ifYield: [1, 2, 3]
    })

    expect(answer).toBe(2)
  })

  test('it should take the second branch if the first value is falsey', () => {
    const answer = sync.run({
      ifYield: [0, 2, 3]
    })

    expect(answer).toBe(3)
  })
})

describe('iterators', () => {
  test('some false', async () => {
    const answer = sync.run({
      someYield: [
        [1, 2, 3], {
          '>': [{
            var: ''
          }, 5]
        }
      ]
    })

    expect(answer).toBe(false)
  })

  test('some true', async () => {
    const answer = sync.run({
      someYield: [
        [1, 2, 3], {
          '>': [{
            var: ''
          }, 2]
        }
      ]
    })

    expect(answer).toBe(true)
  })

  test('every false', async () => {
    const answer = sync.run({
      everyYield: [
        [1, 2, 3], {
          '>': [{
            var: ''
          }, 5]
        }
      ]
    })

    expect(answer).toBe(false)
  })

  test('every true', async () => {
    const answer = sync.run({
      everyYield: [
        [1, 2, 3], {
          '<': [{
            var: ''
          }, 5]
        }
      ]
    })

    expect(answer).toBe(true)
  })

  test('map +1', async () => {
    const answer = sync.run({
      mapYield: [
        [1, 2, 3], {
          '+': [{
            var: ''
          }, 1]
        }
      ]
    })

    expect(answer).toStrictEqual([2, 3, 4])
  })

  test('filter evens', async () => {
    const answer = sync.run({
      filterYield: [
        [1, 2, 3], {
          '%': [{
            var: ''
          }, 2]
        }
      ]
    })

    expect(answer).toStrictEqual([1, 3])
  })
})

describe('Sync Yielding Iterator Test', () => {
  test('someYield', async () => {
    const script = {
      someYield: [[true, false, true], { var: '' }]
    }

    expect(await nosync.run(script)).toBe(true)

    const script2 = {
      someYield: [[{ yieldVar: 'a' }, false, false], { var: '' }]
    }
    const instance = await nosync.run(script2)
    expect(instance instanceof EngineObject || instance instanceof Yield).toBe(true)
    expect(await nosync.run(instance.logic(), { a: 10 })).toBe(10)
    expect(await nosync.run(instance.logic(), { a: 0 })).toBe(false)
  })

  test('everyYield', async () => {
    const script = {
      everyYield: [[true, true, true], { var: '' }]
    }

    expect(await nosync.run(script)).toBe(true)

    const script2 = {
      everyYield: [[true, true, { yieldVar: 'a' }], { var: '' }]
    }
    const instance = await nosync.run(script2)
    expect(instance instanceof EngineObject || instance instanceof Yield).toBe(true)
    expect(await nosync.run(instance.logic(), { a: false })).toBe(false)
    expect(await nosync.run(instance.logic(), { a: true })).toBe(true)
  })
})

describe('ifYield', () => {
  test('it should take the first branch if the first value is truthy', async () => {
    const answer = await nosync.run({
      ifYield: [1, 2, 3]
    })

    expect(answer).toBe(2)
  })

  test('it should take the second branch if the first value is falsey', async () => {
    const answer = await nosync.run({
      ifYield: [0, 2, 3]
    })

    expect(answer).toBe(3)
  })
})

describe('iterators', () => {
  test('some false', async () => {
    const answer = await nosync.run({
      someYield: [
        [1, 2, 3], {
          '>': [{
            var: ''
          }, 5]
        }
      ]
    })

    expect(answer).toBe(false)
  })

  test('some true', async () => {
    const answer = await nosync.run({
      someYield: [
        [1, 2, 3], {
          '>': [{
            var: ''
          }, 2]
        }
      ]
    })

    expect(answer).toBe(true)
  })

  test('every false', async () => {
    const answer = await nosync.run({
      everyYield: [
        [1, 2, 3], {
          '>': [{
            var: ''
          }, 5]
        }
      ]
    })

    expect(answer).toBe(false)
  })

  test('every true', async () => {
    const answer = await nosync.run({
      everyYield: [
        [1, 2, 3], {
          '<': [{
            var: ''
          }, 5]
        }
      ]
    })

    expect(answer).toBe(true)
  })

  test('map +1', async () => {
    const answer = await nosync.run({
      mapYield: [
        [1, 2, 3], {
          '+': [{
            var: ''
          }, 1]
        }
      ]
    })

    expect(answer).toStrictEqual([2, 3, 4])
  })

  test('filter evens', async () => {
    const answer = await nosync.run({
      filterYield: [
        [1, 2, 3], {
          '%': [{
            var: ''
          }, 2]
        }
      ]
    })

    expect(answer).toStrictEqual([1, 3])
  })
})
