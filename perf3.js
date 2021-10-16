import { LogicEngine } from './index.js'
const x = new LogicEngine()
const f = x.build({ '<': [{ var: '' }, 10] })
console.time('Logic Built')
for (let i = 0; i < 1e6; i++) {
  f(i % 20)
}
console.timeEnd('Logic Built')
function g (n) {
  return n < 10
}
console.time('Raw Code')
for (let i = 0; i < 1e6; i++) {
  g(i % 20)
}
console.timeEnd('Raw Code')
console.log('For 1M invocations')
