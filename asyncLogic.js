const {
    createProxy
} = require('./proxy')

const defaultMethods = require('./defaultMethods')

class AsyncLogicEngine {
    constructor(methods = defaultMethods) {
        this.methods = methods
    }

    async parse(func, data, context, above) {
        if (this.methods[func]) {
            if (typeof this.methods[func] === "function") {
                const result = await this.methods[func](await this.run(data, context, { proxy: false, above }), context, above, this)
                return Array.isArray(result) ? createProxy(await Promise.all(result), result['../'] || above || context) : result
            }
            
            if (typeof this.methods[func] === "object") {
                const { asyncMethod, method, traverse: shouldTraverse } = this.methods[func]
                const parsedData = shouldTraverse ? await this.run(data, context, { proxy: false, above }) : data
                const result = await (asyncMethod || method)(parsedData, context, above, this)
                return Array.isArray(result) ? createProxy(await Promise.all(result), result['../'] || above || context) : result
            }
    
        }
    }

    addMethod(name, method) {
        this.methods[name] = method
    }

    async run(logic, data = {}, options = {
        proxy: true
    }) {
        if (options.proxy) {
            data = createProxy(data)
        }
        const { above } = options
        
        if (Array.isArray(logic)) {
            return Promise.all(logic.map(i => this.run(i, data, { proxy: false, above })))
        }
    
        if (logic && typeof logic === "object" && !logic['&preserve']) {
            const [func] = Object.keys(logic)
            return this.parse(func, logic[func], data, above)
        }
        
        return logic
    }
}

module.exports = AsyncLogicEngine