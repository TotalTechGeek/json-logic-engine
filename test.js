
const { LogicEngine } = require('./index')
const logic = new LogicEngine()

logic.run({
    '+': [1,2,3,4,5]
}) //?


logic.run({
    '+': [{ var: 'a' }, 11]
}, {
    a: 17
}) //?


logic.run({
    '+': [{ var: 'a.b.c' }, 5]
}, {
    a: { b: { c: 7 }}
}) //?


logic.run({
    'reduce': [{ var: 'x' }, { '+': [{var: 'current'}, {var: 'accumulator'}, {var: '../../b'}] }, { var: 'b' }]
}, {
    'x': [1,2,3,4,5],
    b: 1
}) //?

logic.run({
    'some': [[1, 2, 3], { '<': [{var: ''}, 0] }]
})  //?

logic.run({
    'map': [{var : 'x'}, { '+': [{ var: 'a' }, 1] }]
},
{
    'x': [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }]
}) //?

logic.run({
    max: [200, {
        '*': [12, {var: 'a' }]
    }]
}, {
    a: 16
}) //?

logic.run({
    'map': [{var : 'x'}, { '+': [{ var: 'a' }, { var: '../../adder'}] }]
},
{
    'x': [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }],
    'adder':  7
}) //?