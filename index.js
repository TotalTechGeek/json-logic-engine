// @ts-check
'use strict'

import LogicEngine from './logic.js'
import AsyncLogicEngine from './asyncLogic.js'
import Compiler from './compiler.js'
import Constants from './constants.js'
import defaultMethods from './defaultMethods.js'
import { asLogicSync, asLogicAsync } from './asLogic.js'
import { splitPath } from './utilities/splitPath.js'

export { splitPath }
export { LogicEngine }
export { AsyncLogicEngine }
export { Compiler }
export { Constants }
export { defaultMethods }
export { asLogicSync }
export { asLogicAsync }

export default { LogicEngine, AsyncLogicEngine, Compiler, Constants, defaultMethods, asLogicSync, asLogicAsync, splitPath }
