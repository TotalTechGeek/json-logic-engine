const traverseCopy = require('../utilities/traverseCopy')
const Yield = require('./Yield')

function fetchYields (obj, arr = []) {
  if (obj instanceof Yield) {
    arr.push(obj)
    return arr
  }

  if (Array.isArray(obj)) {
    obj.forEach(i => fetchYields(i, arr))
  } else if (typeof obj === 'object') {
    Object.keys(obj).forEach(key => {
      fetchYields(obj[key], arr)
    })
  }
  return arr
}

class EngineObject {
  constructor (data) {
    this.data = data
  }

  yields () {
    return fetchYields(this.data.result, [])
  }

  logic () {
    return traverseCopy(this.data.result, {}, {
      mutateValue: i => {
        if (i instanceof Yield) {
          return i.logic
        }
        return i
      },
      skipCopy: i => i instanceof Yield
    })
  }
}

module.exports = EngineObject
