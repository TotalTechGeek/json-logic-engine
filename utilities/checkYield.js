'use strict'
const Yield = require('../structures/Yield')
const EngineObject = require('../structures/EngineObject')

function checkYield (item) {
  if (Array.isArray(item)) {
    return item.some(i => i instanceof Yield || i instanceof EngineObject)
  }
  return item instanceof Yield || item instanceof EngineObject
}

module.exports = checkYield
