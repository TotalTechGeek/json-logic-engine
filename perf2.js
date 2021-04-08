const { LogicEngine } = require('./')

const x = new LogicEngine()

async function main () {
  console.time('async')

  const logic = {
    or: [{
      and: [{
        '>': [{ var: 'x' }, 10]
      }, {
        '*': [{ var: 'x' }, 50]
      }]
    }, {
      '/': [{ var: 'x' }, 10]
    }]
  }
  const f = x.build(logic)
  for (let i = 0; i < 5e5; i++) {
    f({ x: i })
  }
  console.log(f({ x: 5 }))
  console.log(f({ x: 15 }))
  console.timeEnd('async')

  console.time('sync')
  for (let i = 0; i < 5e5; i++) {
    x.run(logic, { x: i })
  }
  console.timeEnd('sync')
}

main()
