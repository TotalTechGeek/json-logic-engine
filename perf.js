import { AsyncLogicEngine } from './index.js'
const x = new AsyncLogicEngine(undefined, { yieldSupported: false })
async function test () {
  const logic = {
    if: [
      {
        '>': [{ var: 'x' }, { '+': [11, 5, { '+': [1, { var: 'y' }, 1] }, 2] }]
      },
      {
        '*': [{ var: 'x' }, { '*': { map: [[2, 5, 5], { var: '' }] } }]
      },
      {
        '/': [{ var: 'x' }, { '-': { map: [[100, 50, 30, 10], { var: '' }] } }]
      }
    ]
  }
  console.time('interpreted')
  console.log(await x.run(logic, { x: 15, y: 1 }))
  for (let i = 0; i < 2e6; i++) {
    await x.run(logic, { x: i, y: i % 20 })
  }
  console.timeEnd('interpreted')
}
test()
