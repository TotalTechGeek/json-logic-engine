'use strict'
const { LogicEngine } = require('./')

// const jsonLogic = require('json-logic-js')

const x = new LogicEngine()

async function main () {
  // map: [[{ '+': [1, 2, 3, 4, { var: 'x' }, { var: 'y' }] }, 1, 2, 4, 5, 7, { var: 'x' }, 1, 1, 1], { '+': [{ var: '' }, 1, 2, 3] }]
  const logic = {
    '*': [{ '+': [{ var: 'x' }, { var: 'y' }, 1, 2] }, { var: 'y' }]
  }

  console.time('interpreted')
  for (let i = 0; i < 5e6; i++) {
    await x.run(logic, { x: i, y: 1 })
  }
  console.log(await x.run(logic, { x: 15, y: 1 }))
  console.timeEnd('interpreted')

  const f = x.build(logic)

  console.time('built')
  for (let i = 0; i < 5e6; i++) {
    await f({ x: i, y: 1 })
  }
  console.log(await f({ x: 15, y: 1 }))
  console.timeEnd('built')

  console.time('json-logic-js')

  // for (let i = 0; i < 5e6; i++) {
  //   await jsonLogic.apply(logic, { x: i, y: 1 })
  // }
  // console.log(jsonLogic.apply(logic, { x: 15, y: 1 }))

  // console.timeEnd('json-logic-js')
}

main()
