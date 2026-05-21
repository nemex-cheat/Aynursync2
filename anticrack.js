/* CineSync Anti-Crack v4 */
(function(){
'use strict';
var _s=['apiKey','firebase','plane-gr','AIzaSy','CS_CFG','databaseURL'];
var _ol=console.log,_ow=console.warn,_oe=console.error;
function _f(a){return a.some(function(arg){if(typeof arg!=='string')return false;var l=arg.toLowerCase();return _s.some(function(s){return l.indexOf(s.toLowerCase())!==-1})})}
console.log=function(){var a=Array.prototype.slice.call(arguments);if(!_f(a))_ol.apply(console,a)};
console.warn=function(){var a=Array.prototype.slice.call(arguments);if(!_f(a))_ow.apply(console,a)};
console.error=function(){var a=Array.prototype.slice.call(arguments);if(!_f(a))_oe.apply(console,a)};
Object.defineProperty(window,'CS_CFG',{configurable:false,writable:false});
})();
