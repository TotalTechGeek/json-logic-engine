// @ts-check
'use strict'
export default (function omitUndefined (obj) {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === undefined) {
      delete obj[key]
    }
  })
  return obj
})
