const counts = new WeakMap()

/**
 * Counts the number of arguments a function has; paying attention to the function's signature
 * to avoid edge cases.
 * This is used to allow for compiler optimizations.
 * @param {(...args: any[]) => any} fn
 * @returns {number}
 */
export function countArguments (fn) {
  if (!fn || typeof fn !== 'function' || !fn.length) return 0
  if (!counts.has(fn)) counts.set(fn, _countArguments(fn))
  return counts.get(fn)
}

/**
 * Counts the number of arguments a function has; paying attention to the function's signature.
 * This is the internal implementation that does not use a WeakMap.
 * @param {(...args: any[]) => any} fn
 * @returns {number}
 */
function _countArguments (fn) {
  if (!fn || typeof fn !== 'function' || !fn.length) return 0
  let fnStr = fn.toString()
  if (fnStr[0] !== '(' && fnStr[0] !== 'f') return 0
  fnStr = fnStr.substring(fnStr.indexOf('('), fnStr.indexOf('{')).replace(/=>/g, '')

  // regex to check for "..." or "="
  const regex = /\.{3}|=/
  if (regex.test(fnStr)) return 0
  return fn.length
}
