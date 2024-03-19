
import { LogicEngine, AsyncLogicEngine } from './index.js'

class DataEngine extends LogicEngine {
  isData (logic, firstKey) {
    if (Object.keys(logic).length > 1) return true
    return !(firstKey in logic)
  }
}

class AsyncDataEngine extends AsyncLogicEngine {
  isData (logic, firstKey) {
    if (Object.keys(logic).length > 1) return true
    return !(firstKey in logic)
  }
}

const engine = new DataEngine()
const asyncEngine = new AsyncDataEngine()

describe('Custom Engines (isData)', () => {
  const logic = {
    get: [{
      xs: 10,
      s: 20,
      m: 30
    }, {
      var: 'size'
    }]
  }

  const data = {
    size: 's'
  }

  it('Should let us override how data is detected (sync)', () => {
    const f = engine.build(logic)
    expect(f(data)).toEqual(20)
  })

  it('Should let us override how data is detected (async)', async () => {
    const f = await asyncEngine.build(logic)
    expect(await f(data)).toEqual(20)
  })
})
