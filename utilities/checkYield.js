// @ts-check
'use strict'

import YieldStructure from '../structures/Yield.js'
import EngineObject from '../structures/EngineObject.js'

/**
 * Checks if the item that's passed in is or contains a YieldStructure / EngineObject (signifying a YieldStructure)
 * @param {*} item
 * @returns {Boolean}
 */
function checkYield (item) {
  if (Array.isArray(item)) {
    return item.some((i) => i instanceof YieldStructure || i instanceof EngineObject)
  }
  return item instanceof YieldStructure || item instanceof EngineObject
}
export default checkYield
