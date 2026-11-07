import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { here } from '../indexer.mjs';

const root=await mkdtemp(path.join(os.tmpdir(),'hermes-v5-fixture-'));
const post=(title,body,privateField='')=>`---\ntitle: ${title}\npublished: 2026-11-07\n${privateField}\n---\n${body}`;
await writeFile(path.join(root,'a.md'),post('第一个记忆','最初正文：自我与意识。'));
const server=spawn(process.execPath,['server.mjs'],{cwd:here,windowsHide:true,env:{...process.env,PORT:'8769',NODE_ENV:'test',HERMES_TEST_SOURCE:root},stdio:['ignore','pipe','pipe']});
let output='';server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);
let browser;const checks=[];
const check=(name,condition)=>{assert.ok(condition,name);checks.push(name);console.log('PASS',name);};
try{
 const end=Date.now()+10000;while(!output.includes('http://127.0.0.1:8769/v5/')&&Date.now()<end){if(server.exitCode!==null)throw Error(output);await new Promise(r=>setTimeout(r,100));}assert.match(output,/8769\/v5/);
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();
 await page.goto('http://127.0.0.1:8769/v5/');await page.waitForFunction(()=>window.__v5?.count===1);
 const firstPositions=await page.evaluate(()=>window.__v5.positions);
 await writeFile(path.join(root,'b.md'),post('第二个记忆','未来与时间的记忆。'));
 await page.waitForFunction(()=>window.__v5?.count===2,{},{timeout:10000});
 check('New fixture article appears without restart or reload',true);
 const after=await page.evaluate(()=>window.__v5.positions);check('Existing XYZ unchanged after addition',JSON.stringify(firstPositions[0].position)===JSON.stringify(after.find(p=>p.id==='a').position));
 await page.keyboard.press('/');await page.locator('#query').fill('第一个记忆');await page.locator('.result').click();await page.locator('#read').click();await page.waitForFunction(()=>document.querySelector('#reader-body').textContent.includes('最初正文'));
 await writeFile(path.join(root,'a.md'),post('修改后的记忆','修改后的正文：自我与意识。'));
 await page.waitForFunction(()=>document.querySelector('#reader-title').textContent==='修改后的记忆'&&document.querySelector('#reader-body').textContent.includes('修改后的正文'),{},{timeout:10000});
 check('Edited title and open reader body update automatically',true);
 await rm(path.join(root,'a.md'));await page.waitForFunction(()=>window.__v5?.count===1&&!document.querySelector('#reader').open,{},{timeout:10000});
 check('Deleting selected article closes stale reader and removes star',(await page.evaluate(()=>window.__v5.selected))===null);
 await writeFile(path.join(root,'b.md'),post('私密内容','PRIVATE NEVER SERVE','password: protected'));
 await page.waitForFunction(()=>window.__v5?.count===0,{},{timeout:10000});
 const data=await (await fetch('http://127.0.0.1:8769/v5/api/index')).json();check('Public-to-private change removes frontend metadata',data.posts.length===0&&data.excluded.encrypted===1);
 const conditional=await fetch('http://127.0.0.1:8769/v5/api/index',{headers:{'If-None-Match':`"${data.version}"`}});check('Unchanged index uses empty 304 response',conditional.status===304&&(await conditional.text())==='');
 const denied=await fetch('http://127.0.0.1:8769/v5/indexer.mjs');check('Static allowlist denies server source',denied.status===404);
 await writeFile(path.join(here,'live-test-report.json'),JSON.stringify({testedAt:new Date().toISOString(),checks,productionSourceTouched:false},null,2));
}finally{
 await browser?.close();server.kill();await new Promise(r=>server.exitCode!==null?r():server.once('exit',r));
 const resolved=path.resolve(root);assert.ok(resolved.startsWith(path.join(os.tmpdir(),'hermes-v5-fixture-')));await rm(resolved,{recursive:true,force:true});
}
