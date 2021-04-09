const fs = require('fs')
const { LogicEngine } = require('.')
const tests = JSON.parse(fs.readFileSync('./bench/compatible.json').toString())

const logic = new LogicEngine()
describe('All of the compatible tests', () => {
  test('All of the compatible tests', () => {
    tests.forEach(test => {
      expect(logic.run(test[0], test[1])).toStrictEqual(test[2])
    })
  })
})
