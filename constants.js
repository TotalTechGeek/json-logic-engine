// @ts-check
'use strict'

export const Sync = Symbol.for('json_logic_sync')
export const Override = Symbol.for('json_logic_override')
export const EfficientTop = Symbol.for('json_logic_efficientTop')
export const isSync = (x) => Boolean(typeof x !== 'function' || x[Sync])
export default {
  Sync,
  Override,
  EfficientTop,
  isSync
}
