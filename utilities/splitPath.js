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

const chars = ['~', '/', '.']

/**
 * Splits a path string into an array of parts.
 *
 *
 * @param {string} str
 * @param {string} separator
 * @returns {string[]}
 */
export function splitPath (str) {
  const parts = []
  let current = ''

  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    if (char === '~') {
      if (str[i + 1] === '0' || str[i + 1] === '1' || str[i + 1] === '2') {
        current += chars[+str[i + 1]]
        i++
      } else if (str[i + 1] === '~') {
        current += '~'
        i++
        // The following else might be something tweaked in a spec.
      } else throw new Error('Invalid escape sequence')
    } else if (char === '.' || char === '/') {
      if (i) parts.push(current)
      current = ''
    } else current += char
  }

  // The if prevents me from pushing more sections than characters
  // This is so that "." will [''] and not ['','']
  // But .h will be ['','.h']
  // .. becomes ['',''], ..h becomes ['', '', 'h']
  if (parts.length !== str.length) parts.push(current)
  return parts
}
