
import { LogicEngine } from './index.js'

const optimized = new LogicEngine()
const unoptimized = new LogicEngine(undefined, { disableInterpretedOptimization: true })

const dynamicRule = { '+': [1, 2, 3, { var: 'a' }] }
const staticRule = { '+': [1, 2, 3, 4] }

console.time('Optimized, Same Object, Dynamic')
for (let i = 0; i < 1e6; i++) {
  optimized.run(dynamicRule, { a: i })
}
console.timeEnd('Optimized, Same Object, Dynamic')

console.time('Optimized, Same Object, Static')
for (let i = 0; i < 1e6; i++) {
  optimized.run(staticRule)
}
console.timeEnd('Optimized, Same Object, Static')

console.time('Unoptimized, Same Object, Dynamic')
for (let i = 0; i < 1e6; i++) {
  unoptimized.run(dynamicRule, { a: i })
}
console.timeEnd('Unoptimized, Same Object, Dynamic')

console.time('Unoptimized, Same Object, Static')
for (let i = 0; i < 1e6; i++) {
  unoptimized.run(staticRule)
}
console.timeEnd('Unoptimized, Same Object, Static')

console.log('----')

global.gc()

console.time('Optimized, Different Object, Dynamic')
for (let i = 0; i < 1e6; i++) {
  optimized.run({ '+': [1, 2, 3, { var: 'a' }] }, { a: i })
}
console.timeEnd('Optimized, Different Object, Dynamic')

optimized.disableInterpretedOptimization = false

console.time('Optimized, Different Object, Static')
for (let i = 0; i < 1e6; i++) {
  optimized.run({ '+': [1, 2, 3, 4] })
}
console.timeEnd('Optimized, Different Object, Static')

console.time('Unoptimized, Different Object, Dynamic')
for (let i = 0; i < 1e6; i++) {
  unoptimized.run({ '+': [1, 2, 3, { var: 'a' }] }, { a: i })
}
console.timeEnd('Unoptimized, Different Object, Dynamic')

console.time('Unoptimized, Different Object, Static')
for (let i = 0; i < 1e6; i++) {
  unoptimized.run({ '+': [1, 2, 3, 4] })
}
console.timeEnd('Unoptimized, Different Object, Static')
