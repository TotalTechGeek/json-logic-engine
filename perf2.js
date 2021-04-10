'use strict'
const { LogicEngine } = require('./')
const { Sync } = require('./constants')

const x = new LogicEngine()

async function main () {
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

  const f = x.build(logic)
  console.time('built')
  console.log(f[Sync])

  for (let i = 0; i < 1e6; i++) {
    f({ x: i, y: i % 20 })
  }
  console.log(f({ x: 15, y: 1 }))
  console.timeEnd('built')
}

main()
