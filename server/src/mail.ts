import { randomBytes, createCipheriv, createDecipheriv, createHash, randomUUID, randomInt } from 'node:crypto';
import nodemailer from 'nodemailer';
import type pg from 'pg';
import type { Config } from './config.js';
import type { DB } from './db.js';
import { transaction,serialize } from './db.js';
import { codeHash } from './security.js';
const key=(secret:string)=>createHash('sha256').update(secret).digest();
export function seal(secret:string,value:unknown){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key(secret),iv);const bytes=Buffer.concat([c.update(JSON.stringify(value)),c.final()]);return Buffer.concat([iv,c.getAuthTag(),bytes]).toString('base64');}
export function unseal(secret:string,envelope:string){const b=Buffer.from(envelope,'base64'),d=createDecipheriv('aes-256-gcm',key(secret),b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([d.update(b.subarray(28)),d.final()]).toString()) as {to:string;subject:string;text:string};}
export async function queueCode(db:DB,cfg:Config,user:{id:string;email:string},purpose:'verify'|'reset'){
 await serialize(db);
 const code=String(randomInt(100000,1000000));
 await db.query("INSERT INTO email_codes(user_id,purpose,code_hash,expires_at) VALUES($1,$2,$3,now()+interval '15 minutes') ON CONFLICT(user_id,purpose) DO UPDATE SET code_hash=excluded.code_hash,expires_at=excluded.expires_at,attempts=0",[user.id,purpose,codeHash(cfg.secret,user.id,purpose,code)]);
 await db.query('DELETE FROM mail_outbox WHERE user_id=$1 AND purpose=$2 AND sent_at IS NULL',[user.id,purpose]);
 const envelope=seal(cfg.secret,{to:user.email,subject:purpose==='verify'?'Biz Bize · E-posta doğrulama kodun':'Biz Bize · Şifre yenileme kodun',text:`${purpose==='verify'?'E-posta doğrulama':'Şifre yenileme'} kodun: ${code}\n\nKod 15 dakika geçerlidir ve yalnızca bir kez kullanılabilir. Kodu Biz Bize uygulamasına gir. Bu işlemi sen başlatmadıysan mesajı yok say. Destek: sanlibrk13@gmail.com`});
 await db.query('INSERT INTO mail_outbox(id,user_id,purpose,envelope) VALUES($1,$2,$3,$4)',[randomUUID(),user.id,purpose,envelope]);
}
export type MailSender=(value:{to:string;subject:string;text:string})=>Promise<void>;
export function smtpSender(cfg:Config){const transport=nodemailer.createTransport({host:cfg.smtpHost,port:cfg.smtpPort,secure:cfg.smtpSecure,requireTLS:cfg.production&&!cfg.smtpSecure,auth:cfg.smtpUser?{user:cfg.smtpUser,pass:cfg.smtpPass}:undefined,connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000});return async(value:{to:string;subject:string;text:string})=>{let timer:ReturnType<typeof setTimeout>|undefined;try{const delivery=transport.sendMail({from:cfg.mailFrom,...value});if(cfg.serverless)await Promise.race([delivery,new Promise<never>((_,reject)=>{timer=setTimeout(()=>{transport.close();reject(new Error('SMTP attempt deadline exceeded'));},8000);})]);else await delivery;}finally{if(timer)clearTimeout(timer);transport.close();}};}
export async function flushMail(pool:pg.Pool,cfg:Config,send= smtpSender(cfg)){
 return transaction(pool,async db=>{
  const result=await db.query('SELECT * FROM mail_outbox WHERE sent_at IS NULL AND expires_at>now() AND next_attempt<=now() AND attempts<8 ORDER BY next_attempt LIMIT 1 FOR UPDATE SKIP LOCKED');
  const row=result.rows[0];if(!row)return false;
  try{await send(unseal(cfg.secret,row.envelope));await db.query('DELETE FROM mail_outbox WHERE id=$1',[row.id]);}
  catch{await db.query("UPDATE mail_outbox SET attempts=attempts+1,next_attempt=now()+make_interval(secs=>LEAST(600,POWER(2,attempts+1)::integer*10)) WHERE id=$1",[row.id]);}
  return true;
 });
}
