const parsedPaths = new Map()

/**
 * Splits a path string into an array of parts; lightly memoized.
 * It will reset the entire cache after 2048 paths, this could be improved
 * by implementing an LRU cache or something, but I'm trying to keep
 * this library fairly dep free, and the code not too cumbersome.
 *
 * Memoizing the splitPath function can be seen as cheating, but I think it's likely
 * that a lot of the same paths will be used for logic, so it's a good optimization.
 *
 * @param {string} str
 * @returns {string[]}
 */
export function splitPathMemoized (str) {
  if (parsedPaths.has(str)) return parsedPaths.get(str)
  if (parsedPaths.size > 2048) parsedPaths.clear()
  const parts = splitPath(str)
  parsedPaths.set(str, parts)
  return parts
}

/**
 * Splits a path string into an array of parts.
 *
 * @example splitPath('a.b.c') // ['a', 'b', 'c']
 * @example splitPath('a\\.b.c') // ['a.b', 'c']
 * @example splitPath('a\\\\.b.c') // ['a\\', 'b', 'c']
 * @example splitPath('a\\\\\\.b.c') // ['a\\.b', 'c']
 * @example splitPath('hello') // ['hello']
 * @example splitPath('hello\\') // ['hello\\']
 * @example splitPath('hello\\\\') // ['hello\\']
 *
 * @param {string} str
 * @param {string} separator
 * @returns {string[]}
 */
export function splitPath (str, separator = '.', escape = '\\') {
  const parts = []
  let current = ''

  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    if (char === escape) {
      if (str[i + 1] === separator) {
        current += separator
        i++
      } else if (str[i + 1] === escape) {
        current += escape
        i++
      } else current += escape
    } else if (char === separator) {
      parts.push(current)
      current = ''
    } else current += char
  }
  parts.push(current)
  return parts
}
