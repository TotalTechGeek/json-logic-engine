// @ts-check
'use strict'

module.exports = {
  Sync: Symbol('_sync'),
  Override: Symbol('_override'),
  EfficientTop: Symbol('_efficientTop'),
  isSync: x => Boolean(typeof x !== 'function' || x[module.exports.Sync])
}
