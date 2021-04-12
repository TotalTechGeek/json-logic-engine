'use strict'
const { LogicEngine } = require('./')
// const { Sync } = require('./constants')

const x = new LogicEngine()

async function main () {
  const logic = {
    if: [{
      '>': [{ var: 'x' }, { '+': [11, 5, { '+': [1, { var: 'y' }, 1] }, 2] }]
    }, {
      '*': [{ var: 'x' }, { '*': { map: [[2, 5, 5], { var: '' }] } }]
    },
    {
      '/': [{ var: 'x' }, { '-': { map: [[100, 50, 30, 10], { var: '' }] } }]
    }
    ]
  }

  console.time('built')
  const f = x.build(logic)

  // console.log(f[Sync])
  console.log(f({ x: 15, y: 1 }))

  for (let i = 0; i < 2e6; i++) {
    f({ x: i, y: i % 20 })
  }
  console.timeEnd('built')
}

main()
