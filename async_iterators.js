'use strict'
// Note: Each of these iterators executes synchronously, and will not "run in parallel"
// I am supporting filter, reduce, some, every, map

async function filter (arr, iter) {
  const result = []

  for (const item of arr) {
    if (await iter(item)) result.push(item)
  }

  return result
}

async function some (arr, iter) {
  for (const item of arr) {
    if (await iter(item)) return true
  }
  return false
}

async function every (arr, iter) {
  for (const item of arr) {
    if (!await iter(item)) return false
  }
  return true
}

async function map (arr, iter) {
  const result = []
  for (const item of arr) {
    result.push(await iter(item))
  }
  return result
}

async function reduce (arr, iter, defaultValue) {
  if (arr.length === 0) {
    throw new Error('Array has no elements.')
  }

  const start = typeof defaultValue === 'undefined' ? 1 : 0
  let data = start ? arr[0] : defaultValue
  for (let i = start; i < arr.length; i++) {
    data = await iter(data, arr[i])
  }

  return data
}

module.exports = {
  filter,
  some,
  every,
  map,
  reduce
}
