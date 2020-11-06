const { createProxy } = require('./proxy')

const defaultMethods = {
    '+': data => data.reduce((a, b) => a + b, 0),
    '*': data => data.reduce((a, b) => a * b),
    '/': data => data.reduce((a, b) => a / b),
    '-': data => data.reduce((a, b) => a - b),
    '%': data => data.reduce((a, b) => a % b),
    'max': data => Math.max(...data),
    'min': data => Math.min(...data),
    'in': ([item, array]) => array.includes(item), 
    '>': ([a, b]) => a > b,
    '<': ([a, b]) => a < b,
    'preserve': {
        traverse: false,
        method: i => i
    },
    'if': { 
        method: ([check, onTrue, onFalse], context, above, engine) => {
            const test = engine.run(check, context, { proxy: false, above })
            return engine.run(test ? onTrue : onFalse, context, { proxy: false, above })
        },
        traverse: false
    },
    '<=': ([a, b]) => a <= b,
    '>=': ([a, b]) => a >= b,
    '==': ([a, b]) => a == b,
    '===': ([a, b]) => a === b,
    '!=': ([a, b]) => a != b,
    '!==': ([a, b]) => a !== b,
    'xor': ([a, b]) => a ^ b,
    'or': ([a, b]) => a || b,
    'and': ([a, b]) => a && b,
    'substr': ([string, from, end]) => {
        if (end <= 0) {
            end = string.length - from + end
        }
        return string.substr(from, end)
    },
    'var': (key, context, above, engine) => {
        if(!key) return context
        if(typeof context !== "object" && key.startsWith('../')) {
            return engine.methods.var(key.substring(3), above)
        }
        return context[key]
    }, 
    'missing': (checked, context, above, engine) => {
        return checked.filter(key => {
            if(!key) return context
            if(typeof context !== "object" && key.startsWith('../')) {
                return engine.methods.missing(key.substring(3), above)
            }
            return typeof context[key] === "undefined"
        })
    }, 
    'map': createArrayIterativeMethod('map'),
    'some': createArrayIterativeMethod('some'),
    'merge': arrays => arrays.flat(),
    'every': createArrayIterativeMethod('every'),
    'filter': createArrayIterativeMethod('filter'),
    'reduce': {
        method: ([selector, mapper, defaultValue], context, above, engine) => {
            defaultValue = engine.run(defaultValue, context, { proxy: false, above }) 
            selector = engine.run(selector, context, { proxy: false, above }) 
            return selector.reduce((accumulator, current) => {
                return engine.run(mapper, createProxy({ accumulator, current }, selector), { proxy: false, above: selector })
            }, defaultValue)
        },
        traverse: false
    },
    'not': value => !value,
    '!': value => !value,
    '!!': value => Boolean(value)
}


function createArrayIterativeMethod(name) {
    return {
        method: ([selector, mapper], context, above, engine) => {
            selector = engine.run(selector, context, { proxy: false, above }) 
            return selector[name](i => {
                return engine.run(mapper, i, { proxy: false, above: selector })
            })
        },
        traverse: false
    }
}

module.exports = defaultMethods