function createProxy (obj, above) {
  const proxy = new Proxy(obj, {
    set: (target, prop, receiver) => {
    },
    get: (target, prop, receiver) => {
      if (prop === '../') return above || proxy

      if (prop.indexOf && prop.indexOf('.') !== -1) {
        let cur = proxy
        let path = prop
        while (path.startsWith('../')) {
          cur = cur['../']
          path = path.substring(3)
        }

        if (!path) return cur
        const list = path.split('.')
        while (list.length) {
          const key = list.shift()
          if (key === '__proto__') throw new Error('Attempted Prototype Pollution')
          cur = typeof cur[key] === 'object' ? cur[key] && createProxy(cur[key], cur) : cur[key]
        }
        return cur
      }

      if (prop === '__proto__') throw new Error('Attempted Prototype Pollution')

      return typeof target[prop] === 'object' ? target[prop] && createProxy(target[prop], proxy) : target[prop]
    }
  })
  return proxy
}

module.exports = { createProxy }
