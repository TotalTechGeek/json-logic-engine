const { LogicEngine, AsyncLogicEngine } = require('.')
function timeout (n, x) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(x)
    }, n)
  })
}

;[new LogicEngine(), new AsyncLogicEngine()].forEach(logic => {
  describe('Simple built functions', () => {
    test('Simple Addition', async () => {
      const f = logic.build({ '+': [1, 2, 3] })
      expect(await f()).toEqual(6)
    })

    test('Simple Addition w/ Variable', async () => {
      const f = logic.build({ '+': [1, 2, { var: 'x' }] })
      expect(await f({ x: 3 })).toEqual(6)
    })
  })

  describe('Nested structures', () => {
    test('Simple map (w/ handlebars traversal)', async () => {
      const f = logic.build({ map: [[1, 2, 3], { '+': [{ var: '' }, { var: '../../x' }, { preserve: 0 }] }] })
      expect(await f({ x: 1 })).toStrictEqual([2, 3, 4])
    })

    test('Simple mapYield (w/ handlebars traversal)', async () => {
      const f = logic.build({ mapYield: [[1, 2, 3], { '+': [{ var: '' }, { var: '../../x' }, { preserve: 0 }] }] })
      expect(await f({ x: 1 })).toStrictEqual([2, 3, 4])
    })
  })
})

const logic = new AsyncLogicEngine()

logic.addMethod('as1', async n => timeout(100, n + 1), { async: true })

describe('Testing async build with full async', () => {
  test('Async +1', async () => {
    const f = logic.build({
      '+': [{ as1: 2 }, 1]
    })
    expect(await f()).toBe(4)
  })

  test('Simple async map (w/ handlebars traversal)', async () => {
    const f = logic.build({ map: [[1, 2, 3], { '+': [{ as1: { var: '' } }, { var: '../../x' }, { preserve: 0 }] }] })
    expect(await f({ x: 1 })).toStrictEqual([3, 4, 5])
  })

  test('Simple async mapYield (w/ handlebars traversal)', async () => {
    const f = logic.build({ mapYield: [[1, 2, 3], { '+': [{ as1: { var: '' } }, { var: '../../x' }, { preserve: 0 }] }] })
    expect(await f({ x: 1 })).toStrictEqual([3, 4, 5])
  })

  test('Async +1, multiple calls', async () => {
    const f = logic.build({
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
