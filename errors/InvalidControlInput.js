// @ts-check
'use strict'
export default class InvalidControlInput extends Error {
  constructor (input) {
    super()
    this.message =
      'Built-in control structures are not allowed to receive dynamic inputs, this could allow a lesser version of remote-code execution.'
    this.input = input
  }
}
