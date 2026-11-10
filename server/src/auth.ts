import { randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { FastifyInstance,FastifyRequest,FastifyReply } from 'fastify';
import type pg from 'pg';
import type { Config } from './config.js';
import { transaction,serialize } from './db.js';
import { fail,hash,token,passwordHash,passwordMatches,codeHash } from './security.js';
import { queueCode } from './mail.js';
export type User={id:string;email:string;email_verified:boolean;couple_id:string|null;sharing:boolean;sharing_version:string;password_hash:string;disabled:boolean};
export const emailSchema=z.string().trim().toLowerCase().email().max(254);
export const passwordSchema=z.string().min(10,'Şifre en az 10 karakter olmalı.').max(128);
export const publicUser=(u:User)=>({id:u.id,email:u.email,emailVerified:u.email_verified});
export function authServices(pool:pg.Pool,cfg:Config){
 const cookie=cfg.production?'__Host-bizbize':'bizbize_session';
 const cookieOptions={path:'/',httpOnly:true,secure:cfg.production,sameSite:'lax' as const,maxAge:7*86400};
 async function rate(key:string,max:number,seconds:number){
  const result=await pool.query('INSERT INTO rate_limits(key,count,expires_at) VALUES($1,1,now()+make_interval(secs=>$2)) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.expires_at<=now() THEN 1 ELSE rate_limits.count+1 END,expires_at=CASE WHEN rate_limits.expires_at<=now() THEN excluded.expires_at ELSE rate_limits.expires_at END RETURNING count',[hash(key),seconds]);
  if(result.rows[0].count>max)fail(429,'Çok fazla deneme. Bir süre sonra tekrar dene.');
 }
 async function user(req:FastifyRequest,verified=true){
  const bearer=req.headers.authorization?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
  const value=bearer||req.cookies[cookie];if(!value)fail(401,'Önce giriş yap.');
  const r=await pool.query('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND NOT u.disabled',[hash(value)]);
  const u=r.rows[0] as User|undefined;if(!u)fail(401,'Oturum sona erdi. Yeniden giriş yap.');
  if(verified&&!u.email_verified)fail(403,'Önce e-posta adresini doğrula.');return u;
 }
 async function issue(req:FastifyRequest,reply:FastifyReply,u:User){
  const value=token();await pool.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')",[hash(value),u.id]);
  // Browsers receive only an HttpOnly cookie; no token in localStorage or JSON.
  if(req.headers['x-bizbize-client']==='native')return {user:publicUser(u),token:value};
  reply.setCookie(cookie,value,cookieOptions);return {user:publicUser(u)};
 }
 async function consume(email:string,purpose:'verify'|'reset',code:string,newPassword?:string){
  const result=await transaction(pool,async db=>{
   const r=await db.query('SELECT u.*,c.code_hash,c.expires_at,c.attempts FROM users u JOIN email_codes c ON c.user_id=u.id AND c.purpose=$2 WHERE u.email=$1 AND NOT u.disabled FOR UPDATE OF c,u',[email,purpose]);const row=r.rows[0];
   if(!row||row.attempts>=5||new Date(row.expires_at)<=new Date())return false;
   await db.query('UPDATE email_codes SET attempts=attempts+1 WHERE user_id=$1 AND purpose=$2',[row.id,purpose]);
   if(!timingSafeEqual(Buffer.from(row.code_hash),Buffer.from(codeHash(cfg.secret,row.id,purpose,code))))return false;
   await db.query('DELETE FROM email_codes WHERE user_id=$1 AND purpose=$2',[row.id,purpose]);
   await db.query('DELETE FROM mail_outbox WHERE user_id=$1 AND purpose=$2',[row.id,purpose]);
   if(purpose==='verify')await db.query('UPDATE users SET email_verified=true WHERE id=$1',[row.id]);
   else {await db.query('UPDATE users SET password_hash=$2,sharing=false,sharing_version=gen_random_uuid() WHERE id=$1',[row.id,await passwordHash(newPassword!)]);await db.query('DELETE FROM locations WHERE user_id=$1',[row.id]);await db.query('DELETE FROM sessions WHERE user_id=$1',[row.id]);}
   return true;
  });if(!result)fail(400,'Kod geçersiz, süresi dolmuş veya deneme sınırına ulaşılmış. Yeni kod iste.');
 }
 function routes(app:FastifyInstance){
  app.post('/v1/auth/register',async(req,reply)=>{
   const body=z.object({email:emailSchema,password:passwordSchema,terms_version:z.literal('2026-11-10')}).strict().parse(req.body);
   await rate('register:'+req.ip,5,3600);await rate('register-email:'+body.email,3,600);
   const pw=await passwordHash(body.password),id=randomUUID();
   const u=await transaction(pool,async db=>{
    const r=await db.query('INSERT INTO users(id,email,password_hash,sharing_version,terms_version) VALUES($1,$2,$3,$4,$5) ON CONFLICT(email) DO NOTHING RETURNING *',[id,body.email,pw,randomUUID(),body.terms_version]);
    if(!r.rows[0])fail(400,'Kayıt tamamlanamadı. Giriş yapmayı veya şifre yenilemeyi dene.');
    await queueCode(db,cfg,r.rows[0],'verify');return r.rows[0] as User;
   });reply.code(201);return issue(req,reply,u);
  });
  app.post('/v1/auth/login',async(req,reply)=>{
   const body=z.object({email:emailSchema,password:z.string().min(1).max(128)}).strict().parse(req.body);
   await rate('login-email:'+body.email,10,900);await rate('login-ip:'+req.ip,40,900);
   const r=await pool.query('SELECT * FROM users WHERE email=$1',[body.email]);const u=r.rows[0] as User|undefined;
   const dummy='scrypt$32768$00000000000000000000000000000000$'+'00'.repeat(64);
   const correct=await passwordMatches(body.password,u?.password_hash||dummy);
   if(!u||u.disabled||!correct)fail(401,'E-posta veya şifre hatalı.');return issue(req,reply,u);
  });
  app.get('/v1/auth/me',async req=>({user:publicUser(await user(req,false))}));
  app.post('/v1/auth/logout',async(req,reply)=>{
   const u=await user(req,false);
   await transaction(pool,async db=>{await serialize(db);await db.query('UPDATE users SET sharing=false,sharing_version=$2 WHERE id=$1',[u.id,randomUUID()]);await db.query('DELETE FROM locations WHERE user_id=$1',[u.id]);await db.query('DELETE FROM sessions WHERE token_hash=$1',[hash(req.headers.authorization?.replace(/^Bearer /,'')||req.cookies[cookie]||'')]);});
   reply.clearCookie(cookie,{path:'/',secure:cfg.production,sameSite:'lax'});return {loggedOut:true};
  });
  app.post('/v1/auth/resend',async req=>{const u=await user(req,false);await rate('verify-send:'+u.id,3,600);if(!u.email_verified)await transaction(pool,db=>queueCode(db,cfg,u,'verify'));return {queued:true};});
  app.post('/v1/auth/verify',async req=>{const u=await user(req,false);const {code}=z.object({code:z.string().regex(/^\d{6}$/)}).strict().parse(req.body);await rate('verify-attempt:'+u.id,10,900);await consume(u.email,'verify',code);return {verified:true};});
  app.post('/v1/auth/forgot',async req=>{
   const {email}=z.object({email:emailSchema}).strict().parse(req.body);await rate('reset-ip:'+req.ip,10,3600);await rate('reset-email:'+email,3,600);
   const r=await pool.query('SELECT * FROM users WHERE email=$1 AND NOT disabled',[email]);if(r.rows[0])await transaction(pool,db=>queueCode(db,cfg,r.rows[0],'reset'));return {queued:true};
  });
  app.post('/v1/auth/reset',async req=>{
   const b=z.object({email:emailSchema,code:z.string().regex(/^\d{6}$/),password:passwordSchema}).strict().parse(req.body);await rate('reset-attempt:'+req.ip,20,900);await consume(b.email,'reset',b.code,b.password);return {reset:true};
  });
  app.post('/v1/auth/password',async req=>{
   const u=await user(req,false),b=z.object({current_password:z.string().min(1).max(128),password:passwordSchema}).strict().parse(req.body);await rate('change-password:'+u.id,5,900);
   if(!await passwordMatches(b.current_password,u.password_hash))fail(403,'Mevcut şifre hatalı.');const pw=await passwordHash(b.password);
   await transaction(pool,async db=>{await db.query('UPDATE users SET password_hash=$2,sharing=false,sharing_version=gen_random_uuid() WHERE id=$1',[u.id,pw]);await db.query('DELETE FROM locations WHERE user_id=$1',[u.id]);await db.query('DELETE FROM sessions WHERE user_id=$1',[u.id]);});return {reset:true};
  });
 }
 return {user,rate,routes,cookie};
}
export type Auth=ReturnType<typeof authServices>;
