import InvalidControlInput from './errors/InvalidControlInput.js'
import { LogicEngine, AsyncLogicEngine } from './index.js'
const engines = [
  new LogicEngine(),
  new AsyncLogicEngine(),
  new LogicEngine(undefined, { yieldSupported: true }),
  new AsyncLogicEngine(undefined, { yieldSupported: true })
]
describe('Test throwing errors for dynamic control structures', () => {
  engines.forEach((engine) => {
    test('map (normal)', async () => {
      expect(async () => {
        await engine.run({ map: { preserve: [[1, 2, 3], { var: '' }] } })
      }).rejects.toThrow(InvalidControlInput)
    })

    test('reduce (normal)', async () => {
      expect(async () => {
        await engine.run({ reduce: { preserve: [[1, 2, 3], { var: '' }] } })
      }).rejects.toThrow(InvalidControlInput)
    })

    test('map (built)', async () => {
      expect(async () => {
        await engine.build({ map: { preserve: [[1, 2, 3], { var: '' }] } })
      }).rejects.toThrow(InvalidControlInput)
    })

    test('reduce (built)', async () => {
      expect(async () => {
        await engine.build({ reduce: { preserve: [[1, 2, 3], { var: '' }] } })
      }).rejects.toThrow(InvalidControlInput)
    })
  })
})
