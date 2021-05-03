(window.webpackJsonp=window.webpackJsonp||[]).push([[14],{59:function(e,t,a){"use strict";a.r(t),a.d(t,"frontMatter",(function(){return o})),a.d(t,"metadata",(function(){return c})),a.d(t,"toc",(function(){return b})),a.d(t,"default",(function(){return u}));var r=a(3),n=a(7),i=(a(0),a(69)),l=a(73),o={id:"higher",title:"Higher Order Operators"},c={unversionedId:"higher",id:"higher",isDocsHomePage:!1,title:"Higher Order Operators",description:"Higher Order Operators",source:"@site/docs/iteration.mdx",sourceDirName:".",slug:"/higher",permalink:"/json-logic-engine/docs/higher",editUrl:"https://github.com/TotalTechGeek/json-logic-engine-documentation/edit/master/website/docs/iteration.mdx",version:"current",frontMatter:{id:"higher",title:"Higher Order Operators"},sidebar:"someSidebar",previous:{title:"Context Operators",permalink:"/json-logic-engine/docs/context"}},b=[{value:"Map",id:"map",children:[]},{value:"Reduce",id:"reduce",children:[]},{value:"Filter",id:"filter",children:[]}],d={toc:b};function u(e){var t=e.components,a=Object(n.a)(e,["components"]);return Object(i.b)("wrapper",Object(r.a)({},d,a,{components:t,mdxType:"MDXLayout"}),Object(i.b)("h1",null,"Higher Order Operators"),Object(i.b)("p",null,"Higher order operations are significantly more complex than the other types of operations, because they allow you to apply a piece of logic iteratively. ",Object(i.b)("br",null),Object(i.b)("br",null)),Object(i.b)("table",null,Object(i.b)("thead",{parentName:"table"},Object(i.b)("tr",{parentName:"thead"},Object(i.b)("th",{parentName:"tr",align:null},"Operators"),Object(i.b)("th",{parentName:"tr",align:null},"Instruction"))),Object(i.b)("tbody",{parentName:"table"},Object(i.b)("tr",{parentName:"tbody"},Object(i.b)("td",{parentName:"tr",align:null},"Map"),Object(i.b)("td",{parentName:"tr",align:null},"map")),Object(i.b)("tr",{parentName:"tbody"},Object(i.b)("td",{parentName:"tr",align:null},"Reduce"),Object(i.b)("td",{parentName:"tr",align:null},"reduce")),Object(i.b)("tr",{parentName:"tbody"},Object(i.b)("td",{parentName:"tr",align:null},"Filter"),Object(i.b)("td",{parentName:"tr",align:null},"Filter")),Object(i.b)("tr",{parentName:"tbody"},Object(i.b)("td",{parentName:"tr",align:null},"Every"),Object(i.b)("td",{parentName:"tr",align:null},"every, all")),Object(i.b)("tr",{parentName:"tbody"},Object(i.b)("td",{parentName:"tr",align:null},"Some"),Object(i.b)("td",{parentName:"tr",align:null},"some")),Object(i.b)("tr",{parentName:"tbody"},Object(i.b)("td",{parentName:"tr",align:null},"None"),Object(i.b)("td",{parentName:"tr",align:null},"none")),Object(i.b)("tr",{parentName:"tbody"},Object(i.b)("td",{parentName:"tr",align:null},"Each Object Key"),Object(i.b)("td",{parentName:"tr",align:null},"eachKey")))),Object(i.b)("p",null,"Additionally, it is important to note that this module supports handlebars style traversal of data within these control structures. "),Object(i.b)("h2",{id:"map"},"Map"),Object(i.b)(l.a,{defaultLogic:{map:[{var:""},{"+":[{var:""},1]}]},defaultData:[1,2,3],mdxType:"LogicRunner"}),Object(i.b)("p",null,"The first operand defines the array you are operating on, while the second defines the operation you are performing. The context switches such that the local variable is the value from the array."),Object(i.b)("br",null),"This following example shows the Handlebars style traversal - ",Object(i.b)("br",null),Object(i.b)(l.a,{defaultLogic:{map:[{var:"arr"},{"+":[{var:"../../a"},{var:""}]}]},defaultData:{arr:[1,2,3],a:2},mdxType:"LogicRunner"}),Object(i.b)("h2",{id:"reduce"},"Reduce"),Object(i.b)(l.a,{defaultLogic:{reduce:[{var:"arr"},{"+":[{var:"accumulator"},{var:"current"}]},0]},defaultData:{arr:[1,2,3,4,5]},mdxType:"LogicRunner"}),Object(i.b)("p",null,'The first operand defines the array you are operating on, while the second defines the operation you are performing. The context switches such that the value "current" is the value from the array, and "accumulator" is the accumulated value.'),Object(i.b)("p",null,"The third operand can be excluded."),Object(i.b)("h2",{id:"filter"},"Filter"),Object(i.b)(l.a,{defaultLogic:{filter:[{var:""},{"%":[{var:""},2]}]},defaultData:[1,2,3,4,5,6,7,8,9,10],mdxType:"LogicRunner"}),Object(i.b)("h1",{id:"every-all"},"Every, All"),Object(i.b)(l.a,{defaultLogic:{every:[{var:""},{"%":[{var:""},2]}]},defaultData:[1,3,5,7,9],mdxType:"LogicRunner"}),Object(i.b)("h1",{id:"some"},"Some"),Object(i.b)(l.a,{defaultLogic:{some:[{var:""},{"%":[{var:""},2]}]},defaultData:[2,3,5,7,9],mdxType:"LogicRunner"}),Object(i.b)("h1",{id:"none"},"None"),Object(i.b)(l.a,{defaultLogic:{none:[{var:""},{"%":[{var:""},2]}]},defaultData:[2,4,6,8],mdxType:"LogicRunner"}),Object(i.b)("h1",{id:"each-key"},"Each Key"),Object(i.b)("p",null,"Sometimes you may wish to iterate over an object instead of an array, executing the logic on each value in the object. ",Object(i.b)("inlineCode",{parentName:"p"},"json-logic-engine")," has a built in operator for this:"),Object(i.b)(l.a,{defaultLogic:{eachKey:{a:{var:"x"},b:{"+":[{var:"y"},1]}}},defaultData:{x:1,y:2},mdxType:"LogicRunner"}))}u.isMDXComponent=!0}}]);