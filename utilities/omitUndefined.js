// @ts-check
'use strict'
module.exports = function omitUndefined (obj) {
  Object.keys(obj).forEach(key => {
    if (obj[key] === undefined) { delete obj[key] }
  })
  return obj
}
