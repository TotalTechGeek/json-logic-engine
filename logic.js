const {
    createProxy
} = require('./proxy')

const defaultMethods = require('./defaultMethods')

class LogicEngine {
    constructor(methods = defaultMethods) {
        this.methods = methods
    }

    parse(func, data, context, above) {
        if (this.methods[func]) {
            if (typeof this.methods[func] === "function") {
                return this.methods[func](this.run(data, context, { proxy: false, above }), context, above, this)
            }
            
            if (typeof this.methods[func] === "object") {
                const { method, traverse: shouldTraverse } = this.methods[func]
                const parsedData = shouldTraverse ? this.run(data, context, { proxy: false, above }) : data
                return method(parsedData, context, above, this)
            }
    
        }
    }

    addMethod(name, method) {
        this.methods[name] = method
    }

    run(logic, data = {}, options = {
        proxy: true
    }) {
        if (options.proxy) {
            data = createProxy(data)
        }
        const { above } = options
        
        if (Array.isArray(logic)) {
            return logic.map(i => this.run(i, data, { proxy: false, above }))
        }
    
        if (logic && typeof logic === "object" && !logic['&preserve']) {
            const [func] = Object.keys(logic)
            return this.parse(func, logic[func], data, above)
        }
        
        return logic
    }
}

module.exports = LogicEngine
