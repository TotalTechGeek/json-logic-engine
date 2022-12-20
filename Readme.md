# JSON Logic Engine

[![JavaScript Style Guide](https://cdn.rawgit.com/standard/standard/master/badge.svg)](https://github.com/standard/standard)

[![npm version](https://badge.fury.io/js/json-logic-engine.svg)](https://badge.fury.io/js/json-logic-engine) [![Coverage Status](https://coveralls.io/repos/github/TotalTechGeek/json-logic-engine/badge.svg?branch=master)](https://coveralls.io/github/TotalTechGeek/json-logic-engine?branch=master) [![Build Status](https://travis-ci.com/TotalTechGeek/json-logic-engine.svg?branch=master)](https://travis-ci.com/TotalTechGeek/json-logic-engine)


![Logo](https://raw.githubusercontent.com/gist/TotalTechGeek/22d699b6d7cb0f7fa1c37fdb0c427e60/raw/63bd743ce7720b7337ac30ae09cbb1b8e12f3a5b/json-logic-engine.svg)


### Fast, Powerful, and Persistable Logic

Have you ever needed the ability to write a custom set of logic or set of rules for a particular customer? Or needed to be able to configure a piece of logic on the fly? 
 
JSON Logic might be your solution! Designed with a lisp-like syntax, JSON Logic makes it easy to write safe instructions that can be persisted into a database, and shared between the front-end and back-end.

Check out our [Documentation Here](https://jessemitchell.me/json-logic-engine).


The engine supports both synchronous & asynchronous operations, and can use function compilation to keep your logic performant at scale.

Examples:

The premise is the logic engine traverses the document you pass in, and each "object" is interpreted as an instruction for the engine to run.

```js
logic.run({
    '+': [1,2,3,4,5]
}) // 15
```

If you wanted to start factoring variables, you can pass a data object into it, and reference them using the "var" instruction:

```js
logic.run({
    '+': [11, { var: 'a' }]
}, {
    'a': 17
}) // 28
```

The engine will also allow you to reference variables that are several layers deep:

```js
logic.run({
    '+': [{ var: 'a.b.c' }, 5]
}, {
    a: { b: { c: 7 } }
}) // 12
```

Let's explore some slightly more complex logic:

```js
logic.run({
    'reduce': [{ var: 'x' }, { '+': [{ var: 'current' }, { var: 'accumulator' }] }, 0]
}, {
    'x': [1,2,3,4,5]
}) // 15
```

In this example, we run the reduce operation on a variable called "x", and we set up instructions to add the "current" value to the "accumulator", which we have set to 0.

Similarly, you can also do `map` operations:

```js
logic.run({
    'map': [[1,2,3,4,5], { '+': [{ var: '' }, 1] }]
}) // [2,3,4,5,6]
```

If `var` is left as an empty string, it will assume you're referring to the whole variable that is accessible at the current layer it is looking at.

Example of a map accessing variables of the objects in the array:

```js
logic.run({
    'map': [{var : 'x'}, { '+': [{ var: 'a' }, 1] }]
},
{
    'x': [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }]
}) // [2,3,4,5]
```

You can easily nest different operations in each other, like so:

```js
logic.run({
    max: [200, {
        '*': [12, {var: 'a' }]
    }]
}, {
    a: 16
}) // 200
```

The engine also supports Handlebars-esque style traversal of data when you use the iterative control structures.

For example:

```js
logic.run({
    'map': [{var : 'x'}, { '+': [{ var: 'a' }, { var: '../../adder'}] }]
},
{
    'x': [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }],
    'adder':  7
}) // [8, 9, 10, 11]
```
--- 


This library was developed to be (for the most part) a drop-in replacement for the popular npm module [`json-logic-js`](https://github.com/jwadhams/json-logic-js).

The intention of the library is to keep the functionality very similar to the original, while adding a few useful utilities.

