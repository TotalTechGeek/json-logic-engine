const { LogicEngine, AsyncLogicEngine } = require(".")

const logic = new AsyncLogicEngine()

async function test () {
    console.time('Simple adding')
    for(let i = 0; i < 10e3; i++) {
        await logic.run({
            '+': [1,{ '+': [1, {'+': [1,2,3,4,5]}] },3]
        })
    }
    console.timeEnd('Simple adding')    
}

test()
