
import assert from 'assert'
import { LogicEngine, AsyncLogicEngine } from './index.js'

const normalEngines = [
  new LogicEngine(),
  new AsyncLogicEngine(),
  new LogicEngine(undefined, { disableInterpretedOptimization: true }),
  new AsyncLogicEngine(undefined, { disableInterpretedOptimization: true })
]

const permissiveEngines = [
  new LogicEngine(undefined, { permissive: true }),
  new AsyncLogicEngine(undefined, { permissive: true }),
  new LogicEngine(undefined, { disableInterpretedOptimization: true, permissive: true }),
  new AsyncLogicEngine(undefined, { disableInterpretedOptimization: true, permissive: true })
]

async function testEngineAsync (engine, rule, data, expected, matcher = 'deepStrictEqual') {
  // run
  if (expected === Error) {
    try {
      await engine.run(rule, data)
      throw new Error('Should have failed')
    } catch (e) {}
  } else {
    const result = await engine.run(rule, data)
    assert[matcher](result, expected)
  }

  // build
  if (expected === Error) {
    try {
      const built = await engine.build(rule)
      await built(data)
      throw new Error('Should have failed')
    } catch (e) {}
  } else {
    const built = await engine.build(rule)
    const builtResult = await built(data)
    assert[matcher](builtResult, expected)
  }
}

function testEngine (engine, rule, data, expected, matcher = 'deepStrictEqual') {
  if (engine instanceof AsyncLogicEngine) {
    return testEngineAsync(engine, rule, data, expected, matcher)
  }

  // run
  if (expected === Error) {
    try {
      engine.run(rule, data)
      throw new Error('Should have failed')
    } catch (e) {}
  } else {
    const result = engine.run(rule, data)
    assert[matcher](result, expected)
  }

  // build
  if (expected === Error) {
    try {
      const built = engine.build(rule)
      built(data)
      throw new Error('Should have failed')
    } catch (e) {}
  } else {
    const built = engine.build(rule)
    const builtResult = built(data)
    assert[matcher](builtResult, expected)
  }
}

describe('Various Test Cases', () => {
  it('Should fail when an unrecognized method is used.', async () => {
    for (const engine of normalEngines) await testEngine(engine, { unknown: true }, {}, Error)
  })

  it('Should return an empty object when I pass in an empty object.', async () => {
    for (const engine of normalEngines) await testEngine(engine, {}, {}, {})
    for (const engine of permissiveEngines) await testEngine(engine, {}, {}, {})
  })

  it('Should work with preserve', async () => {
    for (const engine of [...permissiveEngines, ...normalEngines]) await testEngine(engine, { preserve: { x: 5 } }, null, { x: 5 })
  })

  it('Should return the object when an unrecognized method is used.', async () => {
    for (const engine of permissiveEngines) {
      await testEngine(engine, { unknown: true }, {}, { unknown: true })

      await testEngine(engine, {
        if: [true, { unknown: true, unknown2: 2 }, 5]
      }, {}, { unknown: true, unknown2: 2 })

      const obj = { unknown: true, unknown2: 2 }

      // test with deterministic function returning a passively preserved element.
      await testEngine(engine, {
        if: [true, obj, 5]
      }, {}, obj, 'equal')

      // test with a non-deterministic function returning a passively preserved element.
      await testEngine(engine, {
        if: [{ var: 'data' }, obj, 5]
      }, {
        data: true
      }, obj, 'equal')
    }
  })

  it('get operator w/ object key as string', async () => {
    for (const engine of [...normalEngines, ...permissiveEngines]) await testEngine(engine, { get: [{ var: 'selected' }, 'b'] }, { selected: { b: 2 } }, 2)
  })

  it('get operator w/ object key as number', async () => {
    for (const engine of [...normalEngines, ...permissiveEngines]) await testEngine(engine, { get: [{ var: 'selected' }, 1] }, { selected: [0, 2] }, 2)
  })

  it('get operator w/ object key as var', async () => {
    for (const engine of [...normalEngines, ...permissiveEngines]) await testEngine(engine, { get: [{ var: 'selected' }, { var: 'key' }] }, { selected: { b: 2 }, key: 'b' }, 2)
  })

  it('is able to handle simple path escaping', async () => {
    for (const engine of [...normalEngines, ...permissiveEngines]) await testEngine(engine, { get: [{ var: 'selected' }, 'b\\.c'] }, { selected: { 'b.c': 2 } }, 2)
  })

  it('is able to handle simple path escaping in a variable', async () => {
    for (const engine of [...normalEngines, ...permissiveEngines]) await testEngine(engine, { get: [{ var: 'selected' }, { var: 'key' }] }, { selected: { 'b.c': 2 }, key: 'b\\.c' }, 2)
  })

  it('is able to avoid returning functions', async () => {
    for (const engine of [...normalEngines, ...permissiveEngines]) await testEngine(engine, { var: 'toString' }, 'hello', null)
  })

  it('is able to return functions if enabled', async () => {
    try {
      for (const engine of [...normalEngines, ...permissiveEngines]) {
        engine.allowFunctions = true
        engine.addMethod('typeof', ([value]) => typeof value)
        await testEngine(engine, { typeof: { var: 'toString' } }, {}, 'function')
      }
    } finally {
      for (const engine of [...normalEngines, ...permissiveEngines]) {
        engine.allowFunctions = false
        delete engine.methods.typeof
      }
    }
  })

  it('is able to handle max with 1 element', async () => {
    for (const engine of [...normalEngines, ...permissiveEngines]) await testEngine(engine, { max: 5 }, {}, 5)
  })

  it('is able to handle path escaping in a var call', async () => {
    for (const engine of [...normalEngines, ...permissiveEngines]) await testEngine(engine, { var: 'hello\\.world' }, { 'hello.world': 2 }, 2)
  })

  it('is able to access empty keys', async () => {
    for (const engine of [...normalEngines, ...permissiveEngines]) await testEngine(engine, { var: '.' }, { '': 2 }, 2)
  })

  it('is able to access dot keys', async () => {
    for (const engine of [...normalEngines, ...permissiveEngines]) await testEngine(engine, { var: '\\.' }, { '.': 2 }, 2)
  })

  it('is able to access "/" keys from above', async () => {
    for (const engine of [...normalEngines, ...permissiveEngines]) await testEngine(engine, { map: [[1], { '+': [{ var: '' }, { var: '../../..\\/' }] }] }, { '': { '': { '/': 3 } } }, [4])
  })

  it('is able to handle path escaping with multiple escapes', async () => {
    for (const engine of [...normalEngines, ...permissiveEngines]) await testEngine(engine, { var: '\\foo' }, { '\\foo': 2 }, 2)
    for (const engine of [...normalEngines, ...permissiveEngines]) await testEngine(engine, { var: '\\\\foo' }, { '\\foo': 2 }, 2)
  })

  it('is able to access the index in the iterators', async () => {
    for (const engine of [...normalEngines, ...permissiveEngines]) await testEngine(engine, { map: [[0, 1, 2, 3], { '+': [{ var: '' }, { var: '../index' }] }] }, {}, [0, 2, 4, 6])
  })

  it('is able to use pipe', async () => {
    for (const engine of [...normalEngines, ...permissiveEngines]) await testEngine(engine, { pipe: ['Austin', { cat: ['Hello, ', { var: '' }, '!'] }] }, {}, 'Hello, Austin!')
    for (const engine of [...normalEngines, ...permissiveEngines]) await testEngine(engine, { pipe: [{ var: 'name' }, { cat: ['Hello, ', { var: '' }, '!'] }] }, { name: 'Austin' }, 'Hello, Austin!')

    for (const engine of [normalEngines[1], normalEngines[3], permissiveEngines[1], permissiveEngines[3]]) {
      engine.addMethod('as1', async ([n]) => n + 1, { async: true, deterministic: true })
      await testEngine(engine, {
        pipe: [
          'Austin',
          { cat: ['Hello, ', { var: '' }, '!'] },
          { cat: [{ var: '' }, ' ', { as1: 5 }] }
        ]
      }, { name: 'Austin' }, 'Hello, Austin! 6')
    }
  })

  it('is able to reach far up in the traversal', async () => {
    for (const engine of [...normalEngines, ...permissiveEngines]) await testEngine(engine, { map: [[1, 2, 3], { map: [[1], { var: '../../../../name' }] }] }, { name: 'Bob' }, [['Bob'], ['Bob'], ['Bob']])
  })

  it('correctly short circuits (or)', async () => {
    for (const engine of [...normalEngines, ...permissiveEngines]) {
      let count = 0

      engine.addMethod('increment', {
        method: () => {
          count++
          return true
        }
      })
      await testEngine(engine, { or: [{ increment: true }, { increment: true }, { increment: true }] }, {}, true)
      // It's called twice because it runs once for interpreted, and once for compiled.
      assert.strictEqual(count, 2, 'Should have only called increment twice. (Count)')
    }
  })

  it('correctly short circuits (and)', async () => {
    for (const engine of [...normalEngines, ...permissiveEngines]) {
      let count = 0

      engine.addMethod('increment', {
        method: () => {
          count++
          return false
        }
      })
      await testEngine(engine, { and: [{ increment: true }, { increment: true }, { increment: true }] }, {}, false)
      // It's called twice because it runs once for interpreted, and once for compiled.
      assert.strictEqual(count, 2, 'Should have only called increment twice. (Count)')
    }
  })

  it('does not execute any logic from and / or array if the argument is executed', async () => {
    for (const engine of [...normalEngines, ...permissiveEngines]) {
      let count = 0
      engine.addMethod('increment', {
        method: () => {
          count++
          return true
        }
      })

      await testEngine(engine, { and: { preserve: [{ increment: true }, { increment: true }] } }, {}, { increment: true })
      assert.strictEqual(count, 0, 'Should not have called increment on and.')

      await testEngine(engine, { or: { preserve: [{ increment: true }, { increment: true }] } }, {}, { increment: true })
      assert.strictEqual(count, 0, 'Should not have called increment on or.')
    }
  })

  it('disables interpreted optimization when it realizes it will not be faster', async () => {
    for (const engine of [...normalEngines, ...permissiveEngines]) {
      const disableInterpretedOptimization = engine.disableInterpretedOptimization
      for (let i = 0; i < 10e3; i++) await engine.run({ '+': [1, 2] }, {})
      assert.strictEqual(engine.disableInterpretedOptimization, true)
      // Resets back to the original value.
      engine.disableInterpretedOptimization = disableInterpretedOptimization
    }
  })

  // This is not fully supported right now.
  it('is able to access the source array in the iterators', async () => {
    for (const engine of [...normalEngines, ...permissiveEngines]) await testEngine(engine, { map: [[0, 1, 2, 3], { '+': [{ var: '' }, { var: '../iterator.2' }] }] }, {}, [2, 3, 4, 5])
  })

  it('should be able to handle various instances of "in" with good, bad and invalid data', async () => {
    const rule = {
      in: ['Spring', { var: 'city' }]
    }

    const goodData = { city: 'Springfield' }
    const badData = { city: 'test' }
    const invalidData = { city: null }

    for (const engine of normalEngines) await testEngine(engine, rule, goodData, true)
    for (const engine of normalEngines) await testEngine(engine, rule, badData, false)
    for (const engine of normalEngines) await testEngine(engine, rule, invalidData, false)
  })
})
