// @ts-check
'use strict'

export const Sync = Symbol('_sync')
export const Override = Symbol('_override')
export const EfficientTop = Symbol('_efficientTop')
export const isSync = (x) => Boolean(typeof x !== 'function' || x[Sync])
export default {
  Sync,
  Override,
  EfficientTop,
  isSync
}
