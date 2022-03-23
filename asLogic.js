import LogicEngine from './logic.js'
import AsyncLogicEngine from './asyncLogic.js'

/**
 * @param {string[]} keep
 * @param {{ [key:string]: any }} obj
 */
function pick (keep, obj) {
  return Object.keys(obj).reduce((acc, i) => {
    if (keep.includes(i)) acc[i] = obj[i]
    return acc
  }, {})
}

/**
 * Takes functions and makes it possible to use them in a locked-down json-logic document.
 * @param {{ [key: string]: (...args: any[]) => any }} functions Functions to import into the engine.
 * @param {string[]} keep Methods to keep from the original logic engine
 * @returns {(...args: any[]) => (...args: any[]) => any}
 */
export function asLogicSync (functions, keep = ['var'], engine = new LogicEngine()) {
  engine.methods = pick(keep, engine.methods)
  engine.addMethod('list', i => [].concat(i))
  Object.keys(functions).forEach(i => engine.addMethod(i, data => Array.isArray(data) ? functions[i](...data) : functions[i](data === null ? undefined : data)))
  return engine.build.bind(engine)
}

/**
 * Takes functions and makes it possible to use them in a locked-down json-logic document.
 * If performance becomes a problem, you may wish to optimize by creating a "new AsyncLogicEngine" yourself,
 * and adding the methods you're using as sync / async respectively. .addMethod(name, func, { sync: true })
 * This is meant to be a simple adapter.
 *
 * @param {{ [key: string]: (...args: any[]) => any }} functions
 * @param {string[]} keep
 * @returns {(...args: any[]) => Promise<(...args: any[]) => Promise<any>>}
 */
export function asLogicAsync (functions, keep = ['var']) {
  return asLogicSync(functions, keep, new AsyncLogicEngine())
}
