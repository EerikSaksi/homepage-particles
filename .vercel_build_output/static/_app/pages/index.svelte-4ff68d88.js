import{S as e,i as s,s as t,M as n,j as r,m as o,o as a,x as c,u as l,v as i,I as $,H as f,e as m,c as d,a as p,d as u,b as h,f as g,F as w,J as x,K as y,L as v,l as P,r as j,w as k,A as b,k as _,n as E}from"../chunks/vendor-896edeeb.js";import{_ as I}from"../chunks/preload-helper-9f12a5fd.js";function z(e){let s,t,n,r,o,a;return{c(){s=m("button"),t=m("img"),this.h()},l(e){s=d(e,"BUTTON",{class:!0});var n=p(s);t=d(n,"IMG",{alt:!0,src:!0}),n.forEach(u),this.h()},h(){h(t,"alt","Noice"),t.src!==(n=e[0])&&h(t,"src",n),h(s,"class",r="h-48 w-48 ml-12 md:ml-12 flex-shrink-0 focus:outline-none rounded-full flex justify-center items-center bg-white m-3 overflow-hidden shadow-md p-8 z-10 "+(e[1]?"ring-4 transition-transform scale-110 shadow-lg opacity-70 md:opacity-100":""))},m(n,r){g(n,s,r),w(s,t),e[4](s),o||(a=[x(s,"click",(function(){y(e[2])&&e[2].apply(this,arguments)})),x(s,"focus",(function(){y(e[2])&&e[2].apply(this,arguments)}))],o=!0)},p(o,a){e=o,1&a&&t.src!==(n=e[0])&&h(t,"src",n),2&a&&r!==(r="h-48 w-48 ml-12 md:ml-12 flex-shrink-0 focus:outline-none rounded-full flex justify-center items-center bg-white m-3 overflow-hidden shadow-md p-8 z-10 "+(e[1]?"ring-4 transition-transform scale-110 shadow-lg opacity-70 md:opacity-100":""))&&h(s,"class",r)},d(t){t&&u(s),e[4](null),o=!1,v(a)}}}function D(e){let s,t;return s=new $({props:{element:e[3],threshold:1,once:e[6],$$slots:{default:[z]},$$scope:{ctx:e}}}),s.$on("intersect",(function(){return e[5](e[6])})),{c(){r(s.$$.fragment)},l(e){o(s.$$.fragment,e)},m(e,n){a(s,e,n),t=!0},p(t,n){e=t;const r={};8&n&&(r.element=e[3]),64&n&&(r.once=e[6]),143&n&&(r.$$scope={dirty:n,ctx:e}),s.$set(r)},i(e){t||(c(s.$$.fragment,e),t=!0)},o(e){l(s.$$.fragment,e),t=!1},d(e){i(s,e)}}}function N(e){let s,t;return s=new n({props:{query:"(min-width: 768px)",$$slots:{default:[D,({matches:e})=>({6:e}),({matches:e})=>e?64:0]},$$scope:{ctx:e}}}),{c(){r(s.$$.fragment)},l(e){o(s.$$.fragment,e)},m(e,n){a(s,e,n),t=!0},p(e,[t]){const n={};207&t&&(n.$$scope={dirty:t,ctx:e}),s.$set(n)},i(e){t||(c(s.$$.fragment,e),t=!0)},o(e){l(s.$$.fragment,e),t=!1},d(e){i(s,e)}}}function T(e,s,t){let n,{src:r}=s,{selected:o}=s,{onPress:a}=s;return e.$$set=e=>{"src"in e&&t(0,r=e.src),"selected"in e&&t(1,o=e.selected),"onPress"in e&&t(2,a=e.onPress)},[r,o,a,n,function(e){f[e?"unshift":"push"]((()=>{n=e,t(3,n)}))},e=>{e||a()}]}class U extends e{constructor(e){super(),s(this,e,T,N,t,{src:0,selected:1,onPress:2})}}function V(e){let s,t,n;var $=e[0];function f(e){return{props:{id:"tsparticles",options:e[1]}}}return $&&(s=new $(f(e))),{c(){s&&r(s.$$.fragment),t=P()},l(e){s&&o(s.$$.fragment,e),t=P()},m(e,r){s&&a(s,e,r),g(e,t,r),n=!0},p(e,[n]){const o={};if(2&n&&(o.options=e[1]),$!==($=e[0])){if(s){j();const e=s;l(e.$$.fragment,1,0,(()=>{i(e,1)})),k()}$?(s=new $(f(e)),r(s.$$.fragment),c(s.$$.fragment,1),a(s,t.parentNode,t)):s=null}else $&&s.$set(o)},i(e){n||(s&&c(s.$$.fragment,e),n=!0)},o(e){s&&l(s.$$.fragment,e),n=!1},d(e){e&&u(t),s&&i(s,e)}}}function A(e,s,t){let n,r;return b((()=>{fetch("/particles/stat_buff.json").then((e=>e.json())).then((e=>{t(1,r=e)})),I((()=>import("../chunks/svelte-particles-db196525.js")),void 0).then((e=>{t(0,n=e.default)}))})),[n,r]}class G extends e{constructor(e){super(),s(this,e,A,V,t,{})}}function L(e){let s,t,n,$,f,x,y,v,P,j,k,b;return s=new G({}),f=new U({props:{src:"icon.png",selected:3===e[0],onPress:e[1]}}),y=new U({props:{src:"https://idsihealth.org/wp-content/uploads/2015/01/University-of-Glasgow.jpg",selected:0===e[0],onPress:e[2]}}),P=new U({props:{src:"https://upload.wikimedia.org/wikipedia/commons/4/41/Uros-logo-plain.png",selected:1===e[0],onPress:e[3]}}),k=new U({props:{src:"https://brokerchooser.com/uploads/broker_logos/barclays-review.png",selected:2===e[0],onPress:e[4]}}),{c(){r(s.$$.fragment),t=_(),n=m("div"),$=m("div"),r(f.$$.fragment),x=_(),r(y.$$.fragment),v=_(),r(P.$$.fragment),j=_(),r(k.$$.fragment),this.h()},l(e){o(s.$$.fragment,e),t=E(e),n=d(e,"DIV",{class:!0});var r=p(n);$=d(r,"DIV",{class:!0});var a=p($);o(f.$$.fragment,a),x=E(a),o(y.$$.fragment,a),v=E(a),o(P.$$.fragment,a),j=E(a),o(k.$$.fragment,a),a.forEach(u),r.forEach(u),this.h()},h(){h($,"class","flex flex-row md:justify-center  p-3 md:mt-48 overflow-y-hidden"),h(n,"class","h-screen w-screen md:container md:mx-auto flex items-center md:items-start md:justify-center z-50")},m(e,r){a(s,e,r),g(e,t,r),g(e,n,r),w(n,$),a(f,$,null),w($,x),a(y,$,null),w($,v),a(P,$,null),w($,j),a(k,$,null),b=!0},p(e,[s]){const t={};1&s&&(t.selected=3===e[0]),1&s&&(t.onPress=e[1]),f.$set(t);const n={};1&s&&(n.selected=0===e[0]),1&s&&(n.onPress=e[2]),y.$set(n);const r={};1&s&&(r.selected=1===e[0]),1&s&&(r.onPress=e[3]),P.$set(r);const o={};1&s&&(o.selected=2===e[0]),1&s&&(o.onPress=e[4]),k.$set(o)},i(e){b||(c(s.$$.fragment,e),c(f.$$.fragment,e),c(y.$$.fragment,e),c(P.$$.fragment,e),c(k.$$.fragment,e),b=!0)},o(e){l(s.$$.fragment,e),l(f.$$.fragment,e),l(y.$$.fragment,e),l(P.$$.fragment,e),l(k.$$.fragment,e),b=!1},d(e){i(s,e),e&&u(t),e&&u(n),i(f),i(y),i(P),i(k)}}}const M=!0;function O(e,s,t){let n=3;return[n,()=>{t(0,n=3)},()=>{t(0,n=0)},()=>{t(0,n=1)},()=>{t(0,n=2)}]}export default class extends e{constructor(e){super(),s(this,e,O,L,t,{})}}export{M as prerender};