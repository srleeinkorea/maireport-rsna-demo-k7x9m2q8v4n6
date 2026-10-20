/* One-page feature preview: scroll existing app screenshots only while visible. */
(function(){
  'use strict';
  if(window.__maiOnePagePreviewInit)return;
  window.__maiOnePagePreviewInit=true;
  var css=document.createElement('style');
  css.textContent=`
    /* This effect never changes the color theme inside the app images. */
    #features .phone-screen{overflow:hidden!important;position:relative}
    #features .phone-screen img.shot{
      display:block;position:relative;max-width:100%;height:auto;
      will-change:transform;transition:transform 3.6s cubic-bezier(.45,0,.2,1);
      transform:translateY(0)!important
    }
    #features .feat-row.mai-preview-active .phone-screen img.shot.mai-shot-scroll{
      transform:translateY(var(--mai-preview-distance,0px))!important
    }
    @media(prefers-reduced-motion:reduce){
      #features .phone-screen img.shot{transition:none!important;transform:none!important}
    }
  `;
  document.head.appendChild(css);
  var rows=Array.prototype.slice.call(document.querySelectorAll('#features .feat-row'));
  if(!rows.length||!('IntersectionObserver' in window))return;
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  var active=null, timer=null;
  function clear(){if(timer){clearTimeout(timer);timer=null;}if(active){active.classList.remove('mai-preview-active');active=null;}}
  function measure(row){
    var shots=row.querySelectorAll('.phone-screen img.shot'), moved=0;
    shots.forEach(function(img){
      var frame=img.closest('.phone-screen');
      if(!frame)return;
      var excess=Math.max(0,img.getBoundingClientRect().height-frame.clientHeight);
      var shift=Math.min(excess,220);
      img.style.setProperty('--mai-preview-distance',(-shift)+'px');
      img.classList.toggle('mai-shot-scroll',shift>8);
      if(shift>8)moved++;
    });
    return moved;
  }
  function play(row){
    clear();if(!row||reduce.matches||document.hidden)return;
    active=row;
    var moved=measure(row);
    if(!moved)return;
    // An initial still frame provides a stable entry before motion.
    timer=setTimeout(function(){if(active===row&&!document.hidden)row.classList.add('mai-preview-active');},350);
    // Return to the first frame; replay only on a later viewport entry.
    setTimeout(function(){if(active===row)row.classList.remove('mai-preview-active');},4550);
  }
  var observed=new Map();
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){observed.set(entry.target,entry.isIntersecting?entry.intersectionRatio:0);});
    var best=null,ratio=.36;
    observed.forEach(function(value,row){if(value>ratio){ratio=value;best=row;}});
    if(best!==active){if(best)play(best);else clear();}
  },{threshold:[0,.2,.36,.55,.75]});
  rows.forEach(function(row){observed.set(row,0);io.observe(row);});
  document.addEventListener('visibilitychange',function(){if(document.hidden)clear();});
  reduce.addEventListener&&reduce.addEventListener('change',function(){clear();});
})();