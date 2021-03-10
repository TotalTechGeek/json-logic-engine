const Yield = require('./Yield')
const EngineObject = require('./EngineObject')

// works fine for arrays, may need to create a more general version though
class ReduceIterator {
  constructor (arr, cur, next) {
    this.arr = arr
    this.cur = cur
    this.nextCall = next
  }

  next () {
    const item = this.arr[0]
    this._arr = [...this.arr]
    const cur = this.nextCall(this.cur, item, this._arr, this)
    console.log(cur)
    if (cur instanceof Yield || cur instanceof EngineObject) {
      return cur
    }

    // commit
    this.arr = this._arr
    delete this._arr

    this.cur = cur
    this.arr.shift()
    return this.cur
  }

  skip () {
    this._arr.shift()
  }

  dump () {
    this._arr = []
  }

  result () {
    return this.cur
  }

  state () {
    return { arr: this.arr, cur: this.cur }
  }

  done () {
    return !this.arr.length
  }
}

class AsyncReduceIterator extends ReduceIterator {
  async next () {
    const item = this.arr[0]
    this._arr = [...this.arr]
    const cur = await this.nextCall(this.cur, item, this.arr, this)

    if (cur instanceof Yield || cur instanceof EngineObject) {
      return cur
    }

    // commit
    this.arr = this._arr
    delete this._arr

    this.cur = cur
    this.arr.shift()
    return this.cur
  }
}

module.exports = { AsyncReduceIterator, ReduceIterator }
