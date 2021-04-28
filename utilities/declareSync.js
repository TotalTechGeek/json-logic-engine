// @ts-check
'use strict'
const { Sync } = require('../constants')

/**
 * Declares a function synchronous for the compiler.
 * @param {Object | Function} obj
 * @param {Boolean} sync
 * @returns
 */
module.exports = function declareSync (obj, sync = true) {
  obj[Sync] = sync
  return obj
}
