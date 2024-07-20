import fs from 'fs'
const tests = JSON.parse(fs.readFileSync('tests.json', 'utf8'))
fs.writeFileSync('tests.json', JSON.stringify(tests, undefined, 2))
