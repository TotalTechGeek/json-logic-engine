// @ts-check
'use strict'

import { Sync } from '../constants.js'
export default function declareSync (obj, sync = true) {
  obj[Sync] = sync
  return obj
}
