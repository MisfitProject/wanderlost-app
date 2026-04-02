/* ═══ WANDERLOST · Milkinside Engine ═══ */
const Q=id=>document.getElementById(id);
const A={cr:3,sub:false,p:null,h:[],sv:[],mk:[],cat:'',plan:'monthly',unit:'m',th:localStorage.getItem('wt')||'dark'};
const DARK=[{elementType:'geometry',stylers:[{color:'#0d1220'}]},{elementType:'labels.icon',stylers:[{visibility:'off'}]},{elementType:'labels.text.fill',stylers:[{color:'#4a9eff'}]},{elementType:'labels.text.stroke',stylers:[{color:'#0d1220'}]},{featureType:'poi',elementType:'geometry',stylers:[{color:'#111827'}]},{featureType:'poi.park',elementType:'geometry',stylers:[{color:'#0a1f0e'}]},{featureType:'poi.park',elementType:'labels.text.fill',stylers:[{color:'#3dba6e'}]},{featureType:'road',elementType:'geometry',stylers:[{color:'#1a2540'}]},{featureType:'road',elementType:'geometry.stroke',stylers:[{color:'#243050'}]},{featureType:'road.highway',elementType:'geometry',stylers:[{color:'#253060'}]},{featureType:'road.highway',elementType:'geometry.stroke',stylers:[{color:'#1a2a5a'}]},{featureType:'transit',elementType:'geometry',stylers:[{color:'#131c2e'}]},{featureType:'water',elementType:'geometry',stylers:[{color:'#0a1628'}]},{featureType:'water',elementType:'labels.text.fill',stylers:[{color:'#2a5faa'}]}];
const LIGHT=[{elementType:'geometry',stylers:[{color:'#e8ecf2'}]},{elementType:'labels.icon',stylers:[{visibility:'off'}]},{elementType:'labels.text.fill',stylers:[{color:'#6b7280'}]},{featureType:'poi',elementType:'geometry',stylers:[{color:'#dee2e8'}]},{featureType:'road',elementType:'geometry',stylers:[{color:'#fff'}]},{featureType:'water',elementType:'geometry',stylers:[{color:'#c0d0e8'}]}];
const COL={restaurant:'#FF9B8E',cafe:'#C4B5FD',bakery:'#FFC78E',bar:'#F0A0C0',park:'#86EFAC',museum:'#93C5FD'};
let map,ps;

/* Toast */
function toast(m){const o=Q('wt');if(o)o.remove();const t=document.createElement('div');t.id='wt';Object.assign(t.style,{position:'fixed',top:'72px',left:'50%',transform:'translateX(-50%) translateY(-10px)',zIndex:'9999',padding:'12px 24px',fontSize:'12px',textAlign:'center',maxWidth:'300px',borderRadius:'14px',opacity:'0',background:'var(--glass2)',backdropFilter:'blur(40px)',border:'1px solid var(--edge)',color:'var(--tx)',boxShadow:'var(--depth)',transition:'all .5s var(--ease)',fontFamily:'system-ui'});t.textContent=m;document.body.appendChild(t);requestAnimationFrame(()=>{t.style.opacity='1';t.style.transform='translateX(-50%) translateY(0)'});setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),500)},3e3)} window.toast=toast;

/* Tabs */
function stab(id){document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));Q(id)?.classList.add('on');document.querySelectorAll('.dk').forEach(b=>{const i=b.querySelector('.material-symbols-outlined');if(b.dataset.t===id){b.classList.add('on');i.style.fontVariationSettings="'FILL' 1,'wght' 300"}else{b.classList.remove('on');i.style.fontVariationSettings="'FILL' 0,'wght' 200"}})} window.stab=stab;

/* Modals */
function om(id){Q(id)?.classList.add('open');document.body.style.overflow='hidden'} function cm(id){Q(id)?.classList.remove('open');if(!document.querySelector('.md.open'))document.body.style.overflow=''} window.om=om;window.cm=cm;

/* Sheet */
function os(){Q('sheet').classList.add('open');Q('btn-disc')?.classList.add('morph')} function cs(){Q('sheet').classList.remove('open');Q('btn-disc')?.classList.remove('morph')} window.cs=cs;

/* Categories */
function pickCat(b){document.querySelectorAll('.pill').forEach(p=>p.classList.remove('on'));b.classList.add('on');b.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});A.cat=b.dataset.c||''} window.pickCat=pickCat;

/* Distance */
function fd(km){if(A.unit==='ft'){const f=km*3280.84;return f<5280?Math.round(f)+' ft':((f/5280).toFixed(1)+' mi')}return km<1?Math.round(km*1000)+' m':(km.toFixed(1)+' km')}
function hv(a,b,c,d){const R=6371,dL=(c-a)*Math.PI/180,dN=(d-b)*Math.PI/180,x=Math.sin(dL/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dN/2)**2;return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}

/* Map */
window.initMap=function(){
  const mapEl=Q('map');
  console.log('initMap firing, map el size:',mapEl.offsetWidth,'x',mapEl.offsetHeight);
  map=new google.maps.Map(mapEl,{
    center:{lat:47.3769,lng:8.5417},
    zoom:13,
    mapTypeId:'roadmap',
    disableDefaultUI:true
  });
  console.log('Map created');
  spawnZones();
  if(navigator.geolocation)navigator.geolocation.getCurrentPosition(
    p=>{map.panTo({lat:p.coords.latitude,lng:p.coords.longitude})},
    ()=>{},
    {enableHighAccuracy:false,timeout:5000}
  );
  google.maps.event.addListenerOnce(map,'tilesloaded',()=>console.log('TILES LOADED!'));
  google.maps.event.addListenerOnce(map,'idle',()=>{console.log('MAP IDLE');setTimeout(()=>{if(map)map.setOptions({styles:A.th==='light'?LIGHT:DARK})},500);});
};

/* Power Zoom */
function pz(){if(!map)return;map.setZoom(15)}

/* Heatmap Zones — colored radial gradients floating on the map */
function spawnZones(){const z=Q('zones');if(!z)return;const colors=[{c:'164,255,0',x:20,y:35},{c:'58,175,255',x:70,y:25},{c:'255,215,0',x:45,y:60},{c:'139,92,246',x:80,y:70},{c:'255,155,142',x:15,y:75}];
z.innerHTML=colors.map((v,i)=>`<div style="position:absolute;left:${v.x}%;top:${v.y}%;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(${v.c},.3) 0%,rgba(${v.c},.08) 40%,transparent 70%);animation:zone-pulse ${4+i}s ease-in-out infinite;animation-delay:${i*.7}s;transform:translate(-50%,-50%)"></div>`).join('')}

/* Sheet fill */
function fs(p){Q('s-name').textContent=p.name;Q('s-tag').textContent=(p.type||'Discovery').toUpperCase();Q('s-addr').textContent=p.address||'Nearby';Q('s-dist').textContent=p.distance||'';Q('s-desc').textContent=p.description||''}

/* Discovery — tiered fallback search */
const CATS=['restaurant','cafe','bar','bakery','park','museum','tourist_attraction','art_gallery','night_club','spa','gym','shopping_mall','book_store','clothing_store','movie_theater'];
async function nearby(loc,rq){return new Promise((r,j)=>{ps.nearbySearch(rq,(x,s)=>{console.log('Search:',JSON.stringify(rq).slice(0,80),'→',s);if(s==='OK')r(x);else if(s==='ZERO_RESULTS')r([]);else j(s)})})}
async function disc(){console.log('Discovery clicked');const b=Q('btn-disc');if(!b)return;
if(!A.sub&&A.cr<=0){om('md-prem');return}
const icon=b.querySelector('.material-symbols-outlined');if(icon){icon.textContent='progress_activity';icon.style.animation='spin 1s linear infinite'}b.style.animation='none';
if(!navigator.geolocation){toast('Geolocation not supported.');rb();return}
try{const pos=await new Promise((r,j)=>navigator.geolocation.getCurrentPosition(r,j,{enableHighAccuracy:true,timeout:15000}));const{latitude:la,longitude:ln}=pos.coords;console.log('Location:',la,ln);
if(map){map.panTo({lat:la,lng:ln});map.setZoom(15)}
if(!ps){if(map)ps=new google.maps.places.PlacesService(map);else if(typeof google!=='undefined'&&google.maps){const d=document.createElement('div');ps=new google.maps.places.PlacesService(d)}}
if(!ps){toast('Maps loading... try again.');rb();return}
const loc=new google.maps.LatLng(la,ln);let res=[];
/* Try 1: specific category or general types */
if(A.cat){res=await nearby(loc,{location:loc,radius:5000,type:A.cat})}
else{const t=CATS[Math.floor(Math.random()*CATS.length)];res=await nearby(loc,{location:loc,radius:5000,type:t})}
/* Try 2: broader — point_of_interest */
if(!res.length){res=await nearby(loc,{location:loc,radius:5000,type:'point_of_interest'})}
/* Try 3: even broader — establishment */
if(!res.length){res=await nearby(loc,{location:loc,radius:5000,type:'establishment'})}
/* Try 4: keyword */
if(!res.length){res=await nearby(loc,{location:loc,radius:5000,keyword:'restaurant cafe bar'})}
if(!res.length){toast('No places nearby. Try moving to a populated area.');rb();return}
/* Pick a random high-rated one */
let c=res.filter(p=>(p.rating||0)>=3.5);if(!c.length)c=res;
/* Avoid repeats */
const prev=new Set(A.h.map(x=>x.name));const fresh=c.filter(p=>!prev.has(p.name));const pool=fresh.length?fresh:c;
const t=pool[Math.floor(Math.random()*pool.length)],pL=t.geometry.location.lat(),pN=t.geometry.location.lng(),di=hv(la,ln,pL,pN);
A.p={name:t.name||'Hidden Gem',type:t.types?.[0]||A.cat||'Discovery',address:t.vicinity||'Local favorite',distance:fd(di)+' away',distKm:di,description:t.rating?`★ ${t.rating} — Rated by locals`:'A secret local spot.',lat:pL,lng:pN,at:new Date()};
fs(A.p);
if(map){const mk=new google.maps.Marker({position:{lat:pL,lng:pN},map,icon:{path:google.maps.SymbolPath.CIRCLE,scale:8,fillColor:COL[A.p.type]||'#3AAFFF',fillOpacity:1,strokeColor:'#FFF',strokeWeight:2},animation:google.maps.Animation.DROP});mk.addListener('click',()=>{A.p&&(fs(A.p),os())});A.mk.push(mk);map.panTo({lat:pL,lng:pN})}
os();A.h.unshift(A.p);rh();if(!A.sub){A.cr--;Q('credits').textContent=A.cr+' LEFT'}
if(navigator.vibrate)navigator.vibrate([10,50,10])
}catch(e){console.error('Discovery error:',e);if(e&&e.code===1)toast('Location denied. Allow in browser settings.');else if(e&&e.code===2)toast('Location unavailable.');else if(e&&e.code===3)toast('Location timed out. Try again.');else toast('Discovery failed. Check permissions.')}rb()}
function rb(){const b=Q('btn-disc');if(!b)return;const icon=b.querySelector('.material-symbols-outlined');if(icon){icon.textContent='explore';icon.style.animation=''}b.style.animation='orb-breath 3s var(--ease) infinite'}

/* History */
function rh(){const l=Q('hist');if(!l||!A.h.length)return;l.innerHTML=A.h.map(p=>`<div class="g" style="border-radius:16px;padding:20px;margin-bottom:12px"><p class="meta" style="margin-bottom:6px;color:var(--neon)">${(p.type||'Discovery').toUpperCase()} · ${p.at?new Date(p.at).toLocaleDateString('en-US',{month:'short',day:'numeric'}):'Today'}</p><h3 class="place" style="font-size:1.2rem;margin-bottom:6px">${p.name}</h3><p class="body" style="font-size:12px">${p.description||''}</p></div>`).join('')} window.rh=rh;

/* Theme */
function thm(t){A.th=t;localStorage.setItem('wt',t);document.documentElement.classList.toggle('light',t==='light');document.querySelector('meta[name=theme-color]').content=t==='light'?'#E8ECF2':'#050810';if(map)map.setOptions({styles:t==='light'?LIGHT:DARK})}

/* Init */
document.addEventListener('DOMContentLoaded',()=>{
thm(A.th);
const ws=document.createElement('style');ws.innerHTML='.dismissButton,.gm-err-container,.gm-style-mtc,.gm-bundled-control,.gm-svpc,.gm-control-active,.gm-fullscreen-control{display:none!important}';document.head.appendChild(ws);
setInterval(()=>{document.querySelectorAll('.gm-style-pbc,.dismissButton').forEach(d=>d.style.setProperty('display','none','important'));const yb=document.querySelector('[style*="background-color: rgb(255, 255, 0)"],.gm-style-pbt');if(yb)yb.style.setProperty('display','none','important');},1000);
window.gm_authFailure=()=>{console.warn('Maps API auth failed')};

Q('btn-disc')?.addEventListener('click',()=>{const wrapper=document.getElementById('discover-wrapper');if(wrapper){wrapper.classList.add('morph');setTimeout(()=>{wrapper.classList.remove('morph');disc();},400);}else{disc();}});
Q('btn-nav')?.addEventListener('click',()=>{if(!A.p)return;window.open(/iPhone|iPad/i.test(navigator.userAgent)?`http://maps.apple.com/?q=${encodeURIComponent(A.p.name)}&ll=${A.p.lat},${A.p.lng}`:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(A.p.name+' '+A.p.address)}`,'_blank');cs()});
Q('btn-save')?.addEventListener('click',()=>{if(!A.p)return;const b=Q('btn-save');if(A.sv.find(x=>x.name===A.p.name)){b.innerHTML='<span class="material-symbols-outlined" style="font-size:14px">check</span> Saved';return}A.sv.push({...A.p});b.innerHTML='<span class="material-symbols-outlined" style="font-size:14px">bookmark_added</span> Saved!';setTimeout(()=>{b.innerHTML='<span class="material-symbols-outlined" style="font-size:14px">bookmark</span> Save'},2e3)});

Q('btn-try')?.addEventListener('click',()=>{Q('auth').classList.add('out');setTimeout(()=>{pz();if(map)google.maps.event.trigger(map,'resize');},450)});
Q('btn-login')?.addEventListener('click',()=>Q('sl-login').classList.add('open'));
Q('btn-sign')?.addEventListener('click',()=>{if(!Q('l-em').value.trim()||!Q('l-pw').value){toast('Fill in all fields.');return}const b=Q('btn-sign');b.textContent='Signing in...';b.disabled=true;setTimeout(()=>{Q('sl-login').classList.remove('open');Q('auth').classList.add('out');b.textContent='Sign In';b.disabled=false;toast('Welcome back!');setTimeout(()=>{pz();if(map)google.maps.event.trigger(map,'resize');},450)},1500)});
Q('btn-forgot-open')?.addEventListener('click',()=>Q('sl-forgot').classList.add('open'));
Q('btn-reset')?.addEventListener('click',()=>{if(!Q('f-em').value.trim()){toast('Enter email.');return}const b=Q('btn-reset');b.textContent='Sending...';b.disabled=true;setTimeout(()=>{b.textContent='Send Recovery Link';b.disabled=false;Q('f-msg').classList.remove('hidden')},1500)});
Q('btn-save-prof')?.addEventListener('click',()=>{if(Q('pf-p').value&&Q('pf-p').value!==Q('pf-p2').value){toast('Passwords mismatch.');return}const b=Q('btn-save-prof');b.textContent='Saving...';b.disabled=true;setTimeout(()=>{const n=Q('pf-n')?.value.trim();if(n)Q('dname').textContent=n;b.textContent='Save Changes';b.disabled=false;toast('Profile saved.')},1200)});
Q('btn-pay')?.addEventListener('click',()=>{const f=Q('pf');if(!f.checkValidity()){f.reportValidity();return}const b=Q('btn-pay');b.textContent='Verifying...';b.disabled=true;setTimeout(()=>{b.textContent='Authorized ✓';A.sub=true;A.cr=999;setTimeout(()=>{cm('md-pay');Q('credits').textContent='∞';b.textContent='Confirm Payment';b.disabled=false;toast('Welcome to Premium!')},1400)},2200)});

document.querySelectorAll('.plb').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.plb').forEach(x=>{x.style.background='transparent';x.style.color='var(--t3)'});b.style.background='var(--cyan)';b.style.color='#fff';A.plan=b.dataset.pl;Q('ptot').textContent=A.plan==='annual'?'200.00 CHF':'20.00 CHF';Q('pcyc').textContent=A.plan==='annual'?'Annually':'Monthly'}));
document.querySelectorAll('.ub').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.ub').forEach(x=>{x.style.background='transparent';x.style.color='var(--t3)'});b.style.background='var(--cyan)';b.style.color='#fff';A.unit=b.dataset.u==='feet'?'ft':'m';if(A.p?.distKm!==undefined)Q('s-dist').textContent=fd(A.p.distKm)+' away'}));
document.querySelectorAll('.thb').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.thb').forEach(x=>{x.style.background='transparent';x.style.color='var(--t3)'});b.style.background='var(--cyan)';b.style.color='#fff';thm(b.dataset.th)}));
document.querySelectorAll('.thb').forEach(b=>{if(b.dataset.th===A.th){b.style.background='var(--cyan)';b.style.color='#fff'}});

document.addEventListener('pointerdown',e=>{if(e.target.closest('button')&&navigator.vibrate)navigator.vibrate(6)});
console.log('Wanderlost v66 · Milkinside Engine');
});
