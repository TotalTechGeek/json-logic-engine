import { Sync } from "../constants.js";
// @ts-check
'use strict';
export default (function declareSync(obj, sync = true) {
    obj[Sync] = sync;
    return obj;
});
