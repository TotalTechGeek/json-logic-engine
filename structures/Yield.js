// @ts-check
'use strict'
/**
 * A class that handles the Yielding logic & helps generate replacement logic.
 */
class YieldStructure {
  constructor (data) {
    this._logic = null
    this.resumable = null
    this._input = null
    Object.assign(this, data)
  }

  logic () {
    // if (this._input && !this._logic) {
    // return { [this._name]: this._input }
    // }
    return this._logic
  }
}
export default YieldStructure
