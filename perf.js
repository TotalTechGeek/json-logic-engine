const { LogicEngine } = require('.')

const logic = new LogicEngine(undefined, { yieldSupported: false })

async function test () {
  console.time('old')
  // const outer = [...new Array(100)]
  // for (let i = 0; i < 10e3; i++) {
  //   const arr = outer.map((i, x) => (x + 10) * Math.random() | 0)
  //   logic.run({
  //     mapYield: [arr, { '+': [{ var: '' }, 1] }]
  //   })
  // }

  console.log(logic.run({ map: [[1, 2, { '+': [1, { var: 'x' }] }], { '+': [{ var: '' }, 1] }] }, { x: 5 }))
  console.log(logic.run({ map: [[1, 2, { '+': [1, { var: 'x' }] }], { '+': [{ var: '' }, 1] }] }, { x: 1 }))

  for (let i = 0; i < 1e6; i++) {
    logic.run({ map: [[1, 2, { '+': [1, { var: 'x' }] }], { '+': [{ var: '' }, 1] }] }, { x: i })
  }
  console.timeEnd('old')
}

test()
