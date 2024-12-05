import fs from 'fs'
import { LogicEngine, AsyncLogicEngine } from './index.js'
const tests = []

// get all json files from "suites" directory
const files = fs.readdirSync('./suites')
for (const file of files) {
  if (file.endsWith('.json')) tests.push(...JSON.parse(fs.readFileSync(`./suites/${file}`).toString()).filter(i => typeof i !== 'string'))
}

// eslint-disable-next-line no-labels
inline: {
  const logic = new LogicEngine(undefined, { compatible: true })
  const asyncLogic = new AsyncLogicEngine(undefined, { compatible: true })
  const logicWithoutOptimization = new LogicEngine(undefined, { compatible: true })
  const asyncLogicWithoutOptimization = new AsyncLogicEngine(undefined, { compatible: true })

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

      test(`${JSON.stringify(testCase[0])} ${JSON.stringify(
        testCase[1]
      )} (noOptimization)`, () => {
        expect(logicWithoutOptimization.run(testCase[0], testCase[1])).toStrictEqual(testCase[2])
      })

      test(`${JSON.stringify(testCase[0])} ${JSON.stringify(
        testCase[1]
      )} (asyncNoOptimization)`, async () => {
        expect(await asyncLogicWithoutOptimization.run(testCase[0], testCase[1])).toStrictEqual(
          testCase[2]
        )
      })

      test(`${JSON.stringify(testCase[0])} ${JSON.stringify(
        testCase[1]
      )} (builtNoOptimization)`, () => {
        const f = logicWithoutOptimization.build(testCase[0])
        expect(f(testCase[1])).toStrictEqual(testCase[2])
      })

      test(`${JSON.stringify(testCase[0])} ${JSON.stringify(
        testCase[1]
      )} (asyncBuiltNoOptimization)`, async () => {
        const f = await asyncLogicWithoutOptimization.build(testCase[0])
        expect(await f(testCase[1])).toStrictEqual(testCase[2])
      })
    })
  })
}
// eslint-disable-next-line no-labels
notInline: {
  const logic = new LogicEngine(undefined, { compatible: true })
  const asyncLogic = new AsyncLogicEngine(undefined, { compatible: true })
  const logicWithoutOptimization = new LogicEngine(undefined, { compatible: true })
  const asyncLogicWithoutOptimization = new AsyncLogicEngine(undefined, { compatible: true })

  logicWithoutOptimization.disableInline = true
  logic.disableInline = true
  asyncLogic.disableInline = true
  asyncLogicWithoutOptimization.disableInline = true

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

    test(`${JSON.stringify(testCase[0])} ${JSON.stringify(
      testCase[1]
    )} (noOptimization)`, () => {
      expect(logicWithoutOptimization.run(testCase[0], testCase[1])).toStrictEqual(testCase[2])
    })

    test(`${JSON.stringify(testCase[0])} ${JSON.stringify(
      testCase[1]
    )} (asyncNoOptimization)`, async () => {
      expect(await asyncLogicWithoutOptimization.run(testCase[0], testCase[1])).toStrictEqual(
        testCase[2]
      )
    })

    test(`${JSON.stringify(testCase[0])} ${JSON.stringify(
      testCase[1]
    )} (builtNoOptimization)`, () => {
      const f = logicWithoutOptimization.build(testCase[0])
      expect(f(testCase[1])).toStrictEqual(testCase[2])
    })

    test(`${JSON.stringify(testCase[0])} ${JSON.stringify(
      testCase[1]
    )} (asyncBuiltNoOptimization)`, async () => {
      const f = await asyncLogicWithoutOptimization.build(testCase[0])
      expect(await f(testCase[1])).toStrictEqual(testCase[2])
    })
  })
}
