(function(){
var rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
var d=document,r=d.documentElement,$=function(s){return d.querySelector(s)};
var dark=window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches;
try{var s=localStorage.getItem('t');if(s)dark=(s==='dark')}catch(e){}
var tb=$('#theme');function ap(){r.setAttribute('data-theme',dark?'dark':'light');tb.textContent=dark?'Light':'Dark'}ap();
tb.onclick=function(){dark=!dark;ap();try{localStorage.setItem('t',dark?'dark':'light')}catch(e){}};
var nav=$('#links'),mb=$('#menu');
mb.onclick=function(){var o=nav.classList.toggle('open');mb.setAttribute('aria-expanded',o)};
d.querySelectorAll('[data-go]').forEach(function(a){a.onclick=function(e){e.preventDefault();nav.classList.remove('open');mb.setAttribute('aria-expanded','false');var t=d.getElementById(a.getAttribute('data-go'));if(t)t.scrollIntoView({behavior:'smooth'})}});
var b=$('#badge');b.onclick=function(){b.setAttribute('aria-pressed',b.getAttribute('aria-pressed')!=='true')};
$('#form').onsubmit=function(e){e.preventDefault();
 var q=function(i){return encodeURIComponent($(i).value)};
 $('#ok').textContent='Thanks! Your email app is opening with your message.';
 location.href='mailto:arvind@example.com?subject='+q('#sb')+'&body='+encodeURIComponent('From: '+$('#fn').value+' ('+$('#em').value+')\n\n'+$('#ms').value)};

var sp=$('.splash'),spOn=false,endSp=function(){if(sp){sp.remove();sp=null}},startSp=function(){if(spOn||!sp)return;spOn=true;sp.classList.add('go');setTimeout(endSp,rm?2400:3000)};
if(sp){sp.onclick=endSp;if(d.visibilityState==='visible')startSp();else d.addEventListener('visibilitychange',function(){if(d.visibilityState==='visible')startSp()})}
var ty=$('#typed'),ws=['Frontend Developer','Clean Code Enthusiast','Creative Problem Solver'],wi=0,ci=0,del=false;
function tick(){var w=ws[wi];ci+=del?-1:1;ty.textContent=w.slice(0,ci);var t=del?40:90;if(!del&&ci===w.length){del=true;t=1600}else if(del&&ci===0){del=false;wi=(wi+1)%ws.length;t=300}setTimeout(tick,t)}
if(!rm){ty.textContent='';setTimeout(tick,2600)}
var lk=d.querySelectorAll('.links a[data-go]');
if('IntersectionObserver' in window){
 var so=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)lk.forEach(function(a){a.classList.toggle('act',a.getAttribute('data-go')===e.target.id)})})},{rootMargin:'-45% 0px -50% 0px'});
 ['home','about','skills','projects','certificates','contact'].forEach(function(i){var x=d.getElementById(i);if(x)so.observe(x)});
 if(!rm){var ro=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){var el=e.target;el.classList.add('in');ro.unobserve(el);setTimeout(function(){el.classList.remove('rv','in')},1100)}})},{threshold:.12});
  d.querySelectorAll('.card,.tiles li,.soft article,.about>*,section h2,.pill,.contact>*').forEach(function(el,i){el.classList.add('rv');el.style.setProperty('--d',(i%4)*90+'ms');ro.observe(el)})}
}
var pg=$('#prog'),tp=$('#totop');
function onsc(){var h=r.scrollHeight-innerHeight;pg.style.width=(h>0?scrollY/h*100:0)+'%';tp.classList.toggle('show',scrollY>500)}
addEventListener('scroll',onsc,{passive:true});onsc();
tp.onclick=function(){scrollTo({top:0,behavior:rm?'auto':'smooth'})};
d.querySelectorAll('.cert').forEach(function(c,i){
 var img=c.querySelector('img'),inp=c.querySelector('input'),k='cert'+i,st=null;
 img.onload=function(){img.hidden=false};
 try{st=localStorage.getItem(k)}catch(e){}
 img.src=st||'images/certificate-'+(i+1)+'.jpg';
 c.querySelector('.chg').onclick=function(){inp.click()};
 inp.onchange=function(){var f=inp.files[0];if(!f)return;var fr=new FileReader();
  fr.onload=function(){var im=new Image();im.onload=function(){var z=Math.min(1,900/im.width),cv=d.createElement('canvas');cv.width=im.width*z;cv.height=im.height*z;cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);var u=cv.toDataURL('image/jpeg',.82);img.src=u;try{localStorage.setItem(k,u)}catch(e){}};im.src=fr.result};fr.readAsDataURL(f)};
});

var PAL=[['sunset','Sunset','Original',['#231108','#F97316','#FDE2B8','#FFF7E6']],['ocean','Ocean','Blue and navy',['#0C1D32','#007AAD','#D9E2E9','#FFFBFC']],['forest','Forest','Green and sage',['#00412E','#96BF8A','#E8EAE5','#FFFFFF']],['berry','Berry','Rose and plum',['#2A0F1B','#C2255C','#FAD7E1','#FFF5F6']]];
var pb=$('#pal'),pp=$('#palpanel'),po=$('#opts'),cur='sunset';
try{var sp2=localStorage.getItem('pal');if(sp2&&PAL.some(function(x){return x[0]===sp2}))cur=sp2}catch(e){}
PAL.forEach(function(x){var o=d.createElement('button');o.type='button';o.className='opt';o.setAttribute('role','radio');o.dataset.p=x[0];
 o.innerHTML='<span class="sw" aria-hidden="true">'+x[3].map(function(c){return '<i style="background:'+c+'"></i>'}).join('')+'</span><span class="nm">'+x[1]+'<small>'+x[2]+'</small></span>';po.appendChild(o)});
function setPal(n,anim){cur=n;if(anim&&!rm){r.classList.add('tswap');setTimeout(function(){r.classList.remove('tswap')},500)}
 r.setAttribute('data-palette',n);po.querySelectorAll('.opt').forEach(function(o){o.setAttribute('aria-checked',o.dataset.p===n)});
 try{localStorage.setItem('pal',n)}catch(e){}}
setPal(cur,false);
po.onclick=function(e){var o=e.target.closest('.opt');if(o)setPal(o.dataset.p,true)};
function shut(){pp.hidden=true;pb.setAttribute('aria-expanded','false')}
pb.onclick=function(e){e.stopPropagation();var h=pp.hidden;pp.hidden=!h;pb.setAttribute('aria-expanded',h)};
d.addEventListener('click',function(e){if(!pp.hidden&&!pp.contains(e.target))shut()});
d.addEventListener('keydown',function(e){if(e.key==='Escape'&&!pp.hidden){shut();pb.focus()}});
})();
