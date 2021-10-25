// @ts-check
'use strict'

import { AsyncLogicEngine } from './index.js'

const x = new AsyncLogicEngine(undefined)
async function main () {
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
  console.time('built')
  const f = await x.build(logic)
  // console.log(f[Sync])
  console.log(await f({ x: 15, y: 1 }))
  for (let i = 0; i < 2e6; i++) {
    await f({ x: i, y: i % 20 })
  }
  console.timeEnd('built')
}
main()
