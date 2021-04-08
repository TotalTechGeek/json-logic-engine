const { LogicEngine, AsyncLogicEngine } = require('../index')
const fs = require('fs')

const x = new LogicEngine()
const y = new AsyncLogicEngine()
const compatible = []
const incompatible = []

JSON.parse(fs.readFileSync('./tests.json').toString()).forEach(test => {
  if (typeof test === 'string') {
    // console.log(test)
  } else {
    try {
      if (x.run(test[0], test[1]) !== test[2]) {
        incompatible.push(test)
      } else {
        compatible.push(test)
      }
    } catch (err) {
    //   console.log(test[0])
      incompatible.push(test)
    }
  }
})

// console.log(compatible.length, incompatible.length)

const tests = [
  [
    { '+': [1, 2, 3, 4, 5] },
    {}
  ],
  [
    // mapYield is faster than map at smaller sizes, will probably get the engine to acknowledge this.
    { mapYield: [[1, 2, 3, 4, 5], { '+': [{ var: '' }, 1] }] },
    {},
    { map: [[1, 2, 3, 4, 5], { '+': [{ var: '' }, 1] }] }
  ],
  [
    { concat: ['Test of a ', { var: 'x' }] },
    { x: 'Program' },
    { cat: ['Test of a  ', { var: 'x' }] }
  ],
  [
    { '>': [{ var: 'x' }, 10] },
    {
      x: 7
    }
  ]
]

const built = tests.map(i => {
  return x.build(i[0])
})
const built2 = tests.map(i => {
  return y.build(i[0])
})

console.time('le interpreted')
for (let i = 0; i < 1e6; i++) {
  for (let j = 0; j < tests.length; j++) {
    x.run(tests[j][0], tests[j][1])
  }
}
console.timeEnd('le interpreted')

console.time('le built')
for (let i = 0; i < 1e6; i++) {
  for (let j = 0; j < tests.length; j++) {
    built[j](tests[j][1])
  }
}
console.timeEnd('le built')

const jl = require('json-logic-js')

console.time('json-logic-js')
for (let i = 0; i < 1e6; i++) {
  for (let j = 0; j < tests.length; j++) {
    jl.apply(tests[j][2] || tests[j][0], tests[j][1])
  }
}
console.timeEnd('json-logic-js')

async function run () {
  console.time('le async built')
  for (let i = 0; i < 1e6; i++) {
    for (let j = 0; j < tests.length; j++) {
      await built2[j](tests[j][1])
    }
  }
  console.timeEnd('le async built')
}

run()
