import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {Pool} from '../src/db.js';
import {migrate} from '../src/migrate.js';
import {createApp} from '../src/app.js';
import {configFrom} from '../src/config.js';
import {unseal,flushMail} from '../src/mail.js';
import {passwordMatches} from '../src/security.js';
const url=process.env.TEST_DATABASE_URL;
if(!url||!new URL(url).pathname.startsWith('/bizbize_test'))throw new Error('Tests require an isolated TEST_DATABASE_URL with database name bizbize_test*.');
test('Custom API: real PostgreSQL isolation, authentication and privacy',async t=>{
 const cfg=configFrom({DATABASE_URL:url,APP_SECRET:'test-only-cryptographic-secret-never-deploy',NODE_ENV:'test'}),pool=new Pool({connectionString:url});
 await migrate(pool);await pool.query('TRUNCATE users,couples,rate_limits,reports,audit_events CASCADE');
 const app=await createApp(pool,cfg);let ip=1;
 const request=async(path:string,data?:unknown,token?:string,extra:Record<string,string>={},method?:string)=>{
  const r=await app.inject({method:(method??(data===undefined?'GET':'POST')) as 'GET'|'POST',url:path,payload:data as Record<string,unknown>,remoteAddress:`127.0.0.${ip}`,headers:{'x-bizbize-client':'native',...(token?{authorization:`Bearer ${token}`} : {}),...extra}});return {status:r.statusCode,data:r.json(),headers:r.headers};
 };
 const code=async(uid:string,purpose='verify')=>{const row=(await pool.query('SELECT envelope FROM mail_outbox WHERE user_id=$1 AND purpose=$2',[uid,purpose])).rows[0];assert.ok(row);return unseal(cfg.secret,row.envelope).text.match(/\b\d{6}\b/)![0];};
 const account=async(verified=true)=>{ip++;const email=`${randomUUID()}@example.test`,password='Long-test-password-2026!';const r=await request('/v1/auth/register',{email,password,terms_version:'2026-11-10'});assert.equal(r.status,201);const uid=r.data.user.id,token=r.data.token as string;if(verified){const v=await request('/v1/auth/verify',{code:await code(uid)},token);assert.equal(v.status,200);}return {uid,token,email,password};};
 const act=(name:string,b:unknown,token:string)=>request('/v1/actions/'+name,b,token);
 const a=await account(),b=await account(),c=await account();let cid='',taskId=randomUUID(),photoId=randomUUID();
 try{
 await t.test('passwords, codes and sessions are not stored in plaintext; unverified access is denied',async()=>{
  const pending=await account(false),row=(await pool.query('SELECT * FROM users WHERE id=$1',[pending.uid])).rows[0];assert.notEqual(row.password_hash,pending.password);assert.equal(await passwordMatches(pending.password,row.password_hash),true);
  const stored=(await pool.query('SELECT * FROM sessions WHERE user_id=$1',[pending.uid])).rows[0];assert.notEqual(stored.token_hash,pending.token);
  const otp=await code(pending.uid),codeRow=(await pool.query('SELECT * FROM email_codes WHERE user_id=$1',[pending.uid])).rows[0];assert.notEqual(codeRow.code_hash,otp);
  assert.equal((await act('createInvite',{},pending.token)).status,403);assert.equal((await request('/v1/shared')).status,401);
 });
 await t.test('web uses HttpOnly cookies; cross-origin cookie writes and missing CSRF client headers are rejected',async()=>{
  ip++;const r=await request('/v1/auth/register',{email:`${randomUUID()}@example.test`,password:a.password,terms_version:'2026-11-10'},undefined,{'x-bizbize-client':'web',origin:'http://localhost:8081'});assert.equal(r.status,201);assert.equal(r.data.token,undefined);
  const cookie=String(r.headers['set-cookie']);assert.match(cookie,/HttpOnly/i);assert.match(cookie,/SameSite=Lax/i);
  assert.equal((await request('/v1/auth/resend',{},undefined,{cookie,origin:'https://evil.example','x-bizbize-client':'web'})).status,403);
  assert.equal((await request('/v1/auth/resend',{},undefined,{cookie,'x-bizbize-client':'native'})).status,403);
 });
 await t.test('single-use codes and attempt limits persist after rejected requests',async()=>{
  const p=await account(false),actual=await code(p.uid),wrong=actual==='000000'?'000001':'000000';
  for(let i=0;i<5;i++)assert.equal((await request('/v1/auth/verify',{code:wrong},p.token)).status,400);
  assert.equal((await request('/v1/auth/verify',{code:actual},p.token)).status,400);
  assert.equal((await request('/v1/auth/resend',{},p.token)).status,200);const next=await code(p.uid);
  assert.equal((await request('/v1/auth/verify',{code:next},p.token)).status,200);
  assert.equal((await request('/v1/auth/verify',{code:next},p.token)).status,400);
 });
 await t.test('SMTP queue retries failures without exposing plaintext codes',async()=>{
  const p=await account(false),row=(await pool.query('SELECT envelope FROM mail_outbox WHERE user_id=$1',[p.uid])).rows[0];assert.equal((await request('/v1/auth/verification-status',undefined,p.token)).data.delivery,'queued');assert.ok(!row.envelope.includes(p.email));
  // Process all outstanding messages using an injected test mail transport, never a public debug endpoint.
  let sent=0;while(await flushMail(pool,cfg,async()=>{sent++;})){if(sent>30)throw new Error('Unexpected queue loop');}assert.ok(sent>0);assert.equal((await request('/v1/auth/verification-status',undefined,p.token)).data.delivery,'accepted');
  await request('/v1/auth/resend',{},p.token);
  await flushMail(pool,cfg,async()=>{throw new Error('Temporary SMTP failure');});
  assert.equal((await pool.query('SELECT attempts FROM mail_outbox WHERE user_id=$1',[p.uid])).rows[0].attempts,1);
 });
 await t.test('invite renewal, concurrent joining and two-member constraint',async()=>{
  const old=await act('createInvite',{},a.token),fresh=await act('createInvite',{},a.token);
  assert.equal((await act('joinPair',{code:old.data.code},c.token)).status,400);
  const joined=await Promise.all([act('joinPair',{code:fresh.data.code},b.token),act('joinPair',{code:fresh.data.code},c.token)]);assert.equal(joined.filter(x=>x.status===200).length,1);
  // Pick the winner deterministically for the rest of the suite.
  if(joined[0].status!==200){const tmp={...b};Object.assign(b,c);Object.assign(c,tmp);}
  const shared=await request('/v1/shared',undefined,a.token);assert.equal(shared.data.members.length,2);cid=shared.data.members[0].couple_id;
  assert.equal((await pool.query('SELECT count(*)::integer n FROM members WHERE couple_id=$1',[cid])).rows[0].n,2);
 });
 await t.test('messages are idempotent, input validation rejects SQL-like IDs and explicit threats',async()=>{
  const data={id:taskId,kind:'task',body:'Birlikte kahve içelim'};assert.equal((await act('sendMessage',data,a.token)).status,200);assert.equal((await act('sendMessage',data,a.token)).status,200);
  assert.equal((await pool.query('SELECT count(*)::integer n FROM messages WHERE id=$1',[taskId])).rows[0].n,1);
  assert.equal((await act('sendMessage',{...data,id:"' OR 1=1--"},a.token)).status,400);
  assert.equal((await act('sendMessage',{...data,id:randomUUID(),body:'Seni öldüreceğim'},a.token)).status,400);
  assert.equal((await act('completeTask',{id:taskId},c.token)).status,403);
 });
 await t.test('JPEG decoding, private photos, task-memory transaction and author-only deletion',async()=>{
  assert.equal((await act('uploadMemoryPhoto',{id:randomUUID(),photo_base64:Buffer.from('not-jpeg').toString('base64')},a.token)).status,400);
  const jpeg=await sharp({create:{width:32,height:32,channels:3,background:'#abcdef'}}).jpeg().toBuffer();
  assert.equal((await act('uploadMemoryPhoto',{id:photoId,photo_base64:jpeg.toString('base64')},a.token)).status,200);
  assert.equal((await request('/v1/photos/'+photoId,undefined,c.token)).status,404);
  const draft={id:photoId,note:'Test anısı',place:'Kafe',happened_on:'2026-11-10',latitude:41,longitude:29,task_id:taskId};assert.equal((await act('addMemory',draft,a.token)).status,200);
  const shared=(await request('/v1/shared',undefined,b.token)).data;assert.equal(shared.memories[0].id,photoId);assert.equal(shared.messages[0].memory_id,photoId);assert.equal(shared.memories[0].bytes,undefined);
  assert.equal((await request('/v1/photos/'+photoId,undefined,b.token)).status,200);assert.equal((await act('deleteMemory',{id:photoId},b.token)).status,403);
 });
 await t.test('manual moderation keeps pending photos private until operator approval',async()=>{
  const manual=await createApp(pool,{...cfg,photoMode:'manual'}),pending=randomUUID(),jpeg=await sharp({create:{width:8,height:8,channels:3,background:'#ffffff'}}).jpeg().toBuffer();
  try{
   const r=await manual.inject({method:'POST',url:'/v1/actions/uploadMemoryPhoto',headers:{'x-bizbize-client':'native',authorization:`Bearer ${a.token}`},payload:{id:pending,photo_base64:jpeg.toString('base64')}});assert.equal(r.statusCode,200);assert.equal(r.json().status,'pending');
   const draft={id:pending,note:'İnceleme',place:'Kafe',happened_on:'2026-11-10',latitude:41,longitude:29,task_id:null};assert.equal((await act('addMemory',draft,a.token)).data.pending,true);
   assert.equal((await request('/v1/photos/'+pending,undefined,b.token)).status,404);assert.equal((await request('/v1/photos/'+pending,undefined,a.token)).status,200);assert.ok(!(await request('/v1/shared',undefined,b.token)).data.memories.some((m:{id:string})=>m.id===pending));
   await pool.query("UPDATE photos SET status='approved' WHERE id=$1",[pending]);assert.equal((await request('/v1/photos/'+pending,undefined,b.token)).status,200);
  }finally{await manual.close();}
 });
 await t.test('location consent generation and timestamp ordering reject late callbacks',async()=>{
  const consent=await act('setLocationSharing',{enabled:true},a.token),fix={couple_id:cid,version:consent.data.version,latitude:41,longitude:29,accuracy:10,captured_at:new Date(Date.now()-1000).toISOString()};
  assert.equal((await act('publishLocation',fix,a.token)).data.accepted,true);
  assert.equal((await act('publishLocation',{...fix,captured_at:new Date(Date.now()-60000).toISOString()},a.token)).data.accepted,false);
  await act('setLocationSharing',{enabled:false},a.token);assert.equal((await act('publishLocation',fix,a.token)).data.accepted,false);
  assert.equal((await pool.query('SELECT count(*)::integer n FROM locations WHERE user_id=$1',[a.uid])).rows[0].n,0);
  const next=await act('setLocationSharing',{enabled:true},a.token);assert.notEqual(next.data.version,fix.version);assert.equal((await act('publishLocation',fix,a.token)).data.accepted,false);
 });
 await t.test('reports are private and cannot target another couple or the reporting author',async()=>{
  assert.equal((await act('reportContent',{id:randomUUID(),kind:'message',content_id:taskId,reason:'harassment',details:'Test'},b.token)).status,200);
  assert.equal((await act('reportContent',{id:randomUUID(),kind:'message',content_id:taskId,reason:'other'},a.token)).status,400);
  assert.equal((await act('reportContent',{id:randomUUID(),kind:'message',content_id:taskId,reason:'other'},c.token)).status,403);
  assert.equal((await request('/v1/reports',undefined,a.token)).status,404);
 });
 await t.test('blocking closes all shared access and prevents re-pairing in either direction',async()=>{
  assert.equal((await act('blockPartner',{},a.token)).status,200);assert.equal((await request('/v1/photos/'+photoId,undefined,b.token)).status,404);
  assert.equal((await request('/v1/shared',undefined,b.token)).data.members.length,0);
  const first=await act('createInvite',{},a.token);assert.equal((await act('joinPair',{code:first.data.code},b.token)).status,403);
  await act('disconnectPair',{},a.token);const reverse=await act('createInvite',{},b.token);assert.equal((await act('joinPair',{code:reverse.data.code},a.token)).status,403);
 });
 await t.test('password reset is single-use and revokes previous sessions',async()=>{
  const p=await account(),partner=await account();const invite=await act('createInvite',{},p.token);await act('joinPair',{code:invite.data.code},partner.token);const shared=await request('/v1/shared',undefined,p.token),consent=await act('setLocationSharing',{enabled:true},p.token);const fix={couple_id:shared.data.members[0].couple_id,version:consent.data.version,latitude:41,longitude:29,accuracy:10,captured_at:new Date().toISOString()};await act('publishLocation',fix,p.token);assert.equal((await request('/v1/auth/forgot',{email:p.email})).status,200);const reset=await code(p.uid,'reset'),password='A-new-long-password-2026!';
  const race=await Promise.all([request('/v1/auth/reset',{email:p.email,code:reset,password}),...Array.from({length:5},()=>act('publishLocation',fix,p.token))]);assert.equal(race[0].status,200);assert.equal((await request('/v1/shared',undefined,partner.token)).data.locations.length,0);
  assert.equal((await request('/v1/auth/me',undefined,p.token)).status,401);assert.equal((await request('/v1/auth/reset',{email:p.email,code:reset,password})).status,400);
  assert.equal((await request('/v1/auth/login',{email:p.email,password:p.password})).status,401);assert.equal((await request('/v1/auth/login',{email:p.email,password})).status,200);
 });
 await t.test('account deletion requires password, works before verification and revokes tokens',async()=>{
  const p=await account(false);assert.equal((await act('deleteAccount',{password:'wrong'},p.token)).status,403);assert.equal((await act('deleteAccount',{password:p.password},p.token)).status,200);assert.equal((await request('/v1/auth/me',undefined,p.token)).status,401);
  assert.equal((await pool.query('SELECT 1 FROM users WHERE id=$1',[p.uid])).rowCount,0);
 });
 await t.test('expired sessions and expired codes cannot be used',async()=>{
  const p=await account(false),otp=await code(p.uid);await pool.query("UPDATE email_codes SET expires_at=now()-interval '1 second' WHERE user_id=$1",[p.uid]);assert.equal((await request('/v1/auth/verify',{code:otp},p.token)).status,400);
  await pool.query("UPDATE sessions SET created_at=now()-interval '8 days',expires_at=now()-interval '1 second' WHERE user_id=$1",[p.uid]);assert.equal((await request('/v1/auth/me',undefined,p.token)).status,401);
 });
 }finally{await app.close();await pool.end();}
});
