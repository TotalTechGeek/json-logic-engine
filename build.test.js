import { LogicEngine, AsyncLogicEngine } from './index.js'
import InvalidControlInput from './errors/InvalidControlInput.js'

function timeout (n, x) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(x)
    }, n)
  })
}

[
  new LogicEngine(),
  new AsyncLogicEngine(),
  new LogicEngine(undefined, { disableInline: true }),
  new AsyncLogicEngine(undefined, { disableInline: true })
].forEach((logic) => {
  describe('Simple built functions', () => {
    test('Simple Addition', async () => {
      const f = await logic.build({ '+': [1, 2, 3] })

      expect(await f()).toEqual(6)
    })

    test('Simple Addition w/ Variable', async () => {
      const f = await logic.build({ '+': [1, 2, { var: 'x' }] })

      expect(await f({ x: 3 })).toEqual(6)
    })

    test('cat operator w/ Variable input', async () => {
      const f = await logic.build({ cat: { preserve: ['a', 'b', 'c'] } })

      expect(await f()).toEqual('abc')
    })

    test('Minus operator w/ String', async () => {
      const f = await logic.build({ '-': '5' })

      expect(await f()).toEqual(-5)
    })

    test('Minus operator w/ Infinity', async () => {
      const f = await logic.build({ '-': Infinity })

      expect(await f()).toEqual(-Infinity)
    })

    test('Minus operator w/ array w/ variable input', async () => {
      const f = await logic.build({ '-': [{ preserve: 5 }] })

      expect(await f()).toEqual(-5)
    })

    test('Minus operator w/ array w/ variable input (Infinity)', async () => {
      const f = await logic.build({ '-': [{ preserve: Infinity }] })

      expect(await f()).toEqual(-Infinity)
    })

    test('Minus operator w/ variable input', async () => {
      const f = await logic.build({ '-': { preserve: '5' } })

      expect(await f()).toEqual(-5)
    })

    test('get operator w/ deterministic input', async () => {
      const f = await logic.build({ get: [{ preserve: { a: 1 } }, 'a'] })

      expect(await f()).toEqual(1)
    })

    test('get operator w/ deterministic input and default', async () => {
      const f = await logic.build({ get: [{ preserve: {} }, 'a', 5] })

      expect(await f()).toEqual(5)
    })

    test('get operator w/ non-deterministic input', async () => {
      const f = await logic.build({
        get: [{ eachKey: { a: { var: 'x' } } }, 'a']
      })

      expect(await f({ x: 1 })).toEqual(1)
    })

    test('get operator w/ non-deterministic input and default', async () => {
      const f = await logic.build({
        get: [{ eachKey: { a: { var: 'x' } } }, 'a', 5]
      })

      expect(await f({})).toEqual(5)
    })

    test('Plus operator w/ variable input', async () => {
      const f = await logic.build({ '+': { preserve: '5' } })

      expect(await f()).toEqual(5)
    })

    test('Multiplication operator w/ variable input', async () => {
      const f = await logic.build({ '*': { preserve: [1, 2] } })

      expect(await f()).toEqual(2)
    })

    test('Division operator w/ variable input', async () => {
      const f = await logic.build({ '/': { preserve: [1, 2] } })

      expect(await f()).toEqual(1 / 2)
    })

    test('Multiplication operator w/ array w/ variable input', async () => {
      const f = await logic.build({ '*': [1, { preserve: 2 }] })

      expect(await f()).toEqual(2)
    })

    test('Modulo operator w/ variable input', async () => {
      const f = await logic.build({ '%': { preserve: [1, 2] } })

      expect(await f()).toEqual(1)
    })

    test('Modulo operator w/ array w/ variable input', async () => {
      const f = await logic.build({ '%': [1, { preserve: 2 }] })

      expect(await f()).toEqual(1)
    })

    test('Division operator w/ array w/ variable input', async () => {
      const f = await logic.build({ '/': [1, { preserve: 2 }] })

      expect(await f()).toEqual(1 / 2)
    })

    test('or operator w/ variable input', async () => {
      const f = await logic.build({ or: { preserve: [true, false] } })

      expect(await f()).toEqual(true)
    })

    test('and operator w/ variable input', async () => {
      const f = await logic.build({ and: { preserve: [true, false] } })

      expect(await f()).toEqual(false)
    })

    test('<= operator w/ variable input', async () => {
      const f = await logic.build({ '<=': { preserve: [1, 2] } })

      expect(await f()).toEqual(true)
    })

    test('< operator w/ variable input', async () => {
      const f = await logic.build({ '<': { preserve: [1, 2] } })

      expect(await f()).toEqual(true)
    })

    test('>= operator w/ variable input', async () => {
      const f = await logic.build({ '>=': { preserve: [1, 2] } })

      expect(await f()).toEqual(false)
    })

    test('> operator w/ variable input', async () => {
      const f = await logic.build({ '>': { preserve: [1, 2] } })

      expect(await f()).toEqual(false)
    })

    test('== operator w/ variable input', async () => {
      const f = await logic.build({ '==': { preserve: [1, 2] } })

      expect(await f()).toEqual(false)
    })

    test('=== operator w/ variable input', async () => {
      const f = await logic.build({ '===': { preserve: [1, 2] } })

      expect(await f()).toEqual(false)
    })

    test('!== operator w/ variable input', async () => {
      const f = await logic.build({ '!==': { preserve: [1, 2] } })

      expect(await f()).toEqual(true)
    })

    test('!= operator w/ variable input', async () => {
      const f = await logic.build({ '!=': { preserve: [1, 2] } })

      expect(await f()).toEqual(true)
    })

    test('min command w/ variable input', async () => {
      const f = await logic.build({ min: { preserve: [1, 2] } })

      expect(await f()).toEqual(1)
    })

    test('max command w/ variable input', async () => {
      const f = await logic.build({ max: { preserve: [1, 2] } })

      expect(await f()).toEqual(2)
    })
  })

  describe('Nested structures', () => {
    test('Simple map (w/ handlebars traversal)', async () => {
      const f = await logic.build({
        map: [
          [1, 2, 3],
          { '+': [{ var: '' }, { var: '../../x' }, { preserve: 0 }] }
        ]
      })

      expect(await f({ x: 1 })).toStrictEqual([2, 3, 4])
    })

    test('Simple mapYield (w/ handlebars traversal)', async () => {
      const f = await logic.build({
        mapYield: [
          [1, 2, 3],
          { '+': [{ var: '' }, { var: '../../x' }, { preserve: 0 }] }
        ]
      })

      expect(await f({ x: 1 })).toStrictEqual([2, 3, 4])
    })

    test('Simple eachKey', async () => {
      const f = await logic.build({
        eachKey: { a: { var: 'x' }, b: { var: 'y' } }
      })

      expect(await f({ x: 1, y: 2 })).toStrictEqual({ a: 1, b: 2 })
    })

    test('Invalid eachKey', async () => {
      expect(async () => await logic.build({ eachKey: 5 })).rejects.toThrow(
        InvalidControlInput
      )
    })

    test('Simple deterministic eachKey', async () => {
      const f = await logic.build({ eachKey: { a: 1, b: { '+': [1, 1] } } })

      expect(await f({ x: 1, y: 2 })).toStrictEqual({ a: 1, b: 2 })
    })
  })
})

const logic = new AsyncLogicEngine()
logic.addMethod('as1', async (n) => timeout(100, n + 1), { async: true })

describe('Testing async build with full async', () => {
  test('Async +1', async () => {
    const f = await logic.build({
      '+': [{ as1: 2 }, 1]
    })

    expect(await f()).toBe(4)
  })

  test('Simple async map (w/ handlebars traversal)', async () => {
    const f = await logic.build({
      map: [
        [1, 2, 3],
        { '+': [{ as1: { var: '' } }, { var: '../../x' }, { preserve: 0 }] }
      ]
    })

    expect(await f({ x: 1 })).toStrictEqual([3, 4, 5])
  })

  test('Simple async mapYield (w/ handlebars traversal)', async () => {
    const f = await logic.build({
      mapYield: [
        [1, 2, 3],
        { '+': [{ as1: { var: '' } }, { var: '../../x' }, { preserve: 0 }] }
      ]
    })

    expect(await f({ x: 1 })).toStrictEqual([3, 4, 5])
  })

  test('Async +1, multiple calls', async () => {
    const f = await logic.build({
      '+': [{ as1: { var: 'x' } }, 1]
    })

    const a = f({ x: 2 })
    const b = f({ x: 3 })
    const c = f({ x: 4 })
    const d = f({ x: 5 })

    expect(await a).toBe(4)
    expect(await b).toBe(5)
    expect(await c).toBe(6)
    expect(await d).toBe(7)
  })
})
