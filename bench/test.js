import { LogicEngine, AsyncLogicEngine } from '../index.js'
import fs from 'fs'
import { isDeepStrictEqual } from 'util'
import traverseCopy from '../utilities/traverseCopy.js'
import jl from 'json-logic-js'

const x = new LogicEngine()
const y = new AsyncLogicEngine()
const compatible = []
const incompatible = []
JSON.parse(fs.readFileSync('./tests.json').toString()).forEach((test) => {
  if (typeof test === 'string') {
    // console.log(test)
  } else {
    try {
      if (!isDeepStrictEqual(x.run(test[0], test[1]), test[2])) {
        incompatible.push(test)
        // console.log(test[0])
      } else {
        compatible.push(test)
      }
    } catch (err) {
      //   console.log(err)
      //   console.log(test[0])
      incompatible.push(test)
    }
  }
})
console.log(
  compatible.length,
  incompatible.length,
  compatible.length / (compatible.length + incompatible.length)
)
fs.writeFileSync('compatible.json', JSON.stringify(compatible, undefined, 4))
fs.writeFileSync(
  'incompatible.json',
  JSON.stringify(incompatible, undefined, 4)
)
const defined = [
  [{ '+': [1, 2, 3, 4, 5] }, {}],
  [{ map: [[1, 2, 3, 4, 5], { '+': [{ var: '' }, 1] }] }, {}],
  [{ cat: ['Test of a ', { var: 'x' }] }, { x: 'Program' }],
  [
    { '>': [{ var: 'x' }, 10] },
    {
      x: 7
    }
  ],
  [
    { and: [{ '>': [{ var: 'accountants' }, 3] }, { var: 'approvedBy.ceo' }] },
    {
      approvedBy: {
        ceo: true
      },
      accountants: 10
    }
  ],
  [{ '+': [{ var: '' }, 1] }, 5, 6],
  [{ '-': [{ var: '' }, 1] }, 7, 6],
  [{ '*': [{ var: 'x' }, { var: 'y' }] }, { x: 1, y: 3 }, 3]
]
const tests = defined || compatible
const other =
  tests ||
  traverseCopy(tests, [], {
    mutateKey: (i) => {
      if (i === 'map') {
        return 'mapYield'
      }
      if (i === 'reduce') {
        return 'reduceYield'
      }
      if (i === 'filter') {
        return 'filterYield'
      }
      if (i === 'every') {
        return 'everyYield'
      }
      if (i === 'some') {
        return 'someYield'
      }
      return i
    }
  })
const built = other.map((i) => {
  return x.build(i[0])
})
console.time('json-logic-js')
for (let j = 0; j < tests.length; j++) {
  for (let i = 0; i < 1e5; i++) {
    jl.apply(tests[j][0], tests[j][1])
  }
}
console.timeEnd('json-logic-js')
console.time('le interpreted')
for (let j = 0; j < other.length; j++) {
  for (let i = 0; i < 1e5; i++) {
    x.run(other[j][0], other[j][1])
  }
}
console.timeEnd('le interpreted')
console.time('le built')
for (let j = 0; j < tests.length; j++) {
  for (let i = 0; i < 1e5; i++) {
    built[j](tests[j][1])
  }
}
console.timeEnd('le built')
async function run () {
  const built2 = await Promise.all(
    other.map((i) => {
      return y.build(i[0])
    })
  )
  console.time('le async built')
  for (let j = 0; j < tests.length; j++) {
    for (let i = 0; i < 1e5; i++) {
      await built2[j](tests[j][1])
    }
  }
  console.timeEnd('le async built')
}
run()
