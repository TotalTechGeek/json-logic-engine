// @ts-check
'use strict'
const mutateKey = (i) => i
const mutateValue = (i) => i
const skipCopy = (i) => false
const defaultOptions = { mutateKey, mutateValue, skipCopy }
/**
 *
 * @param {Object} obj
 * @param {Object} target
 * @param {{ mutateKey?: Function, mutateValue?: Function, skipCopy?: Function }} options
 * @returns
 */
function traverseCopy (obj, target = {}, options = defaultOptions) {
  const { mutateKey, mutateValue, skipCopy } = {
    ...defaultOptions,
    ...options
  }
  if (typeof obj === 'object' && !Array.isArray(obj) && obj) {
    if (skipCopy(obj)) return mutateValue(obj)
    Object.keys(obj).forEach((key) => {
      target[mutateKey(key)] = mutateValue(traverseCopy(obj[key], {}, options))
    })
    return target
  } else if (Array.isArray(obj)) {
    return [...obj].map((i, x) => mutateValue(traverseCopy(i, {}, options)))
  } else {
    return mutateValue(obj)
  }
}
export default traverseCopy
