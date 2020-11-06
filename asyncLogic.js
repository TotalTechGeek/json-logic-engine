const {
    createProxy
} = require('./proxy')

const defaultMethods = require('./defaultMethods')

class AsyncLogicEngine {
    constructor(methods = defaultMethods) {
        this.methods = methods
    }

    async evaluate(func, data, context, above) {
        if (this.methods[func]) {
            if (typeof this.methods[func] === "function") {
                const result = await this.methods[func](await this.traverse(data, context, { proxy: false, above }), context, above, this)
                return Array.isArray(result) ? Promise.all(result) : result
            }
            
            if (typeof this.methods[func] === "object") {
                const { method, traverse: shouldTraverse } = this.methods[func]
                const parsedData = shouldTraverse ? await this.traverse(data, context, { proxy: false, above }) : data
                const result = await method(parsedData, context, above, this)
                return Array.isArray(result) ? Promise.all(result) : result
            }
    
        }
    }

    addMethod(name, method) {
        this.methods[name] = method
        console.log(name, method)
    }

    async traverse(logic, data = {}, options = {
        proxy: true
    }) {
        if (options.proxy) {
            data = createProxy(data)
        }
        const { above } = options
        
        if (Array.isArray(logic)) {
            return Promise.all(logic.map(i => this.traverse(i, data, { proxy: false, above })))
        }
    
        if (logic && typeof logic === "object" && !logic['&preserve']) {
            const [func] = Object.keys(logic)
            return this.evaluate(func, logic[func], data, above)
        }
        
        return logic
    }
}

module.exports = AsyncLogicEngine