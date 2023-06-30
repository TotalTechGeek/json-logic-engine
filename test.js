import { LogicEngine } from './index.js'
import YieldStructure from './structures/Yield.js'
import EngineObject from './structures/EngineObject.js'

const modes = [
  new LogicEngine(),
  new LogicEngine(undefined, {
    yieldSupported: true
  })
]

modes.forEach((logic) => {
  describe('+', () => {
    test('it should be able to add two numbers together', () => {
      const answer = logic.run({
        '+': [1, 2]
      })

      expect(answer).toBe(3)
    })

    test('it should be able to add three numbers together', () => {
      const answer = logic.run({
        '+': [1, 2, 3]
      })

      expect(answer).toBe(6)
    })
  })

  describe('-', () => {
    test('it should be able to subtract two numbers', () => {
      const answer = logic.run({
        '-': [1, 2]
      })

      expect(answer).toBe(-1)
    })

    test('it should be able to subtract three numbers', () => {
      const answer = logic.run({
        '-': [1, 2, 3]
      })

      expect(answer).toBe(-4)
    })

    test('it should be able to negate a single number', () => {
      const answer = logic.run({
        '-': [1]
      })

      expect(answer).toBe(-1)
    })

    test('it should be able to negate a single number in an array', () => {
      const answer = logic.run({
        '-': 1
      })

      expect(answer).toBe(-1)
    })

    test('it should be able to negate Infinity', () => {
      const answer = logic.run({
        '-': Infinity
      })

      expect(answer).toBe(-Infinity)
    })
  })

  describe('*', () => {
    test('it should be able to multiply two numbers', () => {
      const answer = logic.run({
        '*': [1, 2]
      })

      expect(answer).toBe(2)
    })

    test('it should be able to multiply three numbers', () => {
      const answer = logic.run({
        '*': [1, 2, 3]
      })

      expect(answer).toBe(6)
    })
  })

  describe('/', () => {
    test('it should be able to divide two numbers', () => {
      const answer = logic.run({
        '/': [1, 2]
      })

      expect(answer).toBe(1 / 2)
    })

    test('it should be able to divide three numbers', () => {
      const answer = logic.run({
        '/': [1, 2, 3]
      })

      expect(answer).toBe(1 / 6)
    })
  })

  describe('%', () => {
    test('it should be able to modulo two numbers', () => {
      const answer = logic.run({
        '%': [5, 2]
      })

      expect(answer).toBe(5 % 2)
    })

    test('it should be able to modulo three numbers', () => {
      const answer = logic.run({
        '%': [5, 3, 7]
      })

      expect(answer).toBe((5 % 3) % 7)
    })
  })

  describe('var', () => {
    test('it should be able to access a variable', () => {
      const answer = logic.run(
        {
          var: 'a'
        },
        {
          a: 7
        }
      )
      expect(answer).toBe(7)
    })

    test('it should be able to access a nested variable', () => {
      const answer = logic.run(
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

    test('it should be able to access a deeply nested variable', () => {
      const answer = logic.run(
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

    test('it should be able to access the entire variable', () => {
      const answer = logic.run(
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

    test('it should be able to access the variable in a nested command', () => {
      const answer = logic.run(
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
    test('it should be able to get the max of two numbers', () => {
      const answer = logic.run({
        max: [5, 2]
      })

      expect(answer).toBe(5)
    })

    test('it should be able to get the max of three or more numbers', () => {
      const answer = logic.run({
        max: [5, 3, 7]
      })

      expect(answer).toBe(7)
    })
  })

  describe('min', () => {
    test('it should be able to get the min of two numbers', () => {
      const answer = logic.run({
        min: [5, 2]
      })

      expect(answer).toBe(2)
    })

    test('it should be able to get the min of three or more numbers', () => {
      const answer = logic.run({
        min: [5, 3, 7]
      })

      expect(answer).toBe(3)
    })
  })

  describe('in', () => {
    test('it should be able to tell when an item is in an array', () => {
      const answer = logic.run({
        in: [5, [5, 6, 7]]
      })

      expect(answer).toBe(true)
    })

    test('it should be able to tell when an item is not in an array', () => {
      const answer = logic.run({
        in: [7, [1, 2, 3]]
      })

      expect(answer).toBe(false)
    })
  })

  describe('preserve', () => {
    test('it should be able to avoid traversing data with preserve', () => {
      const answer = logic.run({
        preserve: {
          '+': [1, 2]
        }
      })

      expect(answer).toStrictEqual({
        '+': [1, 2]
      })
    })

    test('it should be able to tell when an item is not in an array', () => {
      const answer = logic.run({
        in: [7, [1, 2, 3]]
      })

      expect(answer).toBe(false)
    })
  })

  describe('if', () => {
    test('it should take the first branch if the first value is truthy', () => {
      const answer = logic.run({
        if: [1, 2, 3]
      })

      expect(answer).toBe(2)
    })

    test('it should take the second branch if the first value is falsey', () => {
      const answer = logic.run({
        if: [0, 2, 3]
      })

      expect(answer).toBe(3)
    })
  })

  describe('comparison operators', () => {
    test('the comparison operators should all work', () => {
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
      Object.keys(operators).forEach((i) => {
        vectors.forEach((vector) => {
          expect(
            logic.run({
              [i]: vector
            })
          ).toBe(operators[i](...vector))
        })
      })
    })
  })

  describe('reduce', () => {
    test('it should be possible to perform reduce and add an array', () => {
      const answer = logic.run({
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

    test('it should be possible to perform reduce and add an array from data', () => {
      const answer = logic.run(
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

    test('it should be possible to perform reduce and add an array with a default value', () => {
      const answer = logic.run({
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

    test('it should be possible to access data from an above layer in a reduce', () => {
      const answer = logic.run(
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
    test('some false', () => {
      const answer = logic.run({
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

    test('some true', () => {
      const answer = logic.run({
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

    test('every false', () => {
      const answer = logic.run({
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

    test('every true', () => {
      const answer = logic.run({
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

    test('map +1', () => {
      const answer = logic.run({
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

    test('map +above', () => {
      const answer = logic.run(
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

    test('filter evens', () => {
      const answer = logic.run({
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
    test('object with 1 key works', () => {
      const answer = logic.run({
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

    test('object with several keys works', () => {
      const answer = logic.run({
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

    test('check if able to traverse up', () => {
      const answer = logic.run(
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
    test('concat', () => {
      const answer = logic.run({
        cat: ['hello ', 'world']
      })

      expect(answer).toBe('hello world')
    })

    test('keys', () => {
      const answer = logic.run({
        keys: {
          preserve: {
            a: 1,
            b: 2
          }
        }
      })

      expect(answer).toStrictEqual(['a', 'b'])
    })

    test('substr', () => {
      const answer = logic.run({
        substr: ['hello', 0, 3]
      })

      expect(answer).toBe('hel')
      const answer2 = logic.run({
        substr: ['hello', 0, -2]
      })

      expect(answer2).toBe('hel')
    })

    test('missing', () => {
      const answer = logic.run({
        missing: ['a']
      })

      expect(answer).toStrictEqual(['a'])
      const answer2 = logic.run(
        {
          missing: ['a']
        },
        {
          a: 1
        }
      )
      expect(answer2).toStrictEqual([])
    })

    test('get from string', () => {
      const answer = logic.run({
        get: ['hello', 'length']
      })

      expect(answer).toStrictEqual(5)
    })

    test('length string', () => {
      const answer = logic.run({
        length: 'hello'
      })

      expect(answer).toStrictEqual(5)
    })

    test('length array', () => {
      const answer = logic.run({
        length: ['hello']
      })

      expect(answer).toStrictEqual(1)
    })

    test('length object (2 keys)', () => {
      const answer = logic.run({
        length: { preserve: { a: 1, b: 2 } }
      })

      expect(answer).toStrictEqual(2)
    })

    test('length object (1 keys)', () => {
      const answer = logic.run({
        length: { preserve: { a: 1 } }
      })

      expect(answer).toStrictEqual(1)
    })

    test('length object (0 keys)', () => {
      const answer = logic.run({
        length: { preserve: {} }
      })

      expect(answer).toStrictEqual(0)
    })

    test('length object (null)', () => {
      const answer = logic.run({
        length: { preserve: null }
      })

      expect(answer).toStrictEqual(0)
    })

    test('get from array', () => {
      const answer = logic.run({
        get: [['hi'], 'length']
      })

      expect(answer).toStrictEqual(1)
    })

    test('get from object', () => {
      const answer = logic.run({
        get: [{ preserve: { a: 1 } }, 'a']
      })

      expect(answer).toStrictEqual(1)
    })

    test('get from object default', () => {
      const answer = logic.run({
        get: [{ preserve: {} }, 'a', 5]
      })

      expect(answer).toStrictEqual(5)
    })

    test('merge', () => {
      const answer = logic.run({
        merge: [{ preserve: ['b'] }, { preserve: ['c'] }]
      })

      expect(answer).toStrictEqual(['b', 'c'])
    })

    test('not', () => {
      const answer = logic.run({
        not: true
      })

      expect(answer).toBe(false)
      const answer2 = logic.run({
        not: false
      })

      expect(answer2).toBe(true)
    })

    test('!', () => {
      const answer = logic.run({
        '!': true
      })

      expect(answer).toBe(false)
      const answer2 = logic.run({
        '!': false
      })

      expect(answer2).toBe(true)
    })

    test('!!', () => {
      const answer = logic.run({
        '!!': 0
      })

      expect(answer).toBe(false)
      const answer2 = logic.run({
        '!!': 1
      })

      expect(answer2).toBe(true)
    })
  })

  describe('addMethod', () => {
    test('adding a method works', () => {
      logic.addMethod('+1', (item) => item + 1)
      expect(
        logic.run({
          '+1': 7
        })
      ).toBe(8)
    })
  })

  // describe('prototype pollution', () => {
  //   test('simple data prototype pollution', () => {
  //     logic.addMethod('CombineObjects', (objects) => {
  //       // vulnerable code
  //       const result = {}
  //       for (const obj of objects) {
  //         for (const key in obj) {
  //           result[key] = obj[key]
  //         }
  //       }
  //     })
  //     expect(() => logic.run({
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
  //     })).toThrow()
  //   })
  // })
  describe('prevent access to data that should not be accessed', () => {
    test('prevent access to functions on objects', () => {
      expect(
        logic.run(
          {
            var: 'toString'
          },
          'hello'
        )
      ).toBe(null)
    })

    test('allow access to functions on objects when enabled', () => {
      logic.allowFunctions = true
      expect(
        logic.run(
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
      test('Yield if variable does not exist', () => {
        logic.addMethod('yieldVar', (key, context, above, engine) => {
          if (!key) return context
          if (typeof context !== 'object' && key.startsWith('../')) {
            return engine.methods.var(
              key.substring(3),
              above,
              undefined,
              engine
            )
          }
          if (engine.allowFunctions || typeof context[key] !== 'function') {
            if (!(key in context)) {
              return new YieldStructure({
                message: 'Data does not exist in context.'
              })
            }
            return context[key]
          }
        })

        const script = {
          '+': [1, { '+': [1, 2, 3] }, { yieldVar: 'a' }]
        }
        const instance = logic.run(script)
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
          logic.run(instance.logic(), {
            a: 1
          })
        ).toBe(8)
        expect(logic.run(script, { a: 1 })).toBe(8)
      })
    })
  }
})
