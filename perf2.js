'use strict'
const { AsyncLogicEngine } = require('./')

const x = new AsyncLogicEngine()

async function main () {
  const logic = {
    or: [{
      and: [{
        '>': [{ var: 'x' }, { '+': [11, 5, { '+': [1, { var: 'y' }, 1] }, 2] }]
      }, {
        '*': [{ var: 'x' }, { '*': { mapYield: [[1, 5], { '+': [{ var: '' }, 1] }] } }]
      }]
    }, {
      '/': [{ var: 'x' }, { '-': [100, 50, 30, 10] }]
    }]
  }

  const f = x.build(logic, {}, { top: true })
  console.time('built')
  for (let i = 0; i < 2e6; i++) {
    await f({ x: i, y: i % 20 })
  }
  console.log(f({ x: 15, y: 1 }))
  console.timeEnd('built')
}

main()
