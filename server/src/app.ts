import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { ZodError } from 'zod';
import type pg from 'pg';
import type { Config } from './config.js';
import { HttpError } from './security.js';
import { authServices } from './auth.js';
import { actionRoutes } from './actions.js';
import { flushMail, type MailSender } from './mail.js';
import { cleanupExpired } from './retention.js';
import { clientIp,cronAuthorized } from './runtime-policy.js';
export async function createApp(pool:pg.Pool,cfg:Config,operations:{sendMail?:MailSender;schedule?:(work:Promise<unknown>)=>void}={}){
 const app=Fastify({logger:false,bodyLimit:16384,requestTimeout:30000,trustProxy:!cfg.serverless&&cfg.trustProxy?(_address:string,hop:number)=>hop<1:false});
 await app.register(cookie);
 await app.register(cors,{origin:cfg.origins,credentials:true,allowedHeaders:['Content-Type','Authorization','X-BizBize-Client'],methods:['GET','POST','OPTIONS']});
 await app.register(helmet,{contentSecurityPolicy:{directives:{defaultSrc:["'none'"],frameAncestors:["'none'"]}}});
 const auth=authServices(pool,cfg);
 const uploads=new Set<string>();
 app.addHook('onSend',async(req,reply,payload)=>{
  if(cfg.serverless&&reply.statusCode<400&&['/v1/auth/register','/v1/auth/resend','/v1/auth/forgot','/v1/auth/verification-status','/v1/auth/mail-delivery'].includes(req.url.split('?')[0])){const work=flushMail(pool,cfg,operations.sendMail).catch(()=>{console.error('Bounded mail processing unavailable.');});if(operations.schedule)operations.schedule(work);else await work;}
  return payload;
 });
 app.addHook('onResponse',async req=>{uploads.delete(req.id);});
 app.addHook('onTimeout',async req=>{uploads.delete(req.id);});
 app.addHook('onRequestAbort',async req=>{uploads.delete(req.id);});
 app.addHook('onRequest',async(req,reply)=>{
  reply.header('Cache-Control','no-store');reply.header('Referrer-Policy','no-referrer');if(req.method==='OPTIONS')return;
  if(!['GET','HEAD'].includes(req.method)){
   const origin=req.headers.origin;
   if((origin&&!cfg.origins.includes(origin))||(!origin&&(req.cookies[auth.cookie]||req.headers['x-bizbize-client']!=='native'))){reply.code(403);return reply.send({error:{message:'İstek kaynağına izin verilmiyor.'}});}
   if(!req.headers['content-type']?.startsWith('application/json')){reply.code(415);return reply.send({error:{message:'JSON isteği gerekli.'}});}
  }
  if(req.url!=='/healthz')await auth.rate('ip:'+clientIp(req,cfg),600,60);
  if(req.url.startsWith('/v1/actions/')){const u=await auth.user(req,false);if(req.url==='/v1/actions/uploadMemoryPhoto'){await auth.rate('upload:'+u.id,30,3600);if(uploads.size>=2){reply.code(429);return reply.send({error:{message:'Fotoğraf işlemleri yoğun. Biraz sonra tekrar dene.'}});}uploads.add(req.id);}}
 });
 app.setErrorHandler((error,req,reply)=>{
  const status=error instanceof HttpError?error.status:error instanceof ZodError?400:((error as {statusCode?:number}).statusCode===413?413:(error as {statusCode?:number}).statusCode===400?400:500);
  if(status===500)console.error(JSON.stringify({event:'request_error',request:req.id}));
  reply.code(status).send({error:{message:error instanceof HttpError?error.message:status===400?'Gönderilen bilgiler geçersiz.':status===413?'İstek izin verilen boyuttan büyük.':'Sunucu işlemi tamamlanamadı.'}});
 });
 if(cfg.serverless)app.get('/internal/maintenance',async(req,reply)=>{if(!cronAuthorized(req.headers.authorization,cfg.cronSecret)){reply.code(401);return {error:{message:'Yetkisiz işlem.'}};}await cleanupExpired(pool);return {cleaned:true};});
 app.get('/healthz',async()=>{await pool.query('SELECT 1');return {status:'ok'};});auth.routes(app);actionRoutes(app,pool,cfg,auth);return app;
}
