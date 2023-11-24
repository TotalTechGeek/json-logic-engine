
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
