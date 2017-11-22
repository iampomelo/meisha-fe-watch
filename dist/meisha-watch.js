!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.MeishaWatch=e():t.MeishaWatch=e()}(window,function(){function t(t){var e=t.stack.replace(/\n/gi,"").split(/\bat\b/).slice(0,9).join("@").replace(/\?[^:]+/gi,""),o=t.toString();return e.indexOf(o)<0&&(e=o+"@"+e),e}function e(t){var e="";for(var o in t)t.hasOwnProperty(o)&&(e+="&"+o+"="+t[o]);return e.slice(1)}var o={wechat:!!navigator.userAgent.toLowerCase().match(/MicroMessenger/i),iOS:!!navigator.userAgent.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/),dev:/127.0.0.1|192.168|localhost/.test(window.location.host)};return new(function(){function n(){this._logs=[],this.user="",this.uniqueId="xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(t){var e=16*Math.random()|0;return("x"==t?e:3&e|8).toString(16)}),this.timer=null,this.reportTimes=0,o.iOS?(Object.defineProperty(this,"logs",{value:[],configurable:!0,enumerable:!0,writable:!0}),Object.defineProperty(this,"logs",{get:function(){return this._logs},set:function(t){this._logs=t,t.length&&this.checkLogs()}})):this.logs=[],this.agentConsole(),this.agentAJAX(),this.configSender(),this.configListener()}return n.prototype.init=function(t){this.settings=t},n.prototype.agentConsole=function(){var t=this;["log","info","warn","debug","error"].forEach(function(e){var o=console[e];console[e]=function(){for(var n=[],i=0;i<arguments.length;i++)n[i]=arguments[i];n.length&&"[MeishaWatch Console]"!==n[0]&&(t.logs=t.logs.concat([{msg:n.map(function(t){return"object"==typeof t?JSON.stringify(t):t}).join(","),url:window.location.href,type:e}])),o.apply(console,n)}})},n.prototype.agentAJAX=function(){var t=this,e=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(){var o=this,n=[].slice.call(arguments),i=n[0],r=n[1],s=o.onreadystatechange||function(){};return o.onreadystatechange=function(){return 4===o.readyState&&o.status>=400&&(t.logs=t.logs.concat([{msg:i+" "+r+" "+o.status,url:window.location.href,type:"error"}])),s.apply(o,arguments)},e.apply(o,n)}},n.prototype.configListener=function(){var e=this;window.onerror=function(o,n,i,r,s){var a=o;s&&s.stack&&(a=t(s)),e.logs=e.logs.concat([{msg:a.substr(0,500),url:window.location.href,type:"error",line:i,col:r}])}},n.prototype.configSender=function(){var t=this;if(window.addEventListener("unload",function(){t.report()}),o.wechat){var e="hidden";e in document?document.addEventListener("visibilitychange",function(){t.report()}):(e="webkitHidden")in document&&document.addEventListener("webkitvisibilitychange",function(){t.report()})}},n.prototype.setUser=function(t){this.user=t},n.prototype.report=function(t){void 0===t&&(t=!1);var o=this.settings,n=o.reportURL,i=o.projectId,r=o.partitionId,s=o.isReport;if((void 0===s||s)&&this.reportTimes<20&&n&&i&&r){var a=window.performance,c={loadPage:-1,domReady:-1,loadRes:-1};if(a){var u=a.timing;c.loadPage=u.loadEventEnd-u.navigationStart,c.domReady=u.domComplete-u.responseEnd,c.loadRes=u.responseEnd-u.requestStart}var p="number"==typeof this.user||"string"==typeof this.user?this.user:JSON.stringify(this.user),l=JSON.stringify(this.logs.slice());this.logs=[],function(t,o,n,i,r,s){var a=new XMLHttpRequest;a.onreadystatechange=function(){4===a.readyState&&(200===a.status?r:s)(JSON.parse(a.responseText))},a.open(o,"GET"===o.toUpperCase()?t+"?"+e(n):t,i),a.setRequestHeader("Content-Type","application/x-www-form-urlencoded"),a.send(e(n))}(n,"POST",{projectId:i,partitionId:r,logs:l,times:JSON.stringify(c),user:p,uniqueId:this.uniqueId},t,function(){},function(){}),this.reportTimes++}},n.prototype.useVue=function(){var e=this;return{install:function(n){var i=n.version&&n.version.split(".")||[];+i[0]>=2&&+i[1]>=2&&(n.config.errorHandler=function(n,i,r){o.dev&&console.error("[MeishaWatch Console]",n);var s=n?n.stack?t(n):n:"";r&&(s="[Info: "+r+"]->"+s),i&&i.$options&&i.$options.name&&(s="[Component Name: "+i.$options.name+"]->"+s),e.logs=e.logs.concat([{msg:s,url:window.location.href,type:"error"}])}),function(t){var e=window.location.search.substr(1).match(new RegExp("(^|&)"+t+"=([^&]*)(&|$)","i"));return e?decodeURI(e[2]):""}("devtools")&&(n.config.devtools=!0)}}},n.prototype.checkLogs=function(){var t=this;clearTimeout(this.timer),this.logs.length>=10?this.report(!0):this.timer=setTimeout(function(){t.report(!0)},3e3)},n}())});