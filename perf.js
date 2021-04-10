const { LogicEngine } = require('.')

const x = new LogicEngine(undefined, { yieldSupported: false })

async function test () {
  const logic = {
    or: [{
      and: [{
        '>': [{ var: 'x' }, { '+': [11, 5, { '+': [1, { var: 'y' }, 1] }, 2] }]
      }, {
        '*': [{ var: 'x' }, { '*': { map: [[1, 5], { '+': [{ var: '' }, 1] }] } }]
      }]
    }, {
      '/': [{ var: 'x' }, { '-': [100, 50, 30, 10] }]
    }]
  }

  console.time('interpreted')
  for (let i = 0; i < 1e6; i++) {
    x.run(logic, { x: i, y: i % 20 })
  }
  console.log(x.run(logic, { x: 15, y: 1 }))
  console.timeEnd('interpreted')
}

test()
