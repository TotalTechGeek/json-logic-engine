
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

async function testEngineAsync (engine, rule, data, expected) {
  // run
  if (expected === Error) {
    try {
      await engine.run(rule, data)
      throw new Error('Should have failed')
    } catch (e) {}
  } else {
    const result = await engine.run(rule, data)
    assert.deepStrictEqual(result, expected)
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
    assert.deepStrictEqual(builtResult, expected)
  }
}

function testEngine (engine, rule, data, expected) {
  if (engine instanceof AsyncLogicEngine) {
    return testEngineAsync(engine, rule, data, expected)
  }

  // run
  if (expected === Error) {
    try {
      engine.run(rule, data)
      throw new Error('Should have failed')
    } catch (e) {}
  } else {
    const result = engine.run(rule, data)
    assert.deepStrictEqual(result, expected)
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
    assert.deepStrictEqual(builtResult, expected)
  }
}

describe('Various Test Cases', () => {
  it('Should fail when an unrecognized method is used.', async () => {
    for (const engine of normalEngines) await testEngine(engine, { unknown: true }, {}, Error)
  })

  it('Should return the object when an unrecognized method is used.', async () => {
    for (const engine of permissiveEngines) {
      await testEngine(engine, { unknown: true }, {}, { unknown: true })

      await testEngine(engine, {
        if: [true, { unknown: true }, 5]
      }, {}, { unknown: true })
    }
  })
})
