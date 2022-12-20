// @ts-check
'use strict'

import YieldStructure from './Yield.js'
import EngineObject from './EngineObject.js'

// works fine for arrays, may need to create a more general version though
class ReduceIterator {
  constructor (arr, cur, next) {
    this.arr = arr
    this.cur = cur
    this.nextCall = next
    this.position = 0
    this._position = 0
    this.map = null
  }

  next () {
    const item = this.arr[this.position]
    this._position = this.position
    const cur = this.nextCall(this.cur, item, this.arr, this)
    if (cur instanceof YieldStructure || cur instanceof EngineObject) {
      return cur
    }
    // commit
    this.position = this._position
    this.cur = cur
    this.position++
    return this.cur
  }

  skip () {
    this._position++
  }

  dump () {
    this._position = this.arr.length
  }

  result () {
    return this.cur
  }

  state () {
    return { arr: this.arr.splice(this.position), cur: this.cur }
  }

  done () {
    return this.position >= this.arr.length
  }
}
class AsyncReduceIterator extends ReduceIterator {
  async next () {
    const item = this.arr[this.position]
    this._position = this.position
    const cur = await this.nextCall(this.cur, item, this.arr, this)
    if (cur instanceof YieldStructure || cur instanceof EngineObject) {
      return cur
    }
    // commit
    this.position = this._position
    this.cur = cur
    this.position++
    return this.cur
  }
}
export { AsyncReduceIterator }
export { ReduceIterator }
export default {
  AsyncReduceIterator,
  ReduceIterator
}
