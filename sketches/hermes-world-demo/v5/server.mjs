import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import { here, source, createWatcher } from './indexer.mjs';

let snapshot = null;
let watchedSource=source;
if(process.env.NODE_ENV==='test'&&process.env.HERMES_TEST_SOURCE){
 const fixture=path.resolve(process.env.HERMES_TEST_SOURCE);
 if(!fixture.startsWith(path.join(os.tmpdir(),'hermes-v5-fixture-')))throw Error('Test source must be an isolated V5 temporary fixture');
 watchedSource=fixture;
}
const stop = await createWatcher(watchedSource, path.join(here,'topic-overrides.json'), (error,next) => {
 // Fail closed: a parse error must not leave newly private/deleted content exposed.
 snapshot = error ? null : next;
 console.log(error ? `Index unavailable: ${error.message}` : `Indexed ${next.index.count}/${next.index.sourceCount} public posts (${next.index.version})`);
});
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.png':'image/png','.woff':'font/woff','.json':'application/json'};
const port = Number(process.env.PORT || 8767);
const staticFiles = new Set(['index.html','room.css','app.js','scene.js','assets/room-final.png','assets/hermes-expressions.png','assets/zpix.woff','vendor/three.module.js','vendor/three.core.js']);
const server = http.createServer(async(req,res) => {
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
 const json = (code,value) => {res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
 try {
  const url = new URL(req.url,'http://localhost');
  if(url.pathname === '/') {res.writeHead(302,{Location:'/v5/'});return res.end();}
  if(url.pathname === '/v5/api/index') {
   if(!snapshot)return json(503,{error:'索引更新失败，请检查服务日志。'});
   res.setHeader('ETag',`"${snapshot.index.version}"`);
   if(req.headers['if-none-match']===`"${snapshot.index.version}"`){res.writeHead(304);return res.end();}
   return json(200,snapshot.index);
  }
  if(url.pathname.startsWith('/v5/api/body/')) {
   const body = snapshot?.bodies.get(url.pathname.split('/').pop());
   return body ? json(200,body) : json(404,{error:'文章已移除或不再公开。'});
  }
  const relative = decodeURIComponent(url.pathname).replace(/^\/v5\//,'') || 'index.html';
  if(!url.pathname.startsWith('/v5/') || !staticFiles.has(relative)) return json(404,{error:'Not found'});
  const file = relative.startsWith('vendor/') ? path.join(here,'node_modules/three/build',path.basename(relative)) : path.join(here,relative);
  const data = await readFile(file);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)] || 'application/octet-stream'});res.end(data);
 } catch { json(500,{error:'Local resource unavailable'}); }
});
server.listen(port,'127.0.0.1',()=>console.log(`http://127.0.0.1:${port}/v5/`));
server.on('error',error=>{stop();console.error(error.message);process.exitCode=1;});
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>{stop();server.close();});
