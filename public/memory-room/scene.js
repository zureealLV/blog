import * as THREE from './vendor/three.module.min.js';

export class MemoryScene {
 constructor({canvas,labels,onTopic,onPost,onError,isQuiet,onViewSettled}) {
  Object.assign(this,{canvas,labels,onTopic,onPost,onError,isQuiet,onViewSettled});
  this.scene = new THREE.Scene();
  this.camera = new THREE.PerspectiveCamera(48,1,.1,200);
  this.state = {target:[0,0,0],distance:30,yaw:.08,pitch:.08};
  this.mode='overview';this.topic=null;this.selected=null;this.nodes=[];this.regions=[];this.filtered=new Set();
  this.frames=[];this.frameTimes=[];this.lastFrame=null;this.enabled=true;this.pending=0;this.animation=null;
  this.vector = new THREE.Vector3();this.ray = new THREE.Raycaster();
  this.articleLabels=new Map();
  try {
   if(new URLSearchParams(location.search).has('no-webgl')) throw Error('WebGL disabled by test switch');
   this.renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
   this.renderer.setClearColor(0,0);this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  } catch { this.enabled=false;queueMicrotask(()=>onError('WebGL 不可用')); }
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.setEnabled(false);onError('图形上下文已失去');});
  this.bindEvents();
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas.parentElement);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)this.invalidate();});
 }
 home() {return {target:[0,0,0],distance:innerWidth<700?45:26,yaw:.08,pitch:.08,mobile:innerWidth<700};}
 getView() {return {...structuredClone(this.state),mobile:innerWidth<700};}
 resize() {
  const r=this.canvas.getBoundingClientRect();this.width=r.width;this.height=r.height;
  const mobile=innerWidth<700;
  if(this.mobile!==undefined&&this.mobile!==mobile){this.animation=null;this.state.distance*=mobile?1.5:2/3;}
  this.mobile=mobile;
  this.camera.aspect=r.width/Math.max(1,r.height);this.camera.updateProjectionMatrix();
  this.renderer?.setSize(r.width,r.height,false);this.invalidate();
 }
 setEnabled(enabled) {this.enabled=enabled&&!!this.renderer;this.canvas.hidden=!this.enabled;this.labels.hidden=!this.enabled;if(this.enabled)this.invalidate();}
 clearObjects() {
  for(const child of [...this.scene.children]) {
   child.traverse(obj=>{if(obj.geometry)obj.geometry.dispose();if(obj.material)obj.material.dispose();});
   this.scene.remove(child);
  }
  this.labels.replaceChildren();this.articleLabels.clear();this.nodes=[];this.regions=[];
 }
 setData(index) {
  this.clearObjects();this.index=index;
  for(const t of index.topics) {
   const count=index.posts.filter(p=>p.topic===t.id).length;if(!count)continue;
   const points=[];
   for(let i=0;i<=96;i++){const a=i/96*Math.PI*2;points.push(new THREE.Vector3(t.center[0]+Math.cos(a)*3.8,t.center[1]+Math.sin(a)*.85,t.center[2]+Math.sin(a)*2.9));}
   const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:t.color,transparent:true,opacity:.17}));
   this.scene.add(orbit);
   const button=document.createElement('button');button.className='space-button';button.setAttribute('aria-label',`靠近${t.name}，${count}篇`);button.title=`${t.name} · ${count}篇`;
   const ring=document.createElement('span');ring.className='ring';ring.setAttribute('aria-hidden','true');
   const label=document.createElement('span');label.className='name';label.textContent=t.name;button.append(ring,label);button.style.color=t.color;
   button.onclick=()=>this.onTopic(t.id);this.labels.append(button);
   this.regions.push({topic:t,button,orbit});
  }
  const positions=[],colors=[];
  for(const post of index.posts) {
   const topic=index.topics.find(t=>t.id===post.topic);
   const mesh=new THREE.Object3D();
   mesh.position.fromArray(post.position);mesh.userData.post=post;
   positions.push(...post.position);const color=new THREE.Color(topic.color);colors.push(color.r,color.g,color.b);
   this.nodes.push({post,mesh});
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setAttribute('alpha',new THREE.Float32BufferAttribute(new Float32Array(index.posts.length).fill(1),1));
  geometry.setAttribute('size',new THREE.Float32BufferAttribute(new Float32Array(index.posts.length).fill(1),1));
  this.points=new THREE.Points(geometry,new THREE.ShaderMaterial({transparent:true,depthWrite:false,vertexColors:true,
   uniforms:{ratio:{value:Math.min(devicePixelRatio,1.5)}},
   vertexShader:`attribute float alpha; attribute float size; varying vec3 tint; varying float opacity; uniform float ratio;
    void main(){vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=clamp(260.0*size/max(1.0,-mv.z),3.0,28.0)*ratio; tint=color; opacity=alpha;}`,
   fragmentShader:`varying vec3 tint; varying float opacity; void main(){float r=length(gl_PointCoord-vec2(.5))*2.0; if(r>1.0)discard;
    float core=1.0-smoothstep(.1,.43,r); float halo=pow(1.0-r,3.0)*.6; gl_FragColor=vec4(mix(tint,vec3(.91,1.,.97),core*.3),max(core,halo)*opacity);
    #include <colorspace_fragment>
    }`
  }));this.scene.add(this.points);this.ray.params.Points.threshold=.16;
  this.connections=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#c2e4d4',transparent:true,opacity:.36}));
  this.scene.add(this.connections);this.invalidate();
 }
 update({mode,topic,selected,visible,related=[]}) {
  Object.assign(this,{mode,topic,selected});this.filtered=new Set(visible.map(p=>p.id));
  this.neighbors=new Set(related.map(p=>p.id));
  const coordinates=[];
  if(selected){const a=this.index.posts.find(p=>p.id===selected);if(a)for(const b of related)coordinates.push(...a.position,...b.position);}
  this.connections?.geometry.dispose();
  if(this.connections)this.connections.geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(coordinates,3));
  this.invalidate();
 }
 moveTo(view,instant=false) {
  view=structuredClone(view);
  if(typeof view.mobile==='boolean'&&view.mobile!==(innerWidth<700))view.distance*=innerWidth<700?1.5:2/3;
  this.animation=null;
  if(instant||this.isQuiet()){this.state=structuredClone(view);this.invalidate();queueMicrotask(()=>this.onViewSettled?.());return;}
  this.animation={from:this.getView(),to:structuredClone(view),start:performance.now(),duration:720};this.invalidate();
 }
 focusTopic(id) {const t=this.index.topics.find(t=>t.id===id);this.moveTo({target:[...t.center],distance:innerWidth<700?16:12,yaw:this.state.yaw*.4,pitch:.08});}
 focusPost(post) {this.moveTo({target:[post.position[0],post.position[1]-(innerWidth<700?1.8:.7),post.position[2]],distance:innerWidth<700?8:6.3,yaw:this.state.yaw*.4,pitch:.07});}
 stop() {this.animation=null;this.invalidate();}
 project(position) {
  this.vector.fromArray(position).project(this.camera);
  return {x:(this.vector.x+1)*this.width/2,y:(1-this.vector.y)*this.height/2,z:this.vector.z,visible:this.vector.z<1&&this.vector.z>-1&&Math.abs(this.vector.x)<.94&&Math.abs(this.vector.y)<.93};
 }
 invalidate() {if(!this.pending&&this.enabled&&!document.hidden)this.pending=requestAnimationFrame(t=>this.draw(t));}
 draw(now) {
  this.pending=0;if(!this.enabled||document.hidden||!this.renderer)return;
  const start=performance.now();
  if(this.animation){
   const {from,to,start,duration}=this.animation;let t=Math.min(1,(now-start)/duration);t=t*t*(3-2*t);
   this.state={target:from.target.map((v,i)=>v+(to.target[i]-v)*t),distance:from.distance+(to.distance-from.distance)*t,yaw:from.yaw+(to.yaw-from.yaw)*t,pitch:from.pitch+(to.pitch-from.pitch)*t};
   if(t>=1){this.animation=null;this.onViewSettled?.();}
  }
  const s=this.state,c=this.camera;
  c.position.set(s.target[0]+Math.sin(s.yaw)*Math.cos(s.pitch)*s.distance,s.target[1]+Math.sin(s.pitch)*s.distance,s.target[2]+Math.cos(s.yaw)*Math.cos(s.pitch)*s.distance);
  c.lookAt(...s.target);c.updateMatrixWorld();
  for(const [i,node] of this.nodes.entries()){
   const included=this.filtered.has(node.post.id), active=node.post.id===this.selected;
   const distance=node.mesh.position.distanceTo(c.position);
   const opacity=active?1:this.selected&&!this.neighbors.has(node.post.id)?.13:this.mode==='sector'&&node.post.topic!==this.topic?.16:.95;
   node.mesh.visible=included&&(active||distance>3.5);
   this.points.geometry.attributes.alpha.setX(i,node.mesh.visible?opacity:0);
   this.points.geometry.attributes.size.setX(i,active?1.35:this.mode==='memory'?.48:1);
  }
  if(this.points){this.points.geometry.attributes.alpha.needsUpdate=true;this.points.geometry.attributes.size.needsUpdate=true;}
  for(const r of this.regions){
   const p=this.project(r.topic.center),has=this.nodes.some(n=>n.post.topic===r.topic.id&&this.filtered.has(n.post.id));
   r.orbit.visible=has;r.orbit.material.opacity=this.mode==='overview'?.14:r.topic.id===this.topic?.16:.025;
   r.button.hidden=!p.visible||!has||this.mode==='memory'||(this.mode==='sector'&&r.topic.id!==this.topic);
   r.button.style.left=`${p.x}px`;r.button.style.top=`${p.y}px`;r.button.classList.toggle('active',this.mode==='sector');
   // In a sector the name is a contextual label, not an obstructive central hit target.
   if(this.mode==='sector')r.button.style.top=`${Math.max(40,p.y-130)}px`;
  }
  this.refreshLabels();
  this.renderer.render(this.scene,c);
  this.frames.push(performance.now()-start);if(this.frames.length>180)this.frames.shift();
  if(this.lastFrame!==null&&now-this.lastFrame<200)this.frameTimes.push(now-this.lastFrame);
  if(this.frameTimes.length>180)this.frameTimes.shift();this.lastFrame=now;
  if(this.animation)this.invalidate();
 }
 refreshLabels() {
  const used=new Set();
  if(this.mode==='overview'){for(const el of this.articleLabels.values())el.hidden=true;return;}
  const candidates=this.nodes.filter(n=>this.filtered.has(n.post.id)&&(this.mode==='memory'?n.post.id===this.selected||this.neighbors.has(n.post.id):n.post.topic===this.topic))
   .map(n=>({n,p:this.project(n.post.position),distance:n.mesh.position.distanceTo(this.camera.position)})).filter(x=>x.p.visible).sort((a,b)=>Number(b.n.post.id===this.selected)-Number(a.n.post.id===this.selected)||a.distance-b.distance);
  const occupied=[];
  for(const {n,p} of candidates){
   if(occupied.length>=7)break;
   if(occupied.some(o=>Math.abs(o.x-p.x)<170&&Math.abs(o.y-p.y)<48))continue;
   occupied.push(p);used.add(n.post.id);let button=this.articleLabels.get(n.post.id);
   if(!button){button=document.createElement('button');button.className='node-label';button.textContent=n.post.title;
    button.setAttribute('aria-label',`聚焦文章：${n.post.title}`);button.onclick=()=>this.onPost(n.post.id);this.labels.append(button);this.articleLabels.set(n.post.id,button);}
   button.hidden=false;
   button.style.left=`${Math.max(85,Math.min(this.width-85,p.x))}px`;button.style.top=`${p.y+28}px`;
  }
  for(const [id,button] of this.articleLabels)if(!used.has(id)&&document.activeElement!==button)button.hidden=true;
 }
 pick(x,y) {
  const r=this.canvas.getBoundingClientRect(),mx=x-r.left,my=y-r.top;
  if(this.mode==='overview') {
   const nearest=this.regions.map(t=>({t,p:this.project(t.topic.center)})).filter(v=>v.p.visible).sort((a,b)=>Math.hypot(a.p.x-mx,a.p.y-my)-Math.hypot(b.p.x-mx,b.p.y-my))[0];
   if(nearest&&Math.hypot(nearest.p.x-mx,nearest.p.y-my)<110)this.onTopic(nearest.t.topic.id);return;
  }
  // Projected pixel hit radius supplements real mesh raycasting for tiny touch targets.
  this.ray.setFromCamera(new THREE.Vector2(mx/this.width*2-1,1-my/this.height*2),this.camera);
  const hit=this.ray.intersectObject(this.points,false).find(h=>this.nodes[h.index].mesh.visible);
  if(hit){this.onPost(this.nodes[hit.index].post.id);return;}
  const near=this.nodes.filter(n=>n.mesh.visible).map(n=>({n,p:this.project(n.post.position)})).filter(n=>n.p.visible).sort((a,b)=>Math.hypot(a.p.x-mx,a.p.y-my)-Math.hypot(b.p.x-mx,b.p.y-my))[0];
  if(near&&Math.hypot(near.p.x-mx,near.p.y-my)<23)this.onPost(near.n.post.id);
 }
 bindEvents() {
  let drag=null;
  this.canvas.addEventListener('pointerdown',e=>{this.stop();drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};this.canvas.setPointerCapture(e.pointerId);});
  this.canvas.addEventListener('pointermove',e=>{
   if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
   if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>5)drag.moved=true;
   this.state.yaw-=dx*.003;this.state.pitch=Math.max(-.65,Math.min(.65,this.state.pitch+dy*.0025));drag.x=e.clientX;drag.y=e.clientY;this.invalidate();
  });
  this.canvas.addEventListener('pointerup',e=>{if(drag&&!drag.moved)this.pick(e.clientX,e.clientY);drag=null;});
  this.canvas.addEventListener('pointercancel',()=>{drag=null;});
  this.canvas.addEventListener('wheel',e=>{e.preventDefault();this.stop();this.state.distance=Math.max(3.5,Math.min(65,this.state.distance*Math.exp(e.deltaY*.001)));this.invalidate();},{passive:false});
  this.canvas.addEventListener('keydown',e=>{
   if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Enter'].includes(e.key)){e.preventDefault();this.stop();}
   if(e.key==='ArrowLeft')this.state.yaw-=.08;if(e.key==='ArrowRight')this.state.yaw+=.08;
   if(e.key==='ArrowUp')this.state.pitch=Math.min(.65,this.state.pitch+.05);if(e.key==='ArrowDown')this.state.pitch=Math.max(-.65,this.state.pitch-.05);
   if(e.key==='+'||e.key==='=')this.state.distance=Math.max(3.5,this.state.distance*.9);if(e.key==='-')this.state.distance=Math.min(65,this.state.distance*1.1);
   if(e.key==='Enter'){
    const candidates=this.mode==='overview'?this.regions.map(r=>({id:r.topic.id,p:this.project(r.topic.center)})):
     this.nodes.filter(n=>n.mesh.visible).map(n=>({id:n.post.id,p:this.project(n.post.position)}));
    const nearest=candidates.filter(n=>n.p.visible).sort((a,b)=>Math.hypot(a.p.x-this.width/2,a.p.y-this.height/2)-Math.hypot(b.p.x-this.width/2,b.p.y-this.height/2))[0];
    if(nearest)(this.mode==='overview'?this.onTopic:this.onPost)(nearest.id);
   }
   this.invalidate();
  });
 }
 metrics() {const mean=a=>a.length?a.reduce((a,b)=>a+b,0)/a.length:0;return {renderSamples:this.frames.length,meanRenderMs:+mean(this.frames).toFixed(2),animationSamples:this.frameTimes.length,meanAnimationFrameMs:+mean(this.frameTimes).toFixed(2),drawCalls:this.renderer?.info.render.calls||0,enabled:this.enabled};}
}
