import { AsyncLogicEngine } from './index.js'
import YieldStructure from './structures/Yield.js'
import EngineObject from './structures/EngineObject.js'

const modes = [
  new AsyncLogicEngine(),
  new AsyncLogicEngine(undefined, {
    yieldSupported: true
  })
]

modes.forEach((logic) => {
  describe('+', () => {
    test('it should be able to add two numbers together', async () => {
      const answer = await logic.run({
        '+': [1, 2]
      })
      expect(answer).toBe(3)
    })

    test('it should be able to add three numbers together', async () => {
      const answer = await logic.run({
        '+': [1, 2, 3]
      })
      expect(answer).toBe(6)
    })
  })

  describe('-', () => {
    test('it should be able to subtract two numbers', async () => {
      const answer = await logic.run({
        '-': [1, 2]
      })
      expect(answer).toBe(-1)
    })

    test('it should be able to subtract three numbers', async () => {
      const answer = await logic.run({
        '-': [1, 2, 3]
      })
      expect(answer).toBe(-4)
    })

    test('it should be able to negate a single number', async () => {
      const answer = await logic.run({
        '-': [1]
      })

      expect(answer).toBe(-1)
    })

    test('it should be able to negate a single number in an array', async () => {
      const answer = await logic.run({
        '-': 1
      })

      expect(answer).toBe(-1)
    })

    test('it should be able to negate Infinity', async () => {
      const answer = await logic.run({
        '-': Infinity
      })

      expect(answer).toBe(-Infinity)
    })
  })

  describe('*', () => {
    test('it should be able to multiply two numbers', async () => {
      const answer = await logic.run({
        '*': [1, 2]
      })
      expect(answer).toBe(2)
    })

    test('it should be able to multiply three numbers', async () => {
      const answer = await logic.run({
        '*': [1, 2, 3]
      })
      expect(answer).toBe(6)
    })
  })

  describe('/', () => {
    test('it should be able to divide two numbers', async () => {
      const answer = await logic.run({
        '/': [1, 2]
      })
      expect(answer).toBe(1 / 2)
    })

    test('it should be able to divide three numbers', async () => {
      const answer = await logic.run({
        '/': [1, 2, 3]
      })
      expect(answer).toBe(1 / 6)
    })
  })

  describe('%', () => {
    test('it should be able to modulo two numbers', async () => {
      const answer = await logic.run({
        '%': [5, 2]
      })
      expect(answer).toBe(5 % 2)
    })

    test('it should be able to modulo three numbers', async () => {
      const answer = await logic.run({
        '%': [5, 3, 7]
      })
      expect(answer).toBe((5 % 3) % 7)
    })
  })

  describe('var', () => {
    test('it should be able to access a variable', async () => {
      const answer = await logic.run(
        {
          var: 'a'
        },
        {
          a: 7
        }
      )
      expect(answer).toBe(7)
    })

    test('it should be able to access a nested variable', async () => {
      const answer = await logic.run(
        {
          var: 'a.b'
        },
        {
          a: {
            b: 7
          }
        }
      )
      expect(answer).toBe(7)
    })

    test('it should be able to access a deeply nested variable', async () => {
      const answer = await logic.run(
        {
          var: 'a.b.c'
        },
        {
          a: {
            b: {
              c: 7
            }
          }
        }
      )
      expect(answer).toBe(7)
    })

    test('it should be able to access the entire variable', async () => {
      const answer = await logic.run(
        {
          var: ''
        },
        {
          a: 7
        }
      )
      expect(answer).toStrictEqual({
        a: 7
      })
    })

    test('it should be able to access the variable in a nested command', async () => {
      const answer = await logic.run(
        {
          '+': [
            {
              var: 'a'
            },
            {
              var: 'b'
            }
          ]
        },
        {
          a: 7,
          b: 3
        }
      )
      expect(answer).toBe(10)
    })
  })

  describe('max', () => {
    test('it should be able to get the max of two numbers', async () => {
      const answer = await logic.run({
        max: [5, 2]
      })
      expect(answer).toBe(5)
    })

    test('it should be able to get the max of three or more numbers', async () => {
      const answer = await logic.run({
        max: [5, 3, 7]
      })
      expect(answer).toBe(7)
    })
  })

  describe('min', () => {
    test('it should be able to get the min of two numbers', async () => {
      const answer = await logic.run({
        min: [5, 2]
      })
      expect(answer).toBe(2)
    })

    test('it should be able to get the min of three or more numbers', async () => {
      const answer = await logic.run({
        min: [5, 3, 7]
      })
      expect(answer).toBe(3)
    })
  })

  describe('in', () => {
    test('it should be able to tell when an item is in an array', async () => {
      const answer = await logic.run({
        in: [5, [5, 6, 7]]
      })
      expect(answer).toBe(true)
    })

    test('it should be able to tell when an item is not in an array', async () => {
      const answer = await logic.run({
        in: [7, [1, 2, 3]]
      })
      expect(answer).toBe(false)
    })
  })

  describe('if', () => {
    test('it should take the first branch if the first value is truthy', async () => {
      const answer = await logic.run({
        if: [1, 2, 3]
      })
      expect(answer).toBe(2)
    })

    test('it should take the second branch if the first value is falsey', async () => {
      const answer = await logic.run({
        if: [0, 2, 3]
      })
      expect(answer).toBe(3)
    })
  })

  describe('preserve', () => {
    test('it should be able to avoid traversing data with preserve', async () => {
      const answer = await logic.run({
        preserve: {
          '+': [1, 2]
        }
      })
      expect(answer).toStrictEqual({
        '+': [1, 2]
      })
    })

    test('it should be able to tell when an item is not in an array', async () => {
      const answer = await logic.run({
        in: [7, [1, 2, 3]]
      })
      expect(answer).toBe(false)
    })
  })

  describe('comparison operators', () => {
    test('the comparison operators should all work', async () => {
      const vectors = [
        [0, 1],
        [0, 2],
        [3, 7],
        [7, 9],
        [9, 3],
        [0, 0],
        [1, 1],
        [1, '1'],
        ['1', '1'],
        ['0', '1'],
        [0, '1']
      ]

      const operators = {
        // eslint-disable-next-line eqeqeq
        '!=': (a, b) => a != b,
        '!==': (a, b) => a !== b,
        // eslint-disable-next-line eqeqeq
        '==': (a, b) => a == b,
        '===': (a, b) => a === b,
        '<': (a, b) => a < b,
        '>': (a, b) => a > b,
        '>=': (a, b) => a >= b,
        '<=': (a, b) => a <= b,
        or: (a, b) => a || b,
        and: (a, b) => a && b,
        xor: (a, b) => a ^ b
      }

      await Promise.all(
        Object.keys(operators).map(async (i) => {
          await Promise.all(
            vectors.map(async (vector) => {
              expect(
                await logic.run({
                  [i]: vector
                })
              ).toBe(operators[i](...vector))
            })
          )
        })
      )
    })
  })

  describe('reduce', () => {
    test('it should be possible to perform reduce and add an array', async () => {
      const answer = await logic.run({
        reduce: [
          [1, 2, 3, 4, 5],
          {
            '+': [
              {
                var: 'accumulator'
              },
              {
                var: 'current'
              }
            ]
          }
        ]
      })
      expect(answer).toBe(15)
    })

    test('it should be possible to perform reduce and add an array from data', async () => {
      const answer = await logic.run(
        {
          reduce: [
            {
              var: 'a'
            },
            {
              '+': [
                {
                  var: 'accumulator'
                },
                {
                  var: 'current'
                }
              ]
            }
          ]
        },
        {
          a: [1, 2, 3, 4, 5]
        }
      )
      expect(answer).toBe(15)
    })

    test('it should be possible to perform reduce and add an array with a default value', async () => {
      const answer = await logic.run({
        reduce: [
          [1, 2, 3, 4, 5],
          {
            '+': [
              {
                var: 'accumulator'
              },
              {
                var: 'current'
              }
            ]
          },
          10
        ]
      })
      expect(answer).toBe(25)
    })

    test('it should be possible to access data from an above layer in a reduce', async () => {
      const answer = await logic.run(
        {
          reduce: [
            {
              var: 'a'
            },
            {
              '+': [
                {
                  var: 'accumulator'
                },
                {
                  var: 'current'
                },
                {
                  var: '../../adder'
                }
              ]
            }
          ]
        },
        {
          a: [1, 2, 3, 4, 5],
          adder: 10
        }
      )
      expect(answer).toBe(55)
    })
  })

  describe('iterators', () => {
    test('some false', async () => {
      const answer = await logic.run({
        some: [
          [1, 2, 3],
          {
            '>': [
              {
                var: ''
              },
              5
            ]
          }
        ]
      })
      expect(answer).toBe(false)
    })

    test('some true', async () => {
      const answer = await logic.run({
        some: [
          [1, 2, 3],
          {
            '>': [
              {
                var: ''
              },
              2
            ]
          }
        ]
      })
      expect(answer).toBe(true)
    })

    test('every false', async () => {
      const answer = await logic.run({
        every: [
          [1, 2, 3],
          {
            '>': [
              {
                var: ''
              },
              5
            ]
          }
        ]
      })
      expect(answer).toBe(false)
    })

    test('every true', async () => {
      const answer = await logic.run({
        every: [
          [1, 2, 3],
          {
            '<': [
              {
                var: ''
              },
              5
            ]
          }
        ]
      })
      expect(answer).toBe(true)
    })

    test('map +1', async () => {
      const answer = await logic.run({
        map: [
          [1, 2, 3],
          {
            '+': [
              {
                var: ''
              },
              1
            ]
          }
        ]
      })
      expect(answer).toStrictEqual([2, 3, 4])
    })

    test('map +above', async () => {
      const answer = await logic.run(
        {
          map: [
            [1, 2, 3],
            {
              '+': [
                {
                  var: ''
                },
                {
                  var: '../../data'
                }
              ]
            }
          ]
        },
        {
          data: 1
        }
      )
      expect(answer).toStrictEqual([2, 3, 4])
    })

    test('filter evens', async () => {
      const answer = await logic.run({
        filter: [
          [1, 2, 3],
          {
            '%': [
              {
                var: ''
              },
              2
            ]
          }
        ]
      })
      expect(answer).toStrictEqual([1, 3])
    })
  })

  describe('eachKey', () => {
    test('object with 1 key works', async () => {
      const answer = await logic.run({
        eachKey: {
          a: {
            '+': [1, 2]
          }
        }
      })
      expect(answer).toStrictEqual({
        a: 3
      })
    })

    test('object with several keys works', async () => {
      const answer = await logic.run({
        eachKey: {
          a: {
            '+': [1, 2, 3]
          },
          b: {
            '-': [5, 1]
          },
          c: {
            '/': [1, 3]
          }
        }
      })
      expect(answer).toStrictEqual({
        a: 6,
        b: 4,
        c: 1 / 3
      })
    })

    test('check if able to traverse up', async () => {
      const answer = await logic.run(
        {
          eachKey: {
            a: {
              '+': [
                {
                  var: 'test'
                },
                3
              ]
            }
          }
        },
        {
          test: 7
        }
      )
      expect(answer).toStrictEqual({
        a: 10
      })
    })
  })

  describe('miscellaneous', () => {
    test('concat', async () => {
      const answer = await logic.run({
        cat: ['hello ', 'world']
      })
      expect(answer).toBe('hello world')
    })

    test('keys', async () => {
      const answer = await logic.run({
        keys: {
          preserve: {
            a: 1,
            b: 2
          }
        }
      })
      expect(answer).toStrictEqual(['a', 'b'])
    })

    test('substr', async () => {
      const answer = await logic.run({
        substr: ['hello', 0, 3]
      })
      expect(answer).toBe('hel')

      const answer2 = await logic.run({
        substr: ['hello', 0, -2]
      })
      expect(answer2).toBe('hel')
    })

    test('missing', async () => {
      const answer = await logic.run({
        missing: ['a']
      })
      expect(answer).toStrictEqual(['a'])

      const answer2 = await logic.run(
        {
          missing: ['a']
        },
        {
          a: 1
        }
      )
      expect(answer2).toStrictEqual([])
    })

    test('length string', async () => {
      const answer = await logic.run({
        length: 'hello'
      })

      expect(answer).toStrictEqual(5)
    })

    test('length array', async () => {
      const answer = await logic.run({
        length: ['hello']
      })

      expect(answer).toStrictEqual(1)
    })

    test('length object (2 keys)', async () => {
      const answer = await logic.run({
        length: { preserve: { a: 1, b: 2 } }
      })

      expect(answer).toStrictEqual(2)
    })

    test('length object (1 keys)', async () => {
      const answer = await logic.run({
        length: { preserve: { a: 1 } }
      })

      expect(answer).toStrictEqual(1)
    })

    test('get from array', async () => {
      const answer = await logic.run({
        get: [['hi'], 'length']
      })

      expect(answer).toStrictEqual(1)
    })

    test('get from object', async () => {
      const answer = await logic.run({
        get: [{ preserve: { a: 1 } }, 'a']
      })

      expect(answer).toStrictEqual(1)
    })

    test('get from object default', async () => {
      const answer = await logic.run({
        get: [{ preserve: {} }, 'a', 5]
      })

      expect(answer).toStrictEqual(5)
    })

    test('length object (0 keys)', async () => {
      const answer = await logic.run({
        length: { preserve: {} }
      })

      expect(answer).toStrictEqual(0)
    })

    test('length object (null)', async () => {
      const answer = await logic.run({
        length: { preserve: null }
      })

      expect(answer).toStrictEqual(0)
    })

    test('merge', async () => {
      const answer = await logic.run({
        merge: [{ preserve: ['b'] }, { preserve: ['c'] }]
      })
      expect(answer).toStrictEqual(['b', 'c'])
    })

    test('not', async () => {
      const answer = await logic.run({
        not: true
      })
      expect(answer).toBe(false)

      const answer2 = await logic.run({
        not: false
      })
      expect(answer2).toBe(true)
    })

    test('!', async () => {
      const answer = await logic.run({
        '!': true
      })
      expect(answer).toBe(false)

      const answer2 = await logic.run({
        '!': false
      })
      expect(answer2).toBe(true)
    })

    test('!!', async () => {
      const answer = await logic.run({
        '!!': 0
      })
      expect(answer).toBe(false)

      const answer2 = await logic.run({
        '!!': 1
      })
      expect(answer2).toBe(true)
    })
  })

  describe('addMethod', () => {
    test('adding a method works', async () => {
      logic.addMethod('+1', (item) => item + 1, { sync: true })
      expect(
        await logic.run({
          '+1': 7
        })
      ).toBe(8)
    })
  })
  // describe('prototype pollution', () => {
  //   test('simple data prototype pollution', async () => {
  //     logic.addMethod('CombineObjects', (objects) => {
  //       // vulnerable code
  //       const result = {}
  //       for (const obj of objects) {
  //         for (const key in obj) {
  //           result[key] = obj[key]
  //         }
  //       }
  //     })
  //     await expect(async () => await logic.run({
  //       CombineObjects: [{
  //         var: 'a'
  //       }, {
  //         var: 'b'
  //       }]
  //     }, {
  //       a: JSON.parse('{ "__proto__": { "wah": 1 } }'),
  //       b: {
  //         a: 1
  //       }
  //     })).rejects.toThrow()
  //   })
  // })
  describe('prevent access to data that should not be accessed', () => {
    test('prevent access to functions on objects', async () => {
      expect(
        await logic.run(
          {
            var: 'toString'
          },
          'hello'
        )
      ).toBe(null)
    })

    test('allow access to functions on objects when enabled', async () => {
      logic.allowFunctions = true
      expect(
        await logic.run(
          {
            var: 'toString'
          },
          'hello'
        )
      ).toBe('hello'.toString)
    })
  })

  if (logic.options.yieldSupported) {
    describe('Yield technology', () => {
      test('Yield if variable does not exist', async () => {
        logic.addMethod(
          'yieldVar',
          (key, context, above, engine) => {
            if (!key) return context

            if (typeof context !== 'object' && key.startsWith('../')) {
              return engine.methods.var(
                key.substring(3),
                above,
                undefined,
                engine
              )
            }

            if (engine.allowFunctions || typeof (context && context[key]) !== 'function') {
              if (!(key in context)) {
                return new YieldStructure({
                  message: 'Data does not exist in context.'
                })
              }
              return context[key]
            }
          },
          { sync: true }
        )

        const script = {
          '+': [1, { '+': [1, 2, 3] }, { yieldVar: 'a' }]
        }

        const instance = await logic.run(script)

        expect(instance instanceof EngineObject).toBe(true)

        expect(instance.yields().map((i) => ({ ...i }))).toStrictEqual([
          {
            _input: null,
            message: 'Data does not exist in context.',
            _logic: { yieldVar: 'a' },
            resumable: null
          }
        ])

        expect(instance.logic()).toStrictEqual({
          '+': [1, 6, { yieldVar: 'a' }]
        })

        expect(
          await logic.run(instance.logic(), {
            a: 1
          })
        ).toBe(8)

        expect(await logic.run(script, { a: 1 })).toBe(8)
      })
    })
  }
})
