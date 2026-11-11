import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {execFileSync} from 'node:child_process';
import {access,readFile,unlink} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {Pool} from '../server/src/db.ts';
import {assertRuntimeDatabase} from '../server/src/runtime-policy.ts';

// Run with: node --import tsx scripts/serverless-smoke.mjs
// Uses isolated CI PostgreSQL and Mailpit, never a live provider or Gmail.
const direct=process.env.TEST_DATABASE_URL;
if(!direct||!new URL(direct).pathname.startsWith('/bizbize_test'))throw new Error('Smoke requires a dedicated TEST_DATABASE_URL named bizbize_test*.');
const serverDirectory=new URL('../server/',import.meta.url),privateFile=new URL('../server/.env.serverless',import.meta.url);
try{await access(privateFile);throw new Error('Refusing to overwrite an existing private serverless environment file.');}catch(error){if(error.code!=='ENOENT')throw error;}
const owner=new Pool({connectionString:direct,max:1});
let createdRole=false,bootstrapAttempted=false,runtimePool,http,app;
const parse=(text)=>Object.fromEntries(text.split(/\r?\n/).filter(line=>line&&!line.startsWith('#')).map(line=>{const index=line.indexOf('=');if(index<1)throw new Error('Invalid generated environment format.');return [line.slice(0,index),line.slice(index+1)];}));
try{
 assert.equal((await owner.query("SELECT count(*)::integer n FROM pg_roles WHERE rolname='bizbize_api'")).rows[0].n,0,'Smoke must not reuse an existing application role');
 bootstrapAttempted=true;
 execFileSync(process.execPath,['--import','tsx','src/prepare-serverless.ts'],{cwd:serverDirectory,env:{...process.env,DIRECT_DATABASE_URL:direct},stdio:['ignore','pipe','pipe'],timeout:60000});
 createdRole=true;
 const generated=parse(await readFile(privateFile,'utf8'));
 assert.equal(new URL(generated.DATABASE_URL).username,'bizbize_api');
 assert.ok(generated.APP_SECRET.length>=32&&generated.CRON_SECRET.length>=32);
 assert.notEqual(generated.APP_SECRET,generated.CRON_SECRET);
 runtimePool=new Pool({connectionString:generated.DATABASE_URL,max:1});
 await assertRuntimeDatabase(runtimePool,true);
 assert.equal((await runtimePool.query('SELECT current_user AS name')).rows[0].name,'bizbize_api');
 // Owner URL is used only by bootstrap/cleanup, never the runtime.
 Object.assign(process.env,generated,{
  NODE_ENV:'test',DEPLOYMENT_MODE:'serverless',VERCEL:'0',
  PUBLIC_URL:'http://127.0.0.1',WEB_ORIGINS:'http://127.0.0.1',
  SMTP_HOST:'127.0.0.1',SMTP_PORT:'1025',SMTP_SECURE:'false',SMTP_USER:'',SMTP_PASS:'',
  MAIL_FROM:'Biz Bize <smoke@example.test>',PHOTO_MODERATION:'manual',
 });
 const [{default:handler},{serverlessApp}]=await Promise.all([import('../server/api/index.ts'),import('../server/src/serverless.ts')]);
 http=createServer(handler);http.listen(0,'127.0.0.1');await once(http,'listening');
 const address=http.address();assert.ok(address&&typeof address!=='string');
 const base=`http://127.0.0.1:${address.port}`;
 const headers={'Content-Type':'application/json','X-BizBize-Client':'native'};
 const request=async(path,body,token)=>{
  const response=await fetch(base+path,{signal:AbortSignal.timeout(30000),method:body===undefined?'GET':'POST',headers:{...headers,...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:response.status,data:await response.json()};
 };
 const health=await request('/healthz');assert.equal(health.status,200);assert.deepEqual(health.data,{status:'ok'});
 assert.equal((await request('/internal/maintenance')).status,401);
 const email=`adapter-${randomUUID()}@example.test`,password='Adapter-smoke-password-2026!';
 const registered=await request('/v1/auth/register',{email,password,terms_version:'2026-11-10'});assert.equal(registered.status,201);
 const token=registered.data.token;assert.equal(typeof token,'string');assert.equal(registered.data.user.email,email);
 let code;
 for(let attempt=0;attempt<30;attempt++){
  const list=await fetch('http://127.0.0.1:8025/api/v1/messages',{signal:AbortSignal.timeout(5000)}).then(response=>response.json());
  const row=list.messages?.find(message=>message.To?.some(recipient=>recipient.Address===email));
  if(row){const mail=await fetch('http://127.0.0.1:8025/api/v1/message/'+row.ID,{signal:AbortSignal.timeout(5000)}).then(response=>response.json());code=mail.Text?.match(/\b\d{6}\b/)?.[0];if(code)break;}
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 assert.ok(code,'Local SMTP message must reach Mailpit');
 assert.equal((await request('/v1/auth/verify',{code},token)).status,200);
 const invited=await request('/v1/actions/createInvite',{},token);assert.equal(invited.status,200);assert.match(invited.data.code,/^[A-F0-9]{12}$/);
 const deleted=await request('/v1/actions/deleteAccount',{password},token);assert.equal(deleted.status,200);assert.deepEqual(deleted.data,{deleted:true});
 assert.equal((await request('/v1/auth/me',undefined,token)).status,401);
 assert.ok((await owner.query("SELECT count(*)::integer n FROM audit_events WHERE action='account_deleted'")).rows[0].n>0,'Restricted runtime must be allowed to write audit sequence');
 app=await serverlessApp();
 console.log('Local serverless adapter, restricted PostgreSQL role, bootstrap, SMTP verification and account deletion passed. No cloud deployment was performed.');
}finally{
 if(http){await new Promise(resolve=>http.close(resolve));http.closeAllConnections?.();}
 if(app)await app.close();
 else if(http){try{const {serverlessApp}=await import('../server/src/serverless.ts');await(await serverlessApp()).close();}catch{}}
 if(runtimePool)await runtimePool.end();
 try{if(createdRole){await owner.query('DROP OWNED BY bizbize_api');await owner.query('DROP ROLE bizbize_api');}}
 finally{await owner.end();if(bootstrapAttempted)await unlink(privateFile).catch(error=>{if(error.code!=='ENOENT')throw error;});}
}
