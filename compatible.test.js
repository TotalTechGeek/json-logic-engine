const fs = require('fs')
const { LogicEngine, AsyncLogicEngine } = require('.')
const traverseCopy = require('./utilities/traverseCopy')
const tests = JSON.parse(fs.readFileSync('./bench/compatible.json').toString())

const other = traverseCopy(tests, [], {
  mutateKey: i => {
    if (i === 'map') {
      return 'mapYield'
    }
    if (i === 'reduce') {
      return 'reduceYield'
    }
    if (i === 'filter') {
      return 'filterYield'
    }
    if (i === 'every') {
      return 'everyYield'
    }
    if (i === 'some') {
      return 'someYield'
    }
    return i
  }
})

const logic = new LogicEngine()
const asyncLogic = new AsyncLogicEngine()

describe('All of the compatible tests', () => {
  test('All of the compatible tests', () => {
    tests.forEach(test => {
      expect(logic.run(test[0], test[1])).toStrictEqual(test[2])
    })
  })

  test('All of the compatible tests (async)', async () => {
    for (let i = 0; i < tests.length; i++) {
      const test = tests[i]
      expect(await asyncLogic.run(test[0], test[1])).toStrictEqual(test[2])
    }
  })

  test('All of the compatible tests (built)', () => {
    for (let i = 0; i < tests.length; i++) {
      const test = tests[i]
      const f = logic.build(test[0])
      expect(f(test[1])).toStrictEqual(test[2])
    }
  })

  test('All of the compatible tests (asyncBuilt)', async () => {
    for (let i = 0; i < tests.length; i++) {
      const test = tests[i]
      const f = asyncLogic.build(test[0])
      expect(await f(test[1])).toStrictEqual(test[2])
    }
  })
})

describe('All of the compatible tests with yielded iterators', () => {
  test('All of the compatible tests', () => {
    other.forEach(test => {
      expect(logic.run(test[0], test[1])).toStrictEqual(test[2])
    })
  })

  test('All of the compatible tests (async)', async () => {
    for (let i = 0; i < other.length; i++) {
      const test = other[i]
      expect(await asyncLogic.run(test[0], test[1])).toStrictEqual(test[2])
    }
  })

  test('All of the compatible tests (built)', () => {
    for (let i = 0; i < other.length; i++) {
      const test = other[i]
      const f = logic.build(test[0])
      console.log(JSON.stringify(test[0]), JSON.stringify(test[1]))
      expect(f(test[1])).toStrictEqual(test[2])
    }
  })

  test('All of the compatible tests (asyncBuilt)', async () => {
    for (let i = 0; i < other.length; i++) {
      const test = other[i]
      const f = asyncLogic.build(test[0])
      expect(await f(test[1])).toStrictEqual(test[2])
    }
  })
})
