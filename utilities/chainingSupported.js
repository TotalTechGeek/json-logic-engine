const getIsOptionalChainingSupported = () => {
  try {
    // eslint-disable-next-line no-unused-vars
    const test = {}
    // eslint-disable-next-line no-eval
    const isUndefined = eval('test?.foo?.bar')
    if (isUndefined === undefined) {
      return true
    }
  } catch {
    return false
  }
}

module.exports = getIsOptionalChainingSupported()
