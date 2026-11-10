import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const base='http://127.0.0.1:3001',email=`compose-${randomUUID()}@example.test`;
const headers={'Content-Type':'application/json','X-BizBize-Client':'native'};
const created=await fetch(base+'/v1/auth/register',{method:'POST',headers,body:JSON.stringify({email,password:'compose-test-long-password',terms_version:'2026-11-10'})});assert.equal(created.status,201);
const session=await created.json();let code;
for(let i=0;i<30;i++){
 const box=await fetch('http://127.0.0.1:8025/api/v1/messages').then(r=>r.json());const row=box.messages?.find(m=>m.To?.some(x=>x.Address===email));
 if(row){const mail=await fetch('http://127.0.0.1:8025/api/v1/message/'+row.ID).then(r=>r.json());code=mail.Text.match(/\b\d{6}\b/)?.[0];if(code)break;}
 await new Promise(resolve=>setTimeout(resolve,1000));
}
assert.ok(code,'Development SMTP delivery did not complete');
const verified=await fetch(base+'/v1/auth/verify',{method:'POST',headers:{...headers,Authorization:`Bearer ${session.token}`},body:JSON.stringify({code})});assert.equal(verified.status,200);
console.log('Docker API, PostgreSQL, SMTP queue and email-code verification passed.');
