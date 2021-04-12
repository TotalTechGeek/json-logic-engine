'use strict'
class Yield {
  constructor (data) {
    Object.assign(this, data)
  }

  logic () {
    // if (this._input && !this._logic) {
    // return { [this._name]: this._input }
    // }

    return this._logic
  }
}

module.exports = Yield
