import fs from 'fs'
import { LogicEngine, AsyncLogicEngine } from './index.js'
import traverseCopy from './utilities/traverseCopy.js'

const tests = JSON.parse(fs.readFileSync('./bench/compatible.json').toString())

const other = traverseCopy(tests, [], {
  mutateKey: (i) => {
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

// eslint-disable-next-line no-labels
inline: {
  const logic = new LogicEngine()
  const asyncLogic = new AsyncLogicEngine()
  describe('All of the compatible tests', () => {
    tests.forEach((testCase) => {
      test(`${JSON.stringify(testCase[0])} ${JSON.stringify(
        testCase[1]
      )}`, () => {
        expect(logic.run(testCase[0], testCase[1])).toStrictEqual(testCase[2])
      })

      test(`${JSON.stringify(testCase[0])} ${JSON.stringify(
        testCase[1]
      )} (async)`, async () => {
        expect(await asyncLogic.run(testCase[0], testCase[1])).toStrictEqual(
          testCase[2]
        )
      })

      test(`${JSON.stringify(testCase[0])} ${JSON.stringify(
        testCase[1]
      )} (built)`, () => {
        const f = logic.build(testCase[0])
        expect(f(testCase[1])).toStrictEqual(testCase[2])
      })

      test(`${JSON.stringify(testCase[0])} ${JSON.stringify(
        testCase[1]
      )} (asyncBuilt)`, async () => {
        const f = await asyncLogic.build(testCase[0])
        expect(await f(testCase[1])).toStrictEqual(testCase[2])
      })
    })
  })

  describe('All of the compatible tests with yielded iterators', () => {
    test('All of the compatible tests', () => {
      other.forEach((test) => {
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
        // console.log(JSON.stringify(test[0]), JSON.stringify(test[1]))
        expect(f(test[1])).toStrictEqual(test[2])
      }
    })

    test('All of the compatible tests (asyncBuilt)', async () => {
      for (let i = 0; i < other.length; i++) {
        const test = other[i]
        const f = await asyncLogic.build(test[0])
        expect(await f(test[1])).toStrictEqual(test[2])
      }
    })
  })
}
// eslint-disable-next-line no-labels
notInline: {
  const logic = new LogicEngine()
  const asyncLogic = new AsyncLogicEngine()
  logic.disableInline = true
  asyncLogic.disableInline = true
  // using a loop to disable the inline compilation mechanism.
  tests.forEach((testCase) => {
    test(`${JSON.stringify(testCase[0])} ${JSON.stringify(
      testCase[1]
    )}`, () => {
      expect(logic.run(testCase[0], testCase[1])).toStrictEqual(testCase[2])
    })

    test(`${JSON.stringify(testCase[0])} ${JSON.stringify(
      testCase[1]
    )} (async)`, async () => {
      expect(await asyncLogic.run(testCase[0], testCase[1])).toStrictEqual(
        testCase[2]
      )
    })

    test(`${JSON.stringify(testCase[0])} ${JSON.stringify(
      testCase[1]
    )} (built)`, () => {
      const f = logic.build(testCase[0])
      expect(f(testCase[1])).toStrictEqual(testCase[2])
    })

    test(`${JSON.stringify(testCase[0])} ${JSON.stringify(
      testCase[1]
    )} (asyncBuilt)`, async () => {
      const f = await asyncLogic.build(testCase[0])
      expect(await f(testCase[1])).toStrictEqual(testCase[2])
    })
  })

  describe('All of the compatible tests with yielded iterators', () => {
    test('All of the compatible tests', () => {
      other.forEach((test) => {
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
        // console.log(JSON.stringify(test[0]), JSON.stringify(test[1]))
        expect(f(test[1])).toStrictEqual(test[2])
      }
    })

    test('All of the compatible tests (asyncBuilt)', async () => {
      for (let i = 0; i < other.length; i++) {
        const test = other[i]
        const f = await asyncLogic.build(test[0])
        expect(await f(test[1])).toStrictEqual(test[2])
      }
    })
  })
}
