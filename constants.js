// @ts-check
'use strict'

export const Sync = Symbol.for('json_logic_sync')
export const Override = Symbol.for('json_logic_override')
export const EfficientTop = Symbol.for('json_logic_efficientTop')

/**
 * Checks if an item is synchronous.
 * This allows us to optimize the logic a bit
 * further so that we don't need to await everything.
 *
 * @param {*} item
 * @returns {Boolean}
 */
export function isSync (item) {
  if (typeof item === 'function') return item[Sync] === true
  if (Array.isArray(item)) return item.every(isSync)
  return true
}

export default {
  Sync,
  Override,
  EfficientTop,
  isSync
}
