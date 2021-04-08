const { Sync } = require('../constants')
module.exports = function declareSync (obj, sync = true) {
  obj[Sync] = sync
  return obj
}
