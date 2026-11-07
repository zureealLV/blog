import { MemoryScene } from './scene.js';
const $=s=>document.querySelector(s);
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const storageKey='hermes-room-v5';
let index=null, selected=null, topic=null, mode='overview', trail=[], quiet=motion.matches, low=false, failedGL=false;
let speechTimer, blinkTimer, readerRequest=0, polling=false;
const filters={query:'',author:'',category:'',topic:''};
let saved=null;
try {saved=JSON.parse(sessionStorage.getItem(storageKey)||'null');quiet=motion.matches||saved?.quiet===true;low=saved?.low===true;} catch {}
const isQuiet=()=>quiet||motion.matches;
const scene=new MemoryScene({canvas:$('#scene'),labels:$('#labels'),onTopic:enterTopic,onPost:selectPost,onError:()=>{failedGL=true;setLow(true);},isQuiet,onViewSettled:remember});
const topicName=id=>index?.topics.find(t=>t.id===id)?.name||'未归类';
const announce=text=>{$('#live').textContent=text;};
function visiblePosts() {
 const q=filters.query.trim().toLocaleLowerCase();
 return (index?.posts||[]).filter(p=>(!filters.author||p.author===filters.author)&&(!filters.category||p.category===filters.category)&&(!filters.topic||p.topic===filters.topic)&&(!q||[p.title,p.description,p.summary,...p.tags,...p.keywords].join(' ').toLocaleLowerCase().includes(q)));
}
function relatedPosts(post) {
 if(!post)return [];
 const keys=new Set(post.keywords);
 return visiblePosts().filter(p=>p.id!==post.id).map(p=>({p,score:p.keywords.filter(k=>keys.has(k)).length+(p.topic===post.topic?2:0)}))
  .filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.p.id.localeCompare(b.p.id)).slice(0,3).map(x=>x.p);
}
function currentPost() {return index?.posts.find(p=>p.id===selected);}
function snapshot() {return {mode,topic,selected,view:scene.getView(),filters:{...filters}};}
function remember() {
 try {sessionStorage.setItem(storageKey,JSON.stringify({...snapshot(),trail,quiet,low}));}catch{}
}
function pushView() {trail.push(snapshot());if(trail.length>40)trail.shift();}
function syncScene() {
 scene.update({mode,topic,selected,visible:visiblePosts(),related:relatedPosts(currentPost())});
 $('#back').disabled=!trail.length;renderDetail();remember();
}
function enterTopic(id) {
 if(!index||!index.topics.some(t=>t.id===id))return;
 pushView();mode='sector';topic=id;selected=null;
 closeDialogs();syncScene();scene.focusTopic(id);announce(`进入${topicName(id)}。点击节点选择文章。`);
 if(low){filters.topic=id;syncFilterControls();openSearch();}
}
function selectPost(id) {
 const post=index?.posts.find(p=>p.id===id);if(!post)return;
 if(selected!==id)pushView();mode='memory';selected=id;topic=post.topic;
 closeDialogs();syncScene();scene.focusPost(post);$('#neighbors').hidden=true;
 $('#detail-title').focus({preventScroll:true});announce(`已选择${post.title}。${post.summary}`);
 // Quiet visual feedback; no unsolicited speech panel.
 setFrame('smirk');clearTimeout(blinkTimer);blinkTimer=setTimeout(()=>setFrame('idle'),1400);
}
function back() {
 if(!trail.length)return;
 const previous=trail.pop();({mode,topic,selected}=previous);Object.assign(filters,previous.filters);syncFilterControls();
 syncScene();scene.moveTo(previous.view);announce('已回到上一个视角。');$('#scene').focus({preventScroll:true});
}
function renderDetail() {
 const post=currentPost();$('#detail').hidden=!post;if(!post)return;
 $('#detail-title').textContent=post.title;$('#detail-meta').textContent=`${post.date} · ${topicName(post.topic)}`;$('#summary').textContent=post.summary;
 $('#neighbors').replaceChildren();const related=relatedPosts(post);$('#neighbors-button').disabled=!related.length;
 for(const p of related){const b=document.createElement('button');b.textContent=p.title;b.onclick=()=>selectPost(p.id);$('#neighbors').append(b);}
}
function showDialog(id) {const dialog=$(id);if(!dialog.open)dialog.showModal();}
function closeDialogs() {for(const d of document.querySelectorAll('dialog[open]'))d.close();}
function openSearch() {renderResults();showDialog('#search-dialog');$('#query').focus();}
function syncFilterControls() {for(const [key,selector] of Object.entries({query:'#query',author:'#author',category:'#category',topic:'#topic'}))$(selector).value=filters[key];}
function renderResults() {
 const posts=visiblePosts();$('#result-count').textContent=`${posts.length} 篇文章`;$('#results').replaceChildren();
 if(!posts.length){const p=document.createElement('p');p.className='empty';p.textContent='没有找到文章。试试别的词，或清除筛选。';$('#results').append(p);return;}
 const fragment=document.createDocumentFragment();
 for(const p of posts){const b=document.createElement('button');b.className='result';b.dataset.id=p.id;
  const title=document.createElement('strong');title.textContent=p.title;const meta=document.createElement('small');meta.textContent=`${p.date} · ${p.author} · ${p.category} · ${topicName(p.topic)}`;
  b.append(title,meta);b.onclick=()=>selectPost(p.id);fragment.append(b);
 }
 $('#results').append(fragment);
}
function buildMenus() {
 const select=(id,values)=>{const el=$(id),old=el.value;el.replaceChildren(new Option('全部',''));for(const [value,name] of values)el.add(new Option(name,value));el.value=old;};
 select('#author',[...new Set(index.posts.map(p=>p.author))].map(x=>[x,x]));
 select('#category',[...new Set(index.posts.map(p=>p.category))].map(x=>[x,x]));
 select('#topic',index.topics.filter(t=>index.groups[t.id]).map(t=>[t.id,t.name]));
 $('#topic-list').replaceChildren();$('#fallback-topics').replaceChildren();
 for(const t of index.topics){
  if(!index.groups[t.id])continue;const b=document.createElement('button');b.style.color=t.color;
  const name=document.createElement('span');name.textContent=t.name;const count=document.createElement('small');count.textContent=`${index.groups[t.id]} 篇`;
  b.append(name,count);b.onclick=()=>enterTopic(t.id);$('#topic-list').append(b);
  const alt=b.cloneNode(true);alt.onclick=()=>{filters.topic=t.id;syncFilterControls();openSearch();};$('#fallback-topics').append(alt);
 }
 $('#index-info').textContent=`当前 ${index.count} 篇公开文章；源目录 ${index.sourceCount} 篇。服务每 1.2 秒检查内容变化，页面每 2 秒同步索引。`;
 syncFilterControls();
}
async function readPost() {
 const post=currentPost();if(!post)return;
 const request=++readerRequest;$('#reader-title').textContent=post.title;$('#reader-meta').textContent=`${post.date} · ${post.author}`;
 $('#reader-body').textContent='正在读取正文…';$('#original').href=post.url;showDialog('#reader');$('#reader').scrollTop=0;
 try {
  const response=await fetch(`./api/body/${post.key}`,{cache:'no-store'});if(!response.ok)throw Error('这篇文章已移除或暂时不可读取。');const body=await response.json();
  if(request!==readerRequest||!$('#reader').open)return;
  // Server sanitizes Markdown with sanitize-html; never evaluate MDX/scripts.
  $('#reader-body').innerHTML=body.html;
 }catch(error){if(request===readerRequest)$('#reader-body').textContent=error.message;}
}
function setFrame(frame) {$('#character').dataset.frame=frame;}
function say(text) {clearTimeout(speechTimer);$('#speech').hidden=false;$('#speech-text').textContent=text;setFrame(isQuiet()?'idle':'talk');speechTimer=setTimeout(()=>{setFrame('idle');$('#speech').hidden=true;},9000);}
function setLow(value) {low=value;$('#low').checked=low;scene.setEnabled(!low&&!failedGL);$('#fallback').hidden=!low;remember();}
$('#companion').onclick=()=>say('Lv，记忆都接进来了。慢慢挑，我又不会催你……才不是特意在等你。');
$('#speech-close').onclick=()=>{$('#speech').hidden=true;setFrame('idle');};
$('#recommend').onclick=()=>{const posts=visiblePosts();if(posts.length){$('#speech').hidden=true;selectPost(posts[Math.floor(Math.random()*posts.length)].id);}};
$('#back').onclick=back;$('#close-detail').onclick=back;
$('#search-button').onclick=openSearch;$('#fallback-search').onclick=openSearch;
$('#browse-button').onclick=()=>showDialog('#topics-dialog');
$('#settings-button').onclick=()=>{const m=scene.metrics();$('#performance').textContent=`当前会话实测：${m.renderSamples} 个渲染样本，平均 JS 提交耗时 ${m.meanRenderMs} ms；动画帧间隔 ${m.meanAnimationFrameMs} ms（${m.animationSamples} 个样本）。这不是 GPU 完成时间或性能保证。`;showDialog('#settings');};
$('#quiet').checked=quiet;$('#quiet').onchange=e=>{quiet=e.target.checked;if(isQuiet())scene.stop();$('#room').classList.toggle('quiet',isQuiet());remember();};
motion.addEventListener('change',()=>{if(motion.matches){scene.stop();$('#quiet').checked=true;}$('#room').classList.toggle('quiet',isQuiet());});
$('#low').onchange=e=>setLow(e.target.checked||failedGL);
$('#warm').onchange=e=>$('#room').classList.toggle('warm',e.target.checked);
$('#read').onclick=readPost;$('#reader-back').onclick=()=>$('#reader').close();
$('#neighbors-button').onclick=()=>{$('#neighbors').hidden=!$('#neighbors').hidden;};
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>b.closest('dialog').close();
$('#reader').addEventListener('close',()=>{readerRequest++;$('#reader-body').replaceChildren();$('#read').focus({preventScroll:true});});
for(const [key,selector] of Object.entries({query:'#query',author:'#author',category:'#category',topic:'#topic'})) {
 $(selector).addEventListener(key==='query'?'input':'change',e=>{filters[key]=e.target.value;renderResults();syncScene();});
}
$('#clear').onclick=()=>{for(const key in filters)filters[key]='';syncFilterControls();renderResults();syncScene();};
$('#reset').onclick=()=>{trail=[];selected=null;topic=null;mode='overview';for(const key in filters)filters[key]='';syncFilterControls();syncScene();scene.moveTo(scene.home());closeDialogs();};
document.addEventListener('keydown',e=>{
 const modal=document.querySelector('dialog[open]');if(e.key==='Escape'&&!modal){e.preventDefault();if(!$('#speech').hidden){$('#speech').hidden=true;setFrame('idle');}else back();}
 if(e.key==='/'&&!modal&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();openSearch();}
});
$('#scene').addEventListener('pointerup',()=>setTimeout(remember,850));
$('#scene').addEventListener('wheel',()=>setTimeout(remember,300));
window.addEventListener('pagehide',remember);
setInterval(()=>{
 if(document.hidden||isQuiet()||!$('#speech').hidden)return;
 setFrame('blink');clearTimeout(blinkTimer);blinkTimer=setTimeout(()=>setFrame('idle'),140);
},6200);

async function refresh(first=false) {
 if(polling)return;polling=true;
 try {
  const response=await fetch('./api/index',{cache:'no-store',headers:index?{'If-None-Match':`"${index.version}"`}:{}});
  if(response.status===304){$('#loading').hidden=true;return;}
  if(!response.ok)throw Error('文章索引暂时不可用，请检查本地服务。');
  const next=await response.json();
  if(index?.version===next.version){$('#loading').hidden=true;return;}
  const oldSelected=currentPost();index=next;
  if(first&&saved){
   Object.assign(filters,saved.filters||{});mode=saved.mode||'overview';topic=saved.topic;selected=saved.selected;trail=Array.isArray(saved.trail)?saved.trail.slice(-40):[];
  }
  if(selected&&!index.posts.some(p=>p.id===selected)){selected=null;mode='overview';topic=null;trail=[];scene.moveTo(scene.home(),true);$('#reader').close();}
  const stillValid=v=>!v.selected||index.posts.some(p=>p.id===v.selected);trail=trail.filter(stillValid);
  buildMenus();scene.setData(index);syncScene();
  if(first)scene.moveTo(saved?.view||scene.home(),true);
  setLow(low||failedGL);$('#loading').hidden=true;
  if($('#search-dialog').open)renderResults();
  if($('#reader').open&&oldSelected?.bodyVersion!==currentPost()?.bodyVersion)readPost();
  if(!first)announce(`文章索引已更新，共 ${index.count} 篇。`);
 }catch(error){
  $('#loading').hidden=false;$('#loading').textContent=error.message;
  // Fail closed on unavailable source; don't retain stale private text in the UI.
  if(index){index=null;selected=null;topic=null;mode='overview';trail=[];scene.setData({topics:[],posts:[]});$('#detail').hidden=true;$('#results').replaceChildren();$('#reader').close();}
 }finally{polling=false;}
}
await refresh(true);setInterval(()=>{if(!document.hidden)refresh();},2000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
// Read-only diagnostics for local acceptance tests. No application controls exposed.
Object.defineProperty(window,'__v5',{get:()=>({count:index?.count,mode,topic,selected,view:scene.getView(),trail:trail.length,filters:{...filters},metrics:scene.metrics(),positions:index?.posts.map(p=>({id:p.id,position:p.position})),projected:scene.nodes.filter(n=>n.mesh.visible).map(n=>({id:n.post.id,...scene.project(n.post.position)}))})});
