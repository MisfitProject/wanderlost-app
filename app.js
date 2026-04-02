/* ═══════════════════════════════════════════════════════
   WANDERLOST · App Engine — Written from Scratch
   ═══════════════════════════════════════════════════════ */
const el=id=>document.getElementById(id);
const A={cr:3,sub:false,p:null,h:[],sv:[],mk:[],cat:'',plan:'monthly',unit:'m',th:localStorage.getItem('wt')||'dark'};

/* ─── Map Styles ─── */
const DARK=[{elementType:'geometry',stylers:[{color:'#080b12'}]},{elementType:'labels.icon',stylers:[{visibility:'off'}]},{elementType:'labels.text.fill',stylers:[{color:'#4a5568'}]},{elementType:'labels.text.stroke',stylers:[{color:'#080b12'}]},{featureType:'poi',elementType:'geometry',stylers:[{color:'#111827'}]},{featureType:'poi.park',elementType:'geometry',stylers:[{color:'#0f1f13'}]},{featureType:'road',elementType:'geometry',stylers:[{color:'#1a2332'}]},{featureType:'road.highway',elementType:'geometry',stylers:[{color:'#1f2f42'}]},{featureType:'water',elementType:'geometry',stylers:[{color:'#0c1524'}]}];
const LIGHT=[{elementType:'geometry',stylers:[{color:'#eef1f5'}]},{elementType:'labels.icon',stylers:[{visibility:'off'}]},{elementType:'labels.text.fill',stylers:[{color:'#6b7280'}]},{featureType:'poi',elementType:'geometry',stylers:[{color:'#e5e7eb'}]},{featureType:'poi.park',elementType:'geometry',stylers:[{color:'#d1e7d5'}]},{featureType:'road',elementType:'geometry',stylers:[{color:'#fff'}]},{featureType:'water',elementType:'geometry',stylers:[{color:'#c7d8f0'}]}];
const COL={restaurant:'#FF9B8E',cafe:'#C4B5FD',bakery:'#FFC78E',bar:'#F0A0C0',park:'#86EFAC',museum:'#93C5FD'};
let map,ps;

/* ─── Toast ─── */
function toast(m){const o=el('wt');if(o)o.remove();const t=document.createElement('div');t.id='wt';Object.assign(t.style,{position:'fixed',top:'80px',left:'50%',transform:'translateX(-50%) translateY(-12px)',zIndex:'9999',padding:'14px 28px',fontSize:'13px',textAlign:'center',maxWidth:'340px',borderRadius:'18px',opacity:'0',background:'var(--glass2)',backdropFilter:'blur(40px)',border:'1px solid var(--edge)',borderRightColor:'var(--edge2)',borderBottomColor:'var(--edge2)',color:'var(--tx)',boxShadow:'var(--depth)',transition:'all .5s var(--ios)',fontFamily:'system-ui'});t.textContent=m;document.body.appendChild(t);requestAnimationFrame(()=>{t.style.opacity='1';t.style.transform='translateX(-50%) translateY(0)'});setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),500)},3500)} window.toast=toast;

/* ─── Tabs ─── */
function stab(id){document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));el(id)?.classList.add('active');document.querySelectorAll('.dock').forEach(b=>{const i=b.querySelector('.material-symbols-outlined');if(b.dataset.t===id){b.classList.add('active');i.style.fontVariationSettings="'FILL' 1"}else{b.classList.remove('active');i.style.fontVariationSettings="'FILL' 0"}})} window.stab=stab;

/* ─── Modals ─── */
function om(id){el(id)?.classList.add('open');document.body.style.overflow='hidden'} function cm(id){el(id)?.classList.remove('open');if(!document.querySelector('.modal.open'))document.body.style.overflow=''} window.om=om;window.cm=cm;

/* ─── Sheet ─── */
function os(){el('sheet').classList.add('open');el('btn-discover')?.classList.add('morphing')} function cs(){el('sheet').classList.remove('open');el('btn-discover')?.classList.remove('morphing')} window.cs=cs;

/* ─── Categories ─── */
function pickCat(b){document.querySelectorAll('.pill').forEach(p=>p.classList.remove('active'));b.classList.add('active');b.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});A.cat=b.dataset.c||''} window.pickCat=pickCat;

/* ─── Distance ─── */
function fd(km){if(A.unit==='ft'){const f=km*3280.84;return f<5280?Math.round(f)+' ft':((f/5280).toFixed(1)+' mi')}return km<1?Math.round(km*1000)+' m':(km.toFixed(1)+' km')}
function hv(a,b,c,d){const R=6371,dL=(c-a)*Math.PI/180,dN=(d-b)*Math.PI/180,x=Math.sin(dL/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dN/2)**2;return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}

/* ─── Map ─── */
window.initMap=function(){map=new google.maps.Map(el('map'),{center:{lat:47.3769,lng:8.5417},zoom:2,disableDefaultUI:true,styles:A.th==='light'?LIGHT:DARK})};

/* ─── Power Zoom ─── */
function pz(){if(!map||!el('map'))return;const s=performance.now();(function f(n){const t=Math.min((n-s)/3e3,1),e=t===1?1:1-Math.pow(2,-10*t);map.setZoom(2+13*e);el('map').style.filter=`blur(${16*(1-e)}px) brightness(${.6+.4*e})`;t<1?requestAnimationFrame(f):el('map').style.filter='none'})(s)}

/* ─── Sheet Content ─── */
function fs(p){el('s-name').textContent=p.name;el('s-tag').textContent=p.type||'Discovery';el('s-addr').textContent=p.address||'Nearby';el('s-dist').textContent=p.distance||'';el('s-desc').textContent=p.description||''}

/* ─── Discovery Engine ─── */
async function disc(){const b=el('btn-discover');if(!A.sub&&A.cr<=0){om('m-premium');return}b.innerHTML='<span class="material-symbols-outlined" style="font-size:18px;animation:spin 1s linear infinite">progress_activity</span> Scanning...';b.disabled=true;
try{const pos=await new Promise((r,j)=>navigator.geolocation.getCurrentPosition(r,j,{enableHighAccuracy:true,timeout:1e4}));const{latitude:la,longitude:ln}=pos.coords;if(map){map.panTo({lat:la,lng:ln});map.setZoom(15)}el('sonar').style.display='block';
if(!ps&&map)ps=new google.maps.places.PlacesService(map);if(!ps)throw 0;const rq={location:new google.maps.LatLng(la,ln),radius:2e3};if(A.cat)rq.type=A.cat;else rq.keyword='hidden gem local favorite';
const res=await new Promise((r,j)=>{ps.nearbySearch(rq,(x,s)=>{if(s==='OK')r(x);else if(s==='ZERO_RESULTS')r([]);else j(s)})});if(!res.length){toast('No places found. Try another category.');rb();return}
let c=res.filter(p=>(p.rating||0)>=4);if(!c.length)c=res;const t=c[Math.floor(Math.random()*c.length)],pL=t.geometry.location.lat(),pN=t.geometry.location.lng(),di=hv(la,ln,pL,pN);
A.p={name:t.name||'Hidden Gem',type:t.types?.[0]||A.cat||'Discovery',address:t.vicinity||'A local favorite',distance:fd(di)+' away',distKm:di,description:t.rating?`★ ${t.rating} — Highly rated by locals`:'A secret local spot.',lat:pL,lng:pN,at:new Date()};
fs(A.p);const mk=new google.maps.Marker({position:{lat:pL,lng:pN},map,icon:{path:google.maps.SymbolPath.CIRCLE,scale:10,fillColor:COL[A.p.type]||'#3AAFFF',fillOpacity:1,strokeColor:'#FFF',strokeWeight:3},animation:google.maps.Animation.DROP});mk.addListener('click',()=>{A.p&&(fs(A.p),os())});A.mk.push(mk);
if(map)map.panTo({lat:pL,lng:pN});os();A.h.unshift(A.p);rh();if(!A.sub){A.cr--;el('credits').textContent=A.cr+' Credit'+(A.cr===1?'':'s')}}catch(e){console.error(e);toast('Enable location to discover places.')}rb()}
function rb(){const b=el('btn-discover');b.innerHTML='<span class="material-symbols-outlined" style="font-size:18px">explore</span> Discover Places';b.disabled=false}

/* ─── History ─── */
function rh(){const l=el('hist');if(!l||!A.h.length)return;l.innerHTML=A.h.map(p=>`<div class="lens" style="border-radius:20px;padding:24px;margin-bottom:16px"><p class="meta" style="margin-bottom:8px;color:var(--ac)">${(p.type||'Discovery').toUpperCase()} · ${p.at?new Date(p.at).toLocaleDateString('en-US',{month:'short',day:'numeric'}):'Today'}</p><h3 class="place" style="font-size:1.3rem;margin-bottom:8px">${p.name}</h3><p class="body" style="font-size:13px">${p.description||''}</p></div>`).join('')} window.rh=rh;

/* ─── Theme ─── */
function thm(t){A.th=t;localStorage.setItem('wt',t);document.documentElement.classList.toggle('light',t==='light');document.querySelector('meta[name=theme-color]').content=t==='light'?'#EEF1F5':'#080B12';if(map)map.setOptions({styles:t==='light'?LIGHT:DARK})}

/* ─── Neural Canvas ─── */
function initCV(){const c=el('cv');if(!c)return;const x=c.getContext('2d');let N=[];const P=['#FF9B8E','#86EFAC','#C4B5FD','#93C5FD','#FFC78E'];
function rs(){c.width=c.parentElement.offsetWidth;c.height=c.parentElement.offsetHeight;N=[];const n=Math.floor(c.width*c.height/20e3);for(let i=0;i<n;i++)N.push({x:Math.random()*c.width,y:Math.random()*c.height,r:2+Math.random()*5,cl:P[Math.floor(Math.random()*P.length)],ph:Math.random()*Math.PI*2,sp:.002+Math.random()*.003})}
function dr(t){x.clearRect(0,0,c.width,c.height);x.lineWidth=.4;for(let i=0;i<N.length;i++)for(let j=i+1;j<N.length;j++){const dx=N[i].x-N[j].x,dy=N[i].y-N[j].y,d=Math.sqrt(dx*dx+dy*dy);if(d<130){x.strokeStyle=`rgba(255,255,255,${(1-d/130)*.25})`;x.beginPath();x.moveTo(N[i].x,N[i].y);x.lineTo(N[j].x,N[j].y);x.stroke()}}
for(const n of N){const s=1+.06*Math.sin(t*n.sp*2+n.ph),r=n.r*s;x.beginPath();x.arc(n.x,n.y,r+3,0,Math.PI*2);x.fillStyle='rgba(255,255,255,.06)';x.fill();const g=x.createRadialGradient(n.x,n.y,0,n.x,n.y,r);g.addColorStop(0,n.cl);g.addColorStop(1,'rgba(255,255,255,0)');x.beginPath();x.arc(n.x,n.y,r,0,Math.PI*2);x.fillStyle=g;x.fill()}requestAnimationFrame(dr)}
window.addEventListener('resize',rs);rs();dr(0)}

/* ─── Init ─── */
document.addEventListener('DOMContentLoaded',()=>{
thm(A.th);
// Hide watermarks
const ws=document.createElement('style');ws.innerHTML='.dismissButton,.gm-err-container,.gm-style-mtc{display:none!important}';document.head.appendChild(ws);setInterval(()=>{document.querySelectorAll('.gm-style div').forEach(d=>{if(d.innerHTML?.includes('development purposes'))d.style.display='none'})},500);window.gm_authFailure=()=>{};

// Discovery
el('btn-discover')?.addEventListener('click',disc);
el('btn-nav')?.addEventListener('click',()=>{if(!A.p)return;const{lat:a,lng:b,name:n,address:d}=A.p;window.open(/iPhone|iPad/i.test(navigator.userAgent)?`http://maps.apple.com/?q=${encodeURIComponent(n)}&ll=${a},${b}`:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(n+' '+d)}`,'_blank');cs()});
el('btn-save')?.addEventListener('click',()=>{if(!A.p)return;const b=el('btn-save');if(A.sv.find(x=>x.name===A.p.name)){b.innerHTML='<span class="material-symbols-outlined" style="font-size:16px">check</span> Saved';return}A.sv.push({...A.p});b.innerHTML='<span class="material-symbols-outlined" style="font-size:16px">bookmark_added</span> Saved!';setTimeout(()=>{b.innerHTML='<span class="material-symbols-outlined" style="font-size:16px">bookmark</span> Save'},2e3)});

// Auth
el('btn-try')?.addEventListener('click',()=>{el('auth-gate').classList.add('hidden');setTimeout(pz,400)});
el('btn-login-open')?.addEventListener('click',()=>el('login-sl').classList.add('open'));
el('btn-lb')?.addEventListener('click',()=>el('login-sl').classList.remove('open'));
el('btn-ls')?.addEventListener('click',()=>{if(!el('l-em').value.trim()||!el('l-pw').value){toast('Please fill in all fields.');return}const b=el('btn-ls');b.textContent='Signing in...';b.disabled=true;setTimeout(()=>{el('login-sl').classList.remove('open');el('auth-gate').classList.add('hidden');b.textContent='Sign In';b.disabled=false;toast('Welcome back, Explorer!');setTimeout(pz,400)},1500)});

// Forgot
el('btn-fo')?.addEventListener('click',()=>el('forgot-sl').classList.add('open'));
el('btn-fb')?.addEventListener('click',()=>{el('forgot-sl').classList.remove('open');el('f-msg').classList.add('hidden')});
el('btn-fs')?.addEventListener('click',()=>{if(!el('f-em').value.trim()){toast('Please enter your email.');return}const b=el('btn-fs');b.textContent='Sending...';b.disabled=true;setTimeout(()=>{b.textContent='Send Recovery Link';b.disabled=false;el('f-msg').classList.remove('hidden')},1500)});

// Profile
el('btn-sp')?.addEventListener('click',()=>{if(el('pf-p').value&&el('pf-p').value!==el('pf-p2').value){toast('Passwords do not match.');return}const b=el('btn-sp');b.textContent='Saving...';b.disabled=true;setTimeout(()=>{const n=el('pf-n')?.value.trim();if(n)el('dname').textContent=n;b.textContent='Save Changes';b.disabled=false;toast('Profile updated.')},1200)});

// Payment
el('btn-pay')?.addEventListener('click',()=>{const f=el('pf');if(!f.checkValidity()){f.reportValidity();return}const b=el('btn-pay');b.textContent='Verifying...';b.disabled=true;setTimeout(()=>{b.textContent='Authorized ✓';A.sub=true;A.cr=999;setTimeout(()=>{cm('m-checkout');el('credits').textContent='Premium';b.textContent='Confirm Payment';b.disabled=false;toast('Welcome to Premium!')},1400)},2200)});

// Toggles
document.querySelectorAll('.plb').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.plb').forEach(x=>{x.style.background='transparent';x.style.color='var(--tx3)'});b.style.background='linear-gradient(135deg,var(--ac),#5B8DEF)';b.style.color='#fff';A.plan=b.dataset.pl;el('ptot').textContent=A.plan==='annual'?'200.00 CHF':'20.00 CHF';el('pcyc').textContent=A.plan==='annual'?'Annually':'Monthly'}));
document.querySelectorAll('.ub').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.ub').forEach(x=>{x.style.background='transparent';x.style.color='var(--tx3)'});b.style.background='linear-gradient(135deg,var(--ac),#5B8DEF)';b.style.color='#fff';A.unit=b.dataset.u==='feet'?'ft':'m';if(A.p?.distKm!==undefined)el('s-dist').textContent=fd(A.p.distKm)+' away'}));
document.querySelectorAll('.thb').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.thb').forEach(x=>{x.style.background='transparent';x.style.color='var(--tx3)'});b.style.background='linear-gradient(135deg,var(--ac),#5B8DEF)';b.style.color='#fff';thm(b.dataset.th)}));
document.querySelectorAll('.thb').forEach(b=>{if(b.dataset.th===A.th){b.style.background='linear-gradient(135deg,var(--ac),#5B8DEF)';b.style.color='#fff'}});

// Haptics
document.addEventListener('pointerdown',e=>{if(e.target.closest('button')&&navigator.vibrate)navigator.vibrate(8)});

setTimeout(initCV,500);
console.log('Wanderlost v65 · Premium Engine');
});
