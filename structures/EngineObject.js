// @ts-check
'use strict'

import traverseCopy from '../utilities/traverseCopy.js'
import YieldStructure from './Yield.js'

function fetchYields (obj, arr = []) {
  if (obj instanceof YieldStructure) {
    arr.push(obj)
    return arr
  }
  if (Array.isArray(obj)) {
    obj.forEach((i) => fetchYields(i, arr))
  } else if (typeof obj === 'object') {
    Object.keys(obj || {}).forEach((key) => {
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
    return traverseCopy(
      this.data.result,
      {},
      {
        mutateValue: (i) => {
          if (i instanceof YieldStructure) {
            return i.logic()
          }
          return i
        },
        skipCopy: (i) => i instanceof YieldStructure
      }
    )
  }
}
export default EngineObject
