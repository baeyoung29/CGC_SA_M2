(function(){
const canvas=document.getElementById('scene');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x8fd3ff);
scene.fog=new THREE.Fog(0x8fd3ff,38,70);
const camera=new THREE.PerspectiveCamera(42,1,0.1,200);
camera.position.set(0,20,17);
const controls=new THREE.OrbitControls(camera,canvas);
controls.target.set(0,0,1); controls.enableDamping=true; controls.enablePan=false;
controls.minDistance=10; controls.maxDistance=40; controls.maxPolarAngle=1.15; controls.minPolarAngle=0.35;

scene.add(new THREE.HemisphereLight(0xdff4ff,0x5a8a3a,0.75));
const sun=new THREE.DirectionalLight(0xfff2d6,0.95);
sun.position.set(-12,24,10); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:1,far:70});
scene.add(sun);

let seed=7; const rnd=()=>((seed=(seed*16807)%2147483647)/2147483647);

const S=1.0, SQ3=Math.sqrt(3);
const key=(q,r)=>q+','+r;
const toWorld=(q,r)=>({x:S*SQ3*(q+r/2), z:S*1.5*r});
const dist=(a,b)=>Math.max(Math.abs(a.q-b.q),Math.abs(a.r-b.r),Math.abs((a.q+a.r)-(b.q+b.r)));
const DIRS=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
function hexRound(q,r){let s=-q-r,rq=Math.round(q),rr=Math.round(r),rs=Math.round(s);
  const dq=Math.abs(rq-q),dr=Math.abs(rr-r),ds=Math.abs(rs-s);
  if(dq>dr&&dq>ds)rq=-rr-rs;else if(dr>ds)rr=-rq-rs;return{q:rq,r:rr};}
function hexLine(a,b){const n=dist(a,b),out=[];for(let i=0;i<=n;i++){const t=n?i/n:0;
  out.push(hexRound(a.q+(b.q-a.q)*t+1e-6,a.r+(b.r-a.r)*t+1e-6));}return out;}

const R=8;
const nodes=[
  {q:-6,r:2,name:'Stage 1 · Pinwheel Rise',kind:'windmill',stars:5},
  {q:-2,r:3,name:'Stage 2 · Toadstool Hollow',kind:'mushroom',stars:3},
  {q:0,r:0,name:'Stage 3 · Crystal Spring',kind:'crystal',stars:2},
  {q:-1,r:-4,name:'Stage 4 · Lantern Point',kind:'lighthouse',stars:0},
  {q:4,r:-1,name:'Stage 5 · Hollow Log',kind:'log',stars:0},
  {q:6,r:2,name:'Bonus · Kite Field',kind:'kite',stars:0},
];
const segs=[[0,1],[1,2],[2,3],[2,4],[4,5]];
const pathSet=new Map();
segs.forEach(([a,b])=>hexLine(nodes[a],nodes[b]).forEach(c=>pathSet.set(key(c.q,c.r),c)));
const nodeAt=new Map(nodes.map((n,i)=>[key(n.q,n.r),i]));
const pond={q:4,r:-6}, checkerCenters=[{q:-4,r:-2},{q:2,r:4},{q:-6,r:6},{q:6,r:-4},{q:1,r:-7}];
const plateaus=[{q:-3,r:-5},{q:-7,r:5},{q:3,r:5}];

function checkerTex(a,b){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){g.fillStyle=(x+y)%2?a:b;g.fillRect(x*16,y*16,16,16);}
  const t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;return t;}
const M=(c,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.85,flatShading:true},o));
const mat={
  grassA:M(0x4fcb4e),grassB:M(0x3fb447),grassC:M(0x5fd85a),
  side:M(0x8a5a2b),sideDark:M(0x6e4520),
  dirt:M(0xb97a3f),pathIn:M(0x6fe06a),
  checker:new THREE.MeshStandardMaterial({map:checkerTex('#e9b671','#d39a52'),roughness:.9}),
  water:new THREE.MeshStandardMaterial({color:0x4fc6f0,roughness:.2,metalness:.1,transparent:true,opacity:.85}),
  white:M(0xffffff),ink:M(0x1d2b3a),
};

const tileGeoCache={};
const hexGeo=(rad,h)=>{const k=rad+'_'+h;return tileGeoCache[k]||(tileGeoCache[k]=new THREE.CylinderGeometry(rad,rad,h,6));};
const cells=new Map(), pickables=[];
for(let q=-R;q<=R;q++)for(let r=-R;r<=R;r++){
  const c={q,r}; if(dist(c,{q:0,r:0})>R)continue;
  const edge=dist(c,{q:0,r:0})===R; if(edge&&rnd()<.35)continue;
  const k=key(q,r), w=toWorld(q,r);
  const isPath=pathSet.has(k), isPond=dist(c,pond)<=1.6&&!isPath;
  const isChecker=!isPath&&!isPond&&checkerCenters.some(p=>dist(c,p)<=1)&&rnd()<.85;
  const isPlateau=!isPath&&!isPond&&plateaus.some(p=>dist(c,p)<=1);
  let h=isPond?0.25:isPlateau?1.25:0.55+((q*3+r*5)%3)*0.03;
  const g=new THREE.Group(); g.position.set(w.x,0,w.z); scene.add(g);
  const topMat=isChecker?mat.checker:[mat.grassA,mat.grassB,mat.grassC][(q-r+30)%3];
  const base=new THREE.Mesh(hexGeo(.97,h),[isPlateau?mat.sideDark:mat.side,isPond?mat.side:isPath?mat.dirt:topMat,mat.side]);
  base.position.y=h/2; base.castShadow=isPlateau; base.receiveShadow=true; g.add(base);
  if(isPond){const wtr=new THREE.Mesh(hexGeo(.99,.22),mat.water);wtr.position.y=h+.05;g.add(wtr);g.userData.water=wtr;}
  if(isPath){const inner=new THREE.Mesh(hexGeo(.64,.04),mat.pathIn);inner.position.y=h+.02;inner.receiveShadow=true;g.add(inner);}
  const cell={q,r,h,group:g,isPath,isPond,top:h+(isPath?.04:0)};
  cells.set(k,cell);
  if(isPath){base.userData.cell=cell;pickables.push(base);}
  // decoration
  if(!isPath&&!isPond&&!nodeAt.has(k)){
    const roll=rnd();
    if(roll<.16)addFlower(g,h); else if(roll<.24)addTree(g,h); else if(roll<.29)addRock(g,h); else if(roll<.36)addTuft(g,h);
  }
}

function addFlower(g,h){const f=new THREE.Group();
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.5,5),M(0x2e8b3a));stem.position.y=.25;f.add(stem);
  const col=[0xfff176,0xffffff,0xff8fb1,0xffb74d][Math.floor(rnd()*4)];
  for(let i=0;i<6;i++){const p=new THREE.Mesh(new THREE.SphereGeometry(.1,6,4),M(col));const a=i/6*Math.PI*2;p.position.set(Math.cos(a)*.14,.52,Math.sin(a)*.14);p.scale.y=.4;f.add(p);}
  const mid=new THREE.Mesh(new THREE.SphereGeometry(.08,6,4),M(0xff9f1c));mid.position.y=.54;f.add(mid);
  f.position.set((rnd()-.5)*.8,h,(rnd()-.5)*.8);f.traverse(o=>o.castShadow=true);g.add(f);g.userData.sway=f;}
function addTree(g,h){const t=new THREE.Group();
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.09,.13,.6,6),M(0x8a5a2b));trunk.position.y=.3;t.add(trunk);
  [[0,.85,0,.45],[.22,.7,.1,.32],[-.2,.72,-.08,.3]].forEach(([x,y,z,s])=>{const b=new THREE.Mesh(new THREE.IcosahedronGeometry(s,0),M(0x2fa84a));b.position.set(x,y,z);t.add(b);});
  t.position.set((rnd()-.5)*.6,h,(rnd()-.5)*.6);t.traverse(o=>o.castShadow=true);g.add(t);}
function addRock(g,h){const r=new THREE.Mesh(new THREE.DodecahedronGeometry(.22,0),M(0xbfc6cc));r.scale.y=.6;r.position.set((rnd()-.5)*.6,h+.08,(rnd()-.5)*.6);r.castShadow=true;g.add(r);}
function addTuft(g,h){for(let i=0;i<3;i++){const b=new THREE.Mesh(new THREE.ConeGeometry(.06,.3,4),M(0x2e9e3e));b.position.set((rnd()-.5)*.5,h+.15,(rnd()-.5)*.5);b.rotation.z=(rnd()-.5)*.6;g.add(b);}}

const spinners=[];
nodes.forEach((n,i)=>{
  const cell=cells.get(key(n.q,n.r)); const g=cell.group, y=cell.top;
  const ped=new THREE.Mesh(hexGeo(.6,.14),M(0xffffff));ped.position.y=y+.07;g.add(ped);
  const lm=new THREE.Group(); lm.position.set(0,y+.14,0); g.add(lm);
  if(n.kind==='windmill'){const tw=new THREE.Mesh(new THREE.CylinderGeometry(.18,.3,1.3,8),M(0xf3e3c3));tw.position.y=.65;lm.add(tw);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(.28,.35,8),M(0xd9534f));roof.position.y=1.47;lm.add(roof);
    const hub=new THREE.Group();hub.position.set(0,1.15,.3);for(let b=0;b<4;b++){const bl=new THREE.Mesh(new THREE.BoxGeometry(.12,.75,.03),M(b%2?0xffffff:0x5bc0eb));bl.position.y=.38;const arm=new THREE.Group();arm.rotation.z=b*Math.PI/2;arm.add(bl);hub.add(arm);}lm.add(hub);spinners.push(hub);}
  if(n.kind==='mushroom'){const st=new THREE.Mesh(new THREE.CylinderGeometry(.2,.26,.6,8),M(0xfff3d6));st.position.y=.3;lm.add(st);
    const cap=new THREE.Mesh(new THREE.SphereGeometry(.55,12,8,0,Math.PI*2,0,Math.PI/2),M(0x9b5de5));cap.position.y=.55;lm.add(cap);
    for(let d=0;d<5;d++){const dot=new THREE.Mesh(new THREE.SphereGeometry(.08,6,4),M(0xffffff));const a=d/5*Math.PI*2;dot.position.set(Math.cos(a)*.38,.85,Math.sin(a)*.38);lm.add(dot);}
    const door=new THREE.Mesh(new THREE.BoxGeometry(.16,.24,.02),M(0x8a5a2b));door.position.set(0,.14,.25);lm.add(door);}
  if(n.kind==='crystal'){const cr=new THREE.Mesh(new THREE.OctahedronGeometry(.42,0),new THREE.MeshStandardMaterial({color:0x7ee8fa,roughness:.1,metalness:.2,emissive:0x2a9fd6,emissiveIntensity:.35,flatShading:true}));cr.position.y=.75;cr.scale.y=1.5;lm.add(cr);spinners.push(cr);
    for(let k=0;k<3;k++){const s=new THREE.Mesh(new THREE.OctahedronGeometry(.16,0),cr.material);const a=k/3*Math.PI*2;s.position.set(Math.cos(a)*.38,.18,Math.sin(a)*.38);s.scale.y=1.6;lm.add(s);}}
  if(n.kind==='lighthouse'){for(let s=0;s<4;s++){const b=new THREE.Mesh(new THREE.CylinderGeometry(.26-s*.03,.29-s*.03,.32,10),M(s%2?0xffffff:0xe63946));b.position.y=.16+s*.32;lm.add(b);}
    const lamp=new THREE.Mesh(new THREE.SphereGeometry(.17,10,8),new THREE.MeshStandardMaterial({color:0xfff3a0,emissive:0xffd23f,emissiveIntensity:.9}));lamp.position.y=1.42;lm.add(lamp);
    const cap=new THREE.Mesh(new THREE.ConeGeometry(.22,.24,10),M(0x1d2b3a));cap.position.y=1.66;lm.add(cap);}
  if(n.kind==='log'){const lg=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,1.1,12,1,true),M(0x8a5a2b,{side:THREE.DoubleSide}));lg.rotation.z=Math.PI/2;lg.position.y=.36;lm.add(lg);
    [-.55,.55].forEach(x=>{const ringM=new THREE.Mesh(new THREE.RingGeometry(.22,.34,12),M(0xe9c48a,{side:THREE.DoubleSide}));ringM.rotation.y=Math.PI/2;ringM.position.set(x,.36,0);lm.add(ringM);});
    const moss=new THREE.Mesh(new THREE.SphereGeometry(.2,6,4),M(0x3fb447));moss.position.set(.1,.68,0);moss.scale.set(1.6,.5,1);lm.add(moss);}
  if(n.kind==='kite'){const pole=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,1.6,5),M(0xffffff));pole.position.y=.8;lm.add(pole);
    const kite=new THREE.Mesh(new THREE.OctahedronGeometry(.32,0),M(0xffc93c));kite.scale.set(1,1.4,.15);kite.position.set(.35,1.55,0);lm.add(kite);spinners.push(kite);}
  lm.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  const pips=new THREE.Group();pips.position.set(0,y+2.2,0);
  for(let p=0;p<5;p++){const pip=new THREE.Mesh(new THREE.SphereGeometry(.11,10,8),p<n.stars?M(0xffc93c,{emissive:0x8a5a00,emissiveIntensity:.3}):M(0x45505c));pip.position.x=(p-2)*.3;pips.add(pip);}
  g.add(pips); n.pips=pips;
});

const gems=[];
[...pathSet.values()].forEach(c=>{const k=key(c.q,c.r);if(nodeAt.has(k)||rnd()>.4)return;
  const cell=cells.get(k);const gm=new THREE.Mesh(new THREE.OctahedronGeometry(.18,0),new THREE.MeshStandardMaterial({color:0xff5d6c,emissive:0x8a1020,emissiveIntensity:.4,roughness:.2,flatShading:true}));
  gm.position.set(0,cell.top+.5,0);gm.castShadow=true;cell.group.add(gm);cell.gem=gm;gems.push(gm);});

const hero=new THREE.Group();
{const body=new THREE.Mesh(new THREE.SphereGeometry(.38,16,12),M(0xff8a3d,{flatShading:false}));body.scale.set(1,1.15,1);body.position.y=.44;hero.add(body);
 const belly=new THREE.Mesh(new THREE.SphereGeometry(.28,14,10),M(0xfff1d6,{flatShading:false}));belly.position.set(0,.38,.16);belly.scale.set(1,1,.6);hero.add(belly);
 [-.13,.13].forEach(x=>{const e=new THREE.Mesh(new THREE.SphereGeometry(.09,10,8),M(0xffffff,{flatShading:false}));e.position.set(x,.6,.3);hero.add(e);
   const p=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),mat.ink);p.position.set(x,.6,.38);hero.add(p);});
 const scarf=new THREE.Mesh(new THREE.TorusGeometry(.3,.06,6,16),M(0x2a9d8f));scarf.rotation.x=Math.PI/2;scarf.position.y=.3;hero.add(scarf);
 const leaf=new THREE.Mesh(new THREE.SphereGeometry(.12,8,6),M(0x4cc552));leaf.scale.set(.5,1.4,.2);leaf.position.set(0,.95,0);leaf.rotation.z=.4;hero.add(leaf);
 [-.15,.15].forEach(x=>{const f=new THREE.Mesh(new THREE.SphereGeometry(.12,8,6),M(0x7a3b1e));f.scale.set(1,.5,1.4);f.position.set(x,.05,.05);hero.add(f);});
 hero.traverse(o=>{if(o.isMesh)o.castShadow=true;});}
scene.add(hero);

const ringGeo=new THREE.RingGeometry(.74,.95,6,1,Math.PI/2);
const selRing=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide}));selRing.rotation.x=-Math.PI/2;scene.add(selRing);
const hovRing=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:0xffe066,transparent:true,opacity:.75,side:THREE.DoubleSide}));hovRing.rotation.x=-Math.PI/2;hovRing.visible=false;scene.add(hovRing);
const placeRing=(ring,cell)=>{const w=toWorld(cell.q,cell.r);ring.position.set(w.x,cell.top+.03,w.z);};

const clouds=[];
for(let i=0;i<7;i++){const c=new THREE.Group();for(let j=0;j<4;j++){const s=new THREE.Mesh(new THREE.SphereGeometry(.9+rnd()*.6,10,8),new THREE.MeshLambertMaterial({color:0xffffff}));s.position.set(j*1.1-1.6,rnd()*.4,(rnd()-.5));s.scale.y=.6;c.add(s);}
  c.position.set((rnd()-.5)*40,7+rnd()*3,(rnd()-.5)*30);c.userData.v=.3+rnd()*.4;scene.add(c);clouds.push(c);}

let current=cells.get(key(nodes[0].q,nodes[0].r));
const heroAt=c=>{const w=toWorld(c.q,c.r);hero.position.set(w.x,c.top,w.z);};
heroAt(current); placeRing(selRing,current);
let queue=[],hop=null;
function bfs(from,to){const start=key(from.q,from.r),goal=key(to.q,to.r),prev=new Map([[start,null]]),qu=[start];
  while(qu.length){const k=qu.shift();if(k===goal)break;const[q,r]=k.split(',').map(Number);
    for(const[dq,dr]of DIRS){const nk=key(q+dq,r+dr);if(pathSet.has(nk)&&!prev.has(nk)){prev.set(nk,k);qu.push(nk);}}}
  if(!prev.has(goal))return[];const out=[];for(let k=goal;k&&k!==start;k=prev.get(k))out.unshift(cells.get(k));return out;}
const stageEl=document.getElementById('stage'),gemsEl=document.getElementById('gems'),toastEl=document.getElementById('toast');
let gemCount=0,toastT;
function toast(t){toastEl.textContent=t;toastEl.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>toastEl.classList.remove('on'),1200);}
function showStage(){const i=nodeAt.get(key(current.q,current.r));
  if(i===undefined){stageEl.dataset.empty='1';return;}
  const n=nodes[i];stageEl.textContent=n.name+'  ·  '+'★'.repeat(n.stars)+'☆'.repeat(5-n.stars);stageEl.dataset.empty='0';}
showStage();
function goTo(cell){if(hop)return;queue=bfs(current,cell);placeRing(selRing,cell);stageEl.dataset.empty='1';}

const ray=new THREE.Raycaster(),ptr=new THREE.Vector2();let downAt=null;
function pick(e){const r=canvas.getBoundingClientRect();ptr.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ptr,camera);
  const hit=ray.intersectObjects(pickables,false)[0];return hit&&hit.object.userData.cell;}
canvas.addEventListener('pointerdown',e=>downAt=[e.clientX,e.clientY]);
canvas.addEventListener('pointerup',e=>{if(!downAt)return;const moved=Math.hypot(e.clientX-downAt[0],e.clientY-downAt[1]);downAt=null;if(moved<6){const c=pick(e);if(c)goTo(c);}});
canvas.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const c=pick(e);hovRing.visible=!!c;if(c)placeRing(hovRing,c);canvas.style.cursor=c?'pointer':'grab';});

function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<h?58:42;camera.updateProjectionMatrix();}
addEventListener('resize',resize);resize();
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const clock=new THREE.Clock();
function tick(){const dt=Math.min(clock.getDelta(),.05),t=clock.elapsedTime;
  if(!hop&&queue.length){const to=queue.shift();hop={from:current,to,t:0};
    const a=toWorld(current.q,current.r),b=toWorld(to.q,to.r);hero.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);}
  if(hop){hop.t+=dt/(reduce?.12:.26);const k=Math.min(hop.t,1),a=toWorld(hop.from.q,hop.from.r),b=toWorld(hop.to.q,hop.to.r);
    hero.position.x=a.x+(b.x-a.x)*k;hero.position.z=a.z+(b.z-a.z)*k;
    hero.position.y=hop.from.top+(hop.to.top-hop.from.top)*k+Math.sin(k*Math.PI)*.55;
    hero.scale.set(1,1+Math.sin(k*Math.PI)*.12,1);
    if(k>=1){current=hop.to;hop=null;hero.scale.set(1,1,1);
      if(current.gem){current.group.remove(current.gem);gems.splice(gems.indexOf(current.gem),1);current.gem=null;gemsEl.textContent=++gemCount;}
      if(!queue.length){showStage();const i=nodeAt.get(key(current.q,current.r));if(i!==undefined)toast(nodes[i].name.split('·')[0].trim());}}}
  else if(!reduce){hero.position.y=current.top+Math.abs(Math.sin(t*3))*.04;}
  if(!reduce){
    spinners.forEach((s,i)=>{if(s.geometry&&s.geometry.type==='OctahedronGeometry')s.rotation.y+=dt*(i%2?1.5:.8);else s.rotation.z+=dt*2;});
    gems.forEach((g,i)=>{g.rotation.y+=dt*2;g.position.y=g.parent&&cells?g.position.y+Math.sin(t*2.5+i)*.003:g.position.y;});
    nodes.forEach((n,i)=>n.pips.position.y+=Math.sin(t*2+i)*.002);
    clouds.forEach(c=>{c.position.x+=c.userData.v*dt;if(c.position.x>24)c.position.x=-24;});
    cells.forEach(c=>{if(c.group.userData.water)c.group.userData.water.position.y=c.h+.05+Math.sin(t*1.6+c.q+c.r)*.025;
      if(c.group.userData.sway)c.group.userData.sway.rotation.z=Math.sin(t*2+c.q*.7)*.08;});
    selRing.material.opacity=1;selRing.scale.setScalar(1+Math.sin(t*4)*.03);
  }
  controls.update();renderer.render(scene,camera);requestAnimationFrame(tick);}
tick();
})();