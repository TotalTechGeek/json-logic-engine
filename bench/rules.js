import jsonRulesEngine from 'json-rules-engine'
import { AsyncLogicEngine } from '../index.js'
const { Engine } = jsonRulesEngine
const engine = new Engine()
engine.addRule({
  conditions: {
    any: [
      {
        all: [
          {
            fact: 'gameDuration',
            operator: 'equal',
            value: 40
          },
          {
            fact: 'personalFoulCount',
            operator: 'greaterThanInclusive',
            value: 5
          }
        ]
      },
      {
        all: [
          {
            fact: 'gameDuration',
            operator: 'equal',
            value: 48
          },
          {
            fact: 'personalFoulCount',
            operator: 'greaterThanInclusive',
            value: 6
          }
        ]
      }
    ]
  },
  event: {
    type: 'fouledOut',
    params: {
      message: 'Player has fouled out!'
    }
  }
})
const logic = new AsyncLogicEngine()
const logicRules = {
  or: [
    {
      and: [
        {
          '===': [40, { var: 'gameDuration' }]
        },
        {
          '>=': [{ var: 'personalFoulCount' }, 5]
        }
      ]
    },
    {
      and: [
        {
          '===': [48, { var: 'gameDuration' }]
        },
        {
          '>=': [{ var: 'personalFoulCount' }, 6]
        }
      ]
    }
  ]
}
async function main () {
  const f = await logic.build(logicRules)
  const facts = {
    personalFoulCount: 6,
    gameDuration: 40
  }
  console.time('json-logic-engine')
  for (let i = 0; i < 1e6; i++) {
    await f(facts)
  }
  console.timeEnd('json-logic-engine')
  console.time('json-rules-engine')
  for (let i = 0; i < 1e6; i++) {
    await engine.run(facts)
  }
  console.timeEnd('json-rules-engine')
}
main()
