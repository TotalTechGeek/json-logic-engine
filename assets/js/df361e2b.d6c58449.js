(window.webpackJsonp=window.webpackJsonp||[]).push([[16],{62:function(e,n,t){"use strict";t.r(n),t.d(n,"frontMatter",(function(){return r})),t.d(n,"metadata",(function(){return l})),t.d(n,"toc",(function(){return c})),t.d(n,"default",(function(){return u}));var o=t(3),a=t(7),i=(t(0),t(69)),r={id:"doc2",title:"Blazing Fast via Compilation"},l={unversionedId:"doc2",id:"doc2",isDocsHomePage:!1,title:"Blazing Fast via Compilation",description:"Blazing Fast Performance with Compilation",source:"@site/docs/doc2.md",sourceDirName:".",slug:"/doc2",permalink:"/json-logic-engine/docs/doc2",editUrl:"https://github.com/TotalTechGeek/json-logic-engine-documentation/edit/master/website/docs/doc2.md",version:"current",frontMatter:{id:"doc2",title:"Blazing Fast via Compilation"},sidebar:"someSidebar",previous:{title:"Asynchronous Engine",permalink:"/json-logic-engine/docs/async"},next:{title:"Differences from json-logic-js",permalink:"/json-logic-engine/docs/doc3"}},c=[{value:"Blazing Fast Performance with Compilation",id:"blazing-fast-performance-with-compilation",children:[]}],s={toc:c};function u(e){var n=e.components,t=Object(a.a)(e,["components"]);return Object(i.b)("wrapper",Object(o.a)({},s,t,{components:n,mdxType:"MDXLayout"}),Object(i.b)("h2",{id:"blazing-fast-performance-with-compilation"},"Blazing Fast Performance with Compilation"),Object(i.b)("p",null,Object(i.b)("inlineCode",{parentName:"p"},"json-logic-engine")," has support for logic-compilation which greatly enhances run-time performance of your logic. In a number of (simpler) cases, it can get rather close to native performance. "),Object(i.b)("br",null),Object(i.b)("p",null,"Running many iterations of ",Object(i.b)("inlineCode",{parentName:"p"},"json-logic-js"),"'s test suite, we can observe stark performance differences between the built versions of the logic-engine against ",Object(i.b)("inlineCode",{parentName:"p"},"json-logic-js"),". Some of the additional features of the engine do seem to cause the interpreted version of the engine to perform slightly slower. ",Object(i.b)("br",null),Object(i.b)("br",null)),Object(i.b)("pre",null,Object(i.b)("code",{parentName:"pre"},"> node test.js\njson-logic-js: 10.872s\nle interpreted: 13.291s\nle built: 1.695s\nle async built: 4.171s\n")),Object(i.b)("br",null),Object(i.b)("p",null,"This comparison is not fair though, as the compilation mechanism is able to evaluate whether a particular branch is deterministic & pre-compute portions of the logic in advance. Running a modified test suite that can't be pre-computed unfairly yields this alternative set of results:"),Object(i.b)("pre",null,Object(i.b)("code",{parentName:"pre"},"> node test.js\njson-logic-js: 741.06ms\nle interpreted: 858.67ms\nle built: 22.686ms\nle async built: 75.483ms\n")),Object(i.b)("br",null),Object(i.b)("p",null,"Additionally, the compilation mechanism allows the asynchronous version of the engine to perform quite well against its interpreted counter-part."),Object(i.b)("pre",null,Object(i.b)("code",{parentName:"pre"},"> node perf.js & node perf2.js\ninterpreted: 23.365s\nbuilt: 185.105ms\n")),Object(i.b)("hr",null),Object(i.b)("p",null,"Comparing the engine against an alternative library like ",Object(i.b)("inlineCode",{parentName:"p"},"json-rules-engine"),", "),Object(i.b)("pre",null,Object(i.b)("code",{parentName:"pre",className:"language-js"},"{\n  any: [{\n    all: [{\n      fact: 'gameDuration',\n      operator: 'equal',\n      value: 40\n    }, {\n      fact: 'personalFoulCount',\n      operator: 'greaterThanInclusive',\n      value: 5\n    }]\n  }, {\n    all: [{\n      fact: 'gameDuration',\n      operator: 'equal',\n      value: 48\n    }, {\n      fact: 'personalFoulCount',\n      operator: 'greaterThanInclusive',\n      value: 6\n    }]\n  }]\n}\n")),Object(i.b)("p",null,"vs "),Object(i.b)("pre",null,Object(i.b)("code",{parentName:"pre",className:"language-js"},"{\n  or: [\n    {\n      and: [{\n        '===': [40, { var: 'gameDuration' }]\n      }, {\n        '>=': [{ var: 'personalFoulCount' }, 5]\n      }]\n    },\n    {\n      and: [{\n        '===': [48, { var: 'gameDuration' }]\n      }, {\n        '>=': [{ var: 'personalFoulCount' }, 6]\n      }]\n    }\n  ]\n}\n")),Object(i.b)("p",null,"The performance difference is staggering: "),Object(i.b)("pre",null,Object(i.b)("code",{parentName:"pre"},"> node rules.js\njson-logic-engine: 83.782ms\njson-rules-engine: 39.928s\n")),Object(i.b)("hr",null),Object(i.b)("p",null,"To use this feature, you merely have to call:"),Object(i.b)("pre",null,Object(i.b)("code",{parentName:"pre",className:"language-js"},"const func = engine.build(logic)\n")),Object(i.b)("p",null,"And invoke ",Object(i.b)("inlineCode",{parentName:"p"},"func")," with the data you'd like to run it with."))}u.isMDXComponent=!0}}]);