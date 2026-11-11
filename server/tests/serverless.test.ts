import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {Pool} from '../src/db.js';
import {migrate} from '../src/migrate.js';
import {createApp} from '../src/app.js';
import {configFrom} from '../src/config.js';
import {unseal} from '../src/mail.js';

const url=process.env.TEST_DATABASE_URL;
if(!url||!new URL(url).pathname.startsWith('/bizbize_test'))throw new Error('Serverless tests require an isolated TEST_DATABASE_URL named bizbize_test*.');

test('Serverless pilot: real database, request-driven mail, retention and payload boundaries',async t=>{
 const cfg=configFrom({DATABASE_URL:url,APP_SECRET:'serverless-test-secret-not-for-deployment-2026',CRON_SECRET:'independent-serverless-cron-test-secret-2026',NODE_ENV:'test',DEPLOYMENT_MODE:'serverless'});
 const pool=new Pool({connectionString:url});
 await migrate(pool);
 await pool.query('TRUNCATE users,couples,rate_limits,reports,audit_events CASCADE');
 let rejectMail=false,attempts=0,ip=20;
 const sent:Array<{to:string;subject:string;text:string}>=[];
 const sendMail=async(mail:{to:string;subject:string;text:string})=>{
  attempts++;
  if(rejectMail)throw new Error('PRIVATE_SMTP_DIAGNOSTIC_NEVER_RETURN');
  sent.push(mail);
 };
 const app=await createApp(pool,cfg,{sendMail});
 const request=async(path:string,payload?:unknown,token?:string,headers:Record<string,string>={},remoteAddress=`127.0.1.${ip}`)=>{
  const result=await app.inject({method:payload===undefined?'GET':'POST',url:path,payload:payload as Record<string,unknown>,remoteAddress,headers:{'x-bizbize-client':'native',...(token?{authorization:`Bearer ${token}`} : {}),...headers}});
  return {status:result.statusCode,data:result.json(),raw:result.body};
 };
 const otp=(mail:{text:string})=>{const match=mail.text.match(/\b\d{6}\b/);assert.ok(match);return match[0];};
 const account=async(verified=false)=>{
  ip++;const email=`serverless-${randomUUID()}@example.test`,password='Serverless-test-password-2026!';
  const result=await request('/v1/auth/register',{email,password,terms_version:'2026-11-10'});
  assert.equal(result.status,201);
  assert.deepEqual(Object.keys(result.data).sort(),['token','user']);
  assert.deepEqual(Object.keys(result.data.user).sort(),['email','emailVerified','id']);
  assert.ok(!result.raw.includes(password));assert.ok(!result.raw.includes(cfg.secret));assert.ok(!result.raw.includes('PRIVATE_SMTP_DIAGNOSTIC'));
  const user={id:result.data.user.id as string,token:result.data.token as string,email,password};
  if(verified){const mail=sent.findLast(x=>x.to===email);assert.ok(mail);assert.equal((await request('/v1/auth/verify',{code:otp(mail)},user.token)).status,200);}
  return user;
 };
 const action=(name:string,payload:unknown,token:string)=>request('/v1/actions/'+name,payload,token);
 try{
  await t.test('scheduled SMTP does not block the generic registration response',async()=>{
   ip++;
   let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});const pending:Promise<unknown>[]=[];
   const scheduled=await createApp(pool,cfg,{sendMail:async()=>{await held;},schedule:work=>{pending.push(work);}});
   try{
    const response=await scheduled.inject({method:'POST',url:'/v1/auth/register',payload:{email:`scheduled-${randomUUID()}@example.test`,password:'Scheduled-password-2026!',terms_version:'2026-11-10'},remoteAddress:'127.0.0.240',headers:{'x-bizbize-client':'native'}});
    assert.equal(response.statusCode,201);assert.equal(pending.length,1);
    release();await Promise.all(pending);
   }finally{release();await Promise.all(pending);await scheduled.close();}
  });
  await t.test('registration sends a verification message without a persistent worker or exposing its code',async()=>{
   const user=await account(),mail=sent.findLast(x=>x.to===user.email);assert.ok(mail);assert.equal(attempts,1);
   assert.equal((await pool.query('SELECT count(*)::integer n FROM mail_outbox WHERE user_id=$1',[user.id])).rows[0].n,0);
   const status=await request('/v1/auth/verification-status',undefined,user.token);assert.deepEqual(status.data,{delivery:'accepted'});
   assert.ok(!status.raw.includes(otp(mail)));assert.ok(!status.raw.includes(cfg.secret));
   assert.equal((await request('/v1/auth/verify',{code:otp(mail)},user.token)).status,200);
   assert.equal((await request('/v1/auth/verification-status',undefined,user.token)).data.delivery,'verified');
  });
  await t.test('SMTP failure keeps a successful registration and encrypted durable retry until a request retries it',async()=>{
   rejectMail=true;const user=await account();
   const pending=(await pool.query('SELECT * FROM mail_outbox WHERE user_id=$1',[user.id])).rows[0];assert.ok(pending);
   assert.equal(pending.attempts,1);assert.ok(new Date(pending.next_attempt)>new Date());assert.ok(!pending.envelope.includes(user.email));
   const queued=unseal(cfg.secret,pending.envelope);assert.equal(queued.to,user.email);
   const before=attempts,pump=await request('/v1/auth/mail-delivery',{});assert.equal(pump.status,200);assert.deepEqual(pump.data,{accepted:true});assert.equal(attempts,before);
   assert.ok(!pump.raw.includes('PRIVATE_SMTP_DIAGNOSTIC'));assert.ok(!pump.raw.includes(otp(queued)));
   await pool.query("UPDATE mail_outbox SET next_attempt=now()-interval '1 second' WHERE user_id=$1",[user.id]);
   rejectMail=false;const delivered=await request('/v1/auth/mail-delivery',{});assert.deepEqual(delivered.data,{accepted:true});assert.equal(attempts,before+1);
   assert.equal(sent.findLast(x=>x.to===user.email)?.text,queued.text);
   assert.equal((await pool.query('SELECT count(*)::integer n FROM mail_outbox WHERE user_id=$1',[user.id])).rows[0].n,0);
   assert.equal((await request('/v1/auth/verify',{code:otp(queued)},user.token)).status,200);
  });
  await t.test('password reset retry pumping is anonymous, reveals no account and never creates messages itself',async()=>{
   const user=await account(true);rejectMail=true;
   const forgot=await request('/v1/auth/forgot',{email:user.email});assert.equal(forgot.status,200);assert.deepEqual(forgot.data,{queued:true});
   const pending=(await pool.query("SELECT * FROM mail_outbox WHERE user_id=$1 AND purpose='reset'",[user.id])).rows[0];assert.ok(pending);assert.equal(pending.attempts,1);
   const reset=unseal(cfg.secret,pending.envelope);assert.match(reset.subject,/yenileme/);
   const missing=await request('/v1/auth/forgot',{email:`missing-${randomUUID()}@example.test`});assert.deepEqual(missing.data,forgot.data);
   assert.equal((await request('/v1/auth/mail-delivery',{email:user.email})).status,400);
   assert.equal((await request('/v1/auth/mail-delivery')).status,404);
   await pool.query("UPDATE mail_outbox SET next_attempt=now()-interval '1 second' WHERE id=$1",[pending.id]);
   rejectMail=false;ip++;const pump=await request('/v1/auth/mail-delivery',{});assert.deepEqual(pump.data,{accepted:true});assert.ok(!pump.raw.includes(user.email));assert.ok(!pump.raw.includes(otp(reset)));
   assert.equal(sent.findLast(x=>x.to===user.email)?.text,reset.text);
   const count=sent.length;assert.equal((await request('/v1/auth/mail-delivery',{})).status,200);assert.equal(sent.length,count);
   assert.equal((await pool.query('SELECT count(*)::integer n FROM mail_outbox')).rows[0].n,0);
   assert.equal((await request('/v1/auth/reset',{email:user.email,code:otp(reset),password:'Changed-serverless-password-2026!'})).status,200);
   assert.equal((await request('/v1/auth/me',undefined,user.token)).status,401);
  });
  await t.test('only the exact cron secret authorizes physical expiry cleanup',async()=>{
   ip++;const expired=randomUUID(),live=randomUUID();
   await pool.query("INSERT INTO reports(id,kind,reason,details,expires_at) VALUES($1,'partner','other','expired private evidence',now()-interval '1 minute'),($2,'partner','other','live private evidence',now()+interval '1 day')",[expired,live]);
   await pool.query("INSERT INTO rate_limits(key,count,expires_at) VALUES('serverless-expired-fixture',1,now()-interval '1 minute')");
   for(const authorization of [undefined,'Bearer wrong','Bearer '+cfg.cronSecret+'extra']){
    const denied=await request('/internal/maintenance',undefined,undefined,authorization?{authorization}:{});assert.equal(denied.status,401);assert.ok(!denied.raw.includes(cfg.cronSecret!));
   }
   assert.equal((await pool.query('SELECT count(*)::integer n FROM reports WHERE id=$1',[expired])).rows[0].n,1);
   const result=await request('/internal/maintenance',undefined,undefined,{authorization:'Bearer '+cfg.cronSecret});assert.equal(result.status,200);assert.deepEqual(result.data,{cleaned:true});
   assert.equal((await pool.query('SELECT count(*)::integer n FROM reports WHERE id=$1',[expired])).rows[0].n,0);
   assert.equal((await pool.query('SELECT count(*)::integer n FROM reports WHERE id=$1',[live])).rows[0].n,1);
   assert.equal((await pool.query("SELECT count(*)::integer n FROM rate_limits WHERE key='serverless-expired-fixture'")).rows[0].n,0);
  });
  await t.test('serverless rejects images accepted by Docker and refuses oversized legacy photo responses',async()=>{
   const a=await account(true),b=await account(true),other=await account(true);
   const invite=await action('createInvite',{},a.token);assert.equal(invite.status,200);assert.equal((await action('joinPair',{code:invite.data.code},b.token)).status,200);
   const cid=(await pool.query('SELECT couple_id FROM users WHERE id=$1',[a.id])).rows[0].couple_id;
   const small=await sharp({create:{width:16,height:16,channels:3,background:'#abcdef'}}).jpeg().toBuffer();
   // libjpeg accepts trailing data; this is still decodable JPEG, not an invalid-file rejection test.
   const large=Buffer.concat([small,Buffer.alloc(cfg.maxPhotoBytes+1-small.length)]),data=large.toString('base64');
   const standard=await createApp(pool,{...cfg,serverless:false,maxPhotoBytes:5*1024*1024});
   try{
    const normal=await standard.inject({method:'POST',url:'/v1/actions/uploadMemoryPhoto',payload:{id:randomUUID(),photo_base64:data},headers:{'x-bizbize-client':'native',authorization:`Bearer ${a.token}`}});assert.equal(normal.statusCode,200,normal.body);
   }finally{await standard.close();}
   const rejected=await action('uploadMemoryPhoto',{id:randomUUID(),photo_base64:data},a.token);assert.equal(rejected.status,400);assert.ok(!rejected.raw.includes(data.slice(0,200)));
   const photo=randomUUID();await pool.query("INSERT INTO photos(id,couple_id,owner_id,bytes,status) VALUES($1,$2,$3,$4,'approved')",[photo,cid,a.id,large]);
   assert.equal((await request('/v1/photos/'+photo,undefined,a.token)).status,413);
   assert.equal((await request('/v1/photos/'+photo,undefined,other.token)).status,404);
   const huge=Buffer.alloc(4*1024*1024).toString('base64');assert.equal((await action('uploadMemoryPhoto',{id:randomUUID(),photo_base64:huge},a.token)).status,413);
  });
  await t.test('caller-controlled forwarding headers cannot bypass retry rate limits outside Vercel',async()=>{
   const remote='127.0.1.230';
   for(let i=1;i<=6;i++)assert.equal((await request('/v1/auth/mail-delivery',{},undefined,{'x-forwarded-for':`10.0.0.${i}`,'x-vercel-forwarded-for':`10.1.0.${i}`},remote)).status,200);
   assert.equal((await request('/v1/auth/mail-delivery',{},undefined,{'x-forwarded-for':'10.0.0.99','x-vercel-forwarded-for':'10.1.0.99'},remote)).status,429);
   const vercel=await createApp(pool,{...cfg,vercel:true},{sendMail});
   const pump=async(value:string)=>vercel.inject({method:'POST',url:'/v1/auth/mail-delivery',payload:{},remoteAddress:'127.0.1.231',headers:{'x-bizbize-client':'native','x-vercel-forwarded-for':value}});
   try{
    for(let i=0;i<6;i++)assert.equal((await pump('10.2.0.1')).statusCode,200);
    assert.equal((await pump('10.2.0.1')).statusCode,429);
    assert.equal((await pump('10.2.0.2')).statusCode,200);
    for(let i=0;i<6;i++)assert.equal((await pump(`bad-ip-${i}`)).statusCode,200);
    assert.equal((await pump('10.2.0.8,10.2.0.9')).statusCode,429);
   }finally{await vercel.close();}
  });
 }finally{await app.close();await pool.query('TRUNCATE users,couples,rate_limits,reports,audit_events CASCADE');await pool.end();}
});
