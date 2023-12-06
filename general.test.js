
import assert from 'assert'
import { LogicEngine, AsyncLogicEngine } from './index.js'

const normalEngines = [
  new LogicEngine(),
  new AsyncLogicEngine(),
  new LogicEngine(undefined, { yieldSupported: true }),
  new AsyncLogicEngine(undefined, { yieldSupported: true })
]

const permissiveEngines = [
  new LogicEngine(undefined, { permissive: true }),
  new AsyncLogicEngine(undefined, { permissive: true }),
  new LogicEngine(undefined, { yieldSupported: true, permissive: true }),
  new AsyncLogicEngine(undefined, { yieldSupported: true, permissive: true })
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

  it('is able to handle path escaping in a var call', async () => {
    for (const engine of [...normalEngines, ...permissiveEngines]) await testEngine(engine, { var: 'hello\\.world' }, { 'hello.world': 2 }, 2)
  })

  it('is able to handle path escaping with multiple escapes', async () => {
    for (const engine of [...normalEngines, ...permissiveEngines]) await testEngine(engine, { var: '\\foo' }, { '\\foo': 2 }, 2)
    for (const engine of [...normalEngines, ...permissiveEngines]) await testEngine(engine, { var: '\\\\foo' }, { '\\foo': 2 }, 2)
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
