// @ts-check
'use strict'
const Yield = require('../structures/Yield')
const EngineObject = require('../structures/EngineObject')

/**
 * Checks if the item that's passed in is or contains a Yield / EngineObject (signifying a Yield)
 * @param {*} item
 * @returns {Boolean}
 */
function checkYield (item) {
  if (Array.isArray(item)) {
    return item.some(i => i instanceof Yield || i instanceof EngineObject)
  }
  return item instanceof Yield || item instanceof EngineObject
}

module.exports = checkYield
