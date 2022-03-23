import { asLogicSync, asLogicAsync } from './asLogic.js'

const module = {
  hello: (name = 'World', last = '') => `Hello, ${name}${last.length ? ' ' : ''}${last}!`
}

describe('asLogicSync', () => {
  it('Should be able to create a simple rule.', () => {
    const builder = asLogicSync(module)
    const f = builder({
      hello: 'World'
    })
    expect(f()).toBe('Hello, World!')

    const f2 = builder({
      hello: { var: '' }
    })
    expect(f2('Jesse')).toBe('Hello, Jesse!')

    const f3 = builder({
      hello: null
    })
    expect(f3()).toBe('Hello, World!')

    const f4 = builder({
      hello: ['Jesse', 'Mitchell']
    })
    expect(f4()).toBe('Hello, Jesse Mitchell!')
  })

  it('Should not allow you to create a builder with methods that do not exist', () => {
    const builder = asLogicSync(module)
    expect(() => builder({
      hello: { '+': [1, 2] }
    })).toThrow()
  })

  it('Should let you select logic kept', () => {
    const builder = asLogicSync(module, ['+'])
    const f = builder({
      hello: { '+': [1, 2] }
    })
    expect(f()).toBe('Hello, 3!')
  })
})

describe('asLogicAsync', () => {
  it('Should be able to create a simple rule.', async () => {
    const builder = asLogicAsync(module)
    const f = await builder({
      hello: 'World'
    })
    expect(await f()).toBe('Hello, World!')

    const f2 = await builder({
      hello: { var: '' }
    })
    expect(await f2('Jesse')).toBe('Hello, Jesse!')

    const f3 = await builder({
      hello: null
    })
    expect(await f3()).toBe('Hello, World!')

    const f4 = await builder({
      hello: ['Jesse', 'Mitchell']
    })
    expect(await f4()).toBe('Hello, Jesse Mitchell!')
  })

  it('Should not allow you to create a builder with methods that do not exist', async () => {
    const builder = asLogicAsync(module)
    expect(builder({
      hello: { '+': [1, 2] }
    })).rejects.toThrow()
  })

  it('Should let you select logic kept', async () => {
    const builder = asLogicAsync(module, ['+'])
    const f = await builder({
      hello: { '+': [1, 2] }
    })
    expect(await f()).toBe('Hello, 3!')
  })
})
