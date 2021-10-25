// @ts-check
'use strict'

function timeout (n) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, n)
  })
}

function asyncPool ({
  free = [],
  max = 10,
  created = free.length,
  create = () => {}
} = {}) {
  const pool = async function () {
    if (free.length) {
      const func = free.pop()
      const promise = func(...arguments)
      // return the stateful function
      promise
        .then(() => {
          free.push(func)
        })
        .catch(() => {
          free.push(func)
        })
      return promise
    } else {
      if (created < max) {
        created++
        free.push(await create())
      }
      while (!free.length) {
        await timeout(250)
      }
      return pool(...arguments)
    }
  }
  return pool
}

export default asyncPool
