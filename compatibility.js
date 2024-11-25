import defaultMethods from './defaultMethods.js'
const oldAll = defaultMethods.all

const all = {
  method: (args, context, above, engine) => {
    if (Array.isArray(args)) {
      const first = engine.run(args[0], context, above)
      if (Array.isArray(first) && first.length === 0) return false
    }
    return oldAll.method(args, context, above, engine)
  },
  asyncMethod: async (args, context, above, engine) => {
    if (Array.isArray(args)) {
      const first = await engine.run(args[0], context, above)
      if (Array.isArray(first) && first.length === 0) return false
    }
    return oldAll.asyncMethod(args, context, above, engine)
  },
  deterministic: oldAll.deterministic,
  traverse: oldAll.traverse
}

function truthy (value) {
  if (Array.isArray(value) && value.length === 0) return false
  return value
}

export function applyPatches (engine) {
  engine.methods.all = all
  engine.truthy = truthy
}
