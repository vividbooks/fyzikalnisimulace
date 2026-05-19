import{c,r as d,y as m,z as p,j as n,E as y,F as b,G as v,H as w}from"./index-BirWOrSY.js";/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=[["path",{d:"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z",key:"a7tn18"}]],_=c("moon",f);/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g=[["path",{d:"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8",key:"1p45f6"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}]],j=c("rotate-cw",g);/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]],E=c("sun",k),r=768;function N(){const[o,t]=d.useState(void 0);return d.useEffect(()=>{const e=window.matchMedia(`(max-width: ${r-1}px)`),a=()=>{t(window.innerWidth<r)};return e.addEventListener("change",a),t(window.innerWidth<r),()=>e.removeEventListener("change",a)},[]),!!o}function s(...o){return m(p(o))}function z({className:o,defaultValue:t,value:e,min:a=0,max:i=100,...l}){const h=d.useMemo(()=>Array.isArray(e)?e:Array.isArray(t)?t:[a,i],[e,t,a,i]);return n.jsxs(y,{"data-slot":"slider",defaultValue:t,value:e,min:a,max:i,className:s("relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",o),...l,children:[n.jsx(b,{"data-slot":"slider-track",className:s("bg-muted relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-4 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"),children:n.jsx(v,{"data-slot":"slider-range",className:s("bg-primary absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full")})}),Array.from({length:h.length},(M,u)=>n.jsx(w,{"data-slot":"slider-thumb",className:"border-primary bg-background ring-ring/50 block size-4 shrink-0 rounded-full border shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"},u))]})}export{_ as M,j as R,z as S,E as a,N as u};
