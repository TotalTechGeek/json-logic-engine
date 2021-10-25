import { LogicEngine, AsyncLogicEngine } from './index.js'
const engines = [new LogicEngine(), new AsyncLogicEngine()]
describe('Trying out adding modules to the engine', () => {
  engines.forEach((engine) => {
    test('Add Math Module', async () => {
      engine.addModule('Math', Math, { deterministic: true, sync: true })
      expect(await engine.run({ 'Math.ceil': 2.5 })).toBe(3)
      expect(await engine.run({ 'Math.floor': 2.5 })).toBe(2)
    })

    test('Add math module with empty name', async () => {
      engine.addModule('', Math, { deterministic: true, sync: true })
      expect(await engine.run({ ceil: 2.5 })).toBe(3)
      expect(await engine.run({ floor: 2.5 })).toBe(2)
    })
  })
})
