/* maiReport one-page app preview, v2: works even for screenshot images fitted to the device frame. */
(function(){
'use strict';
if(window.__maiOnePagePreviewV2)return;window.__maiOnePagePreviewV2=true;
const style=document.createElement('style');style.id='mai-one-page-preview-style';
style.textContent=`
#features .phone-screen{overflow:hidden!important;position:relative;isolation:isolate}
#features .phone-screen img.shot{display:block;transform-origin:center top!important;transition:transform 3.2s ease-in-out!important;will-change:transform}
#features .feat-row.mai-preview-active .phone-screen img.shot{
 transform:translate3d(0,-12px,0) scale(1.065)!important
}
@media(prefers-reduced-motion:reduce){
 #features .phone-screen img.shot{transition:none!important;transform:none!important}
}
`;
document.head.appendChild(style);
const rows=Array.from(document.querySelectorAll('#features .feat-row')).filter(r=>r.querySelector('.phone-screen img.shot'));
if(!rows.length)return;
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
let active=null,startTimer=null,stopTimer=null;
function stop(){
 clearTimeout(startTimer);clearTimeout(stopTimer);
 if(active){active.classList.remove('mai-preview-active');active=null;}
}
function start(row){
 if(row===active)return;
 stop();
 if(!row||document.hidden||reduced.matches)return;
 active=row;
 startTimer=setTimeout(()=>{if(active===row)row.classList.add('mai-preview-active');},250);
 stopTimer=setTimeout(()=>{if(active===row)row.classList.remove('mai-preview-active');},3900);
}
if('IntersectionObserver' in window){
 const fractions=new Map();
 const observer=new IntersectionObserver(entries=>{
   entries.forEach(e=>fractions.set(e.target,e.isIntersecting?e.intersectionRatio:0));
   let best=null,max=.12;
   fractions.forEach((ratio,row)=>{if(ratio>max){max=ratio;best=row;}});
   start(best);
 },{threshold:[0,.12,.25,.4,.6]});
 rows.forEach(row=>{fractions.set(row,0);observer.observe(row);});
}else{
 let ticking=false;
 window.addEventListener('scroll',()=>{
  if(ticking)return;ticking=true;
  requestAnimationFrame(()=>{ticking=false;let best=null,value=0;
   rows.forEach(row=>{const r=row.getBoundingClientRect();const overlap=Math.max(0,Math.min(innerHeight,r.bottom)-Math.max(0,r.top));if(overlap>value){value=overlap;best=row;}});
   start(best);
  });
 },{passive:true});
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
if(reduced.addEventListener)reduced.addEventListener('change',stop);
})();
