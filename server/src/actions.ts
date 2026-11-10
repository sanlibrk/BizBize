import { randomBytes,randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import { transaction,serialize,type DB } from './db.js';
import type { Auth,User } from './auth.js';
import type { Config } from './config.js';
import { fail,hash,passwordMatches,safeText } from './security.js';
const id=z.uuid(),text=(max:number)=>z.string().trim().min(1).max(max).transform(safeText);
const latitude=z.number().finite().min(-90).max(90),longitude=z.number().finite().min(-180).max(180);
async function pair(db:DB,uid:string,two=true){
 const cid=(await db.query('SELECT couple_id FROM members WHERE user_id=$1',[uid])).rows[0]?.couple_id as string|undefined;
 if(!cid)fail(403,'Önce partnerinle eşleş.');
 const members=(await db.query('SELECT user_id,couple_id,slot FROM members WHERE couple_id=$1 ORDER BY slot',[cid])).rows as {user_id:string;couple_id:string;slot:number}[];
 if(two&&members.length!==2)fail(403,'Eşleşme henüz tamamlanmadı.');return {cid,members};
}
export async function closePair(db:DB,uid:string,block=false){
 const row=(await db.query('SELECT couple_id FROM members WHERE user_id=$1',[uid])).rows[0];if(!row)return;
 const p=await pair(db,uid,false),target=p.members.find(x=>x.user_id!==uid)?.user_id;
 if(block&&target)await db.query('INSERT INTO blocks(owner_id,blocked_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[uid,target]);
 await db.query('UPDATE users SET sharing=false,sharing_version=gen_random_uuid() WHERE couple_id=$1',[p.cid]);
 await db.query('DELETE FROM couples WHERE id=$1',[p.cid]);
}
export function actionRoutes(app:FastifyInstance,pool:pg.Pool,cfg:Config,auth:Auth){
 const tx=<T>(work:(db:DB)=>Promise<T>)=>transaction(pool,async db=>{await serialize(db);return work(db);});
 app.get('/v1/shared',async req=>{const u=await auth.user(req);return tx(async db=>{
  if(!(await db.query('SELECT 1 FROM members WHERE user_id=$1',[u.id])).rowCount)return {members:[],messages:[],memories:[],locations:[]};
  await auth.user(req,true,db);
  const p=await pair(db,u.id,false);
  const memories=(await db.query("SELECT m.id,m.couple_id,m.author_id,m.note,m.place,to_char(m.happened_on,'YYYY-MM-DD') AS happened_on,m.latitude,m.longitude,m.id::text AS photo_path,p.status AS moderation_status,m.created_at FROM memories m JOIN photos p ON p.id=m.id WHERE m.couple_id=$1 AND (p.status='approved' OR m.author_id=$2) ORDER BY m.happened_on DESC,m.created_at DESC LIMIT 200",[p.cid,u.id])).rows;
  const messages=(await db.query('SELECT * FROM messages WHERE couple_id=$1 ORDER BY created_at DESC,id DESC LIMIT 200',[p.cid])).rows.reverse();
  const locations=(await db.query('SELECT * FROM locations WHERE couple_id=$1 AND sharing',[p.cid])).rows;
  return {members:p.members,memories,messages,locations};
 });});
 app.get('/v1/photos/:id',async req=>{const u=await auth.user(req),photo=id.parse((req.params as {id:string}).id);
  const r=await pool.query("SELECT p.bytes FROM photos p JOIN members m ON m.couple_id=p.couple_id WHERE p.id=$1 AND m.user_id=$2 AND (p.status='approved' OR (p.status='pending' AND p.owner_id=$2))",[photo,u.id]);if(!r.rowCount)fail(404,'Fotoğraf bulunamadı.');return {base64:(r.rows[0].bytes as Buffer).toString('base64')};
 });
 app.post('/v1/actions/:action',{bodyLimit:8*1024*1024},async(req,reply)=>{
  const name=(req.params as {action:string}).action,u=await auth.user(req,false),input=(req.body??{}) as Record<string,unknown>;
  const mutate=<T>(work:(db:DB)=>Promise<T>)=>tx(async db=>{await auth.user(req,false,db);return work(db);});
  if(!u.email_verified&&name!=='deleteAccount'&&!(name==='setLocationSharing'&&input.enabled===false))fail(403,'Önce e-posta adresini doğrula.');
  await auth.rate('action:'+u.id,180,60);
  if(name==='createInvite'){
   z.object({}).strict().parse(input);await auth.rate('invite-create:'+u.id,10,3600);
   return mutate(async db=>{
    let cid=(await db.query('SELECT couple_id FROM users WHERE id=$1',[u.id])).rows[0]?.couple_id;
    if(cid){if((await pair(db,u.id,false)).members.length===2)fail(409,'Zaten eşleştin.');}
    else{cid=randomUUID();await db.query('INSERT INTO couples(id) VALUES($1)',[cid]);await db.query('INSERT INTO members(user_id,couple_id,slot) VALUES($1,$2,1)',[u.id,cid]);await db.query('UPDATE users SET couple_id=$2,sharing=false WHERE id=$1',[u.id,cid]);}
    const code=randomBytes(6).toString('hex').toUpperCase(),expires=new Date(Date.now()+86400000);
    await db.query('DELETE FROM invites WHERE couple_id=$1',[cid]);await db.query('INSERT INTO invites(hash,couple_id,owner_id,expires_at) VALUES($1,$2,$3,$4)',[hash(code),cid,u.id,expires]);return {code,expires_at:expires.toISOString()};
   });
  }
  if(name==='joinPair'){
   await auth.rate('invite-join:'+u.id,5,900);const {code}=z.object({code:z.string().max(30)}).strict().parse(input),normalized=code.replace(/[\s-]/g,'').toUpperCase();
   return mutate(async db=>{
    const inv=(await db.query('SELECT * FROM invites WHERE hash=$1 AND expires_at>now()',[hash(normalized)])).rows[0];if(!/^[A-F0-9]{12}$/.test(normalized)||!inv)fail(400,'Kod geçersiz veya süresi dolmuş.');
    if(inv.owner_id===u.id)fail(400,'Kendi kodunla eşleşemezsin.');if((await db.query('SELECT 1 FROM members WHERE user_id=$1',[u.id])).rowCount)fail(409,'Önce mevcut eşleşmeni veya davetini bitir.');
    if((await db.query('SELECT 1 FROM members WHERE couple_id=$1',[inv.couple_id])).rowCount!==1)fail(409,'Davet kullanılamıyor.');
    if((await db.query('SELECT 1 FROM blocks WHERE (owner_id=$1 AND blocked_id=$2) OR (owner_id=$2 AND blocked_id=$1)',[u.id,inv.owner_id])).rowCount)fail(403,'Bu hesapla eşleşme kullanılamıyor.');
    await db.query('INSERT INTO members(user_id,couple_id,slot) VALUES($1,$2,2)',[u.id,inv.couple_id]);await db.query('UPDATE users SET couple_id=$2,sharing=false WHERE id=$1',[u.id,inv.couple_id]);await db.query('DELETE FROM invites WHERE couple_id=$1',[inv.couple_id]);return {couple_id:inv.couple_id};
   });
  }
  if(name==='sendMessage'){
   const b=z.object({id,body:text(2000),kind:z.enum(['text','task'])}).strict().parse(input);
   return mutate(async db=>{const p=await pair(db,u.id),old=(await db.query('SELECT author_id,couple_id FROM messages WHERE id=$1',[b.id])).rows[0];if(old){if(old.author_id!==u.id||old.couple_id!==p.cid)fail(409,'Kayıt kimliği kullanılmış.');return {id:b.id};}await db.query('INSERT INTO messages(id,couple_id,author_id,kind,body) VALUES($1,$2,$3,$4,$5)',[b.id,p.cid,u.id,b.kind,b.body]);return {id:b.id};});
  }
  if(name==='completeTask'){
   const b=z.object({id}).strict().parse(input);return mutate(async db=>{const p=await pair(db,u.id),r=await db.query("UPDATE messages SET completed_at=COALESCE(completed_at,now()) WHERE id=$1 AND couple_id=$2 AND kind='task'",[b.id,p.cid]);if(!r.rowCount)fail(404,'Görev bulunamadı.');return {completed:true};});
  }
  if(name==='uploadMemoryPhoto'){
   const b=z.object({id,photo_base64:z.string().min(4).max(6990508).regex(/^[A-Za-z0-9+/]+={0,2}$/)}).strict().parse(input);await mutate(db=>pair(db,u.id));
   const raw=Buffer.from(b.photo_base64,'base64');if(raw.length>5242880||raw[0]!==255||raw[1]!==216||raw[2]!==255)fail(400,'En fazla 5 MB boyutunda JPEG fotoğraf seç.');
   let bytes:Buffer;try{bytes=await sharp(raw,{limitInputPixels:20000000,failOn:'warning'}).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).jpeg({quality:82}).toBuffer();}catch{fail(400,'Geçerli bir JPEG fotoğraf seç.');}
   return mutate(async db=>{const p=await pair(db,u.id);if((await db.query('SELECT count(*)::integer n FROM photos WHERE couple_id=$1',[p.cid])).rows[0].n>=500)fail(409,'500 fotoğraf sınırına ulaştınız.');const status=cfg.photoMode==='manual'?'pending':'approved';
    const r=await db.query('INSERT INTO photos(id,couple_id,owner_id,bytes,status) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING RETURNING id',[b.id,p.cid,u.id,bytes,status]);if(!r.rowCount)fail(409,'Fotoğraf kimliği kullanılmış.');return {path:b.id,status};});
  }
  if(name==='discardUpload'){
   const b=z.object({id}).strict().parse(input);return mutate(async db=>{const p=await pair(db,u.id);await db.query('DELETE FROM photos p WHERE p.id=$1 AND p.couple_id=$2 AND p.owner_id=$3 AND NOT EXISTS(SELECT 1 FROM memories m WHERE m.id=p.id)',[b.id,p.cid,u.id]);return {discarded:true};});
  }
  if(name==='addMemory'){
   const b=z.object({id,note:text(500),place:text(120),happened_on:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),latitude,longitude,task_id:id.nullish()}).strict().parse(input),d=new Date(b.happened_on+'T12:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==b.happened_on)fail(400,'Tarih geçersiz.');
   return mutate(async db=>{const p=await pair(db,u.id),photo=(await db.query("SELECT status FROM photos WHERE id=$1 AND couple_id=$2 AND owner_id=$3 AND status<>'rejected'",[b.id,p.cid,u.id])).rows[0];if(!photo)fail(400,'Önce fotoğrafı yükle.');
    const old=(await db.query('SELECT author_id,couple_id FROM memories WHERE id=$1',[b.id])).rows[0];if(old){if(old.author_id!==u.id||old.couple_id!==p.cid)fail(409,'Kayıt kullanılmış.');return {id:b.id,pending:photo.status==='pending'};}
    if(b.task_id){const task=(await db.query("SELECT memory_id FROM messages WHERE id=$1 AND couple_id=$2 AND kind='task'",[b.task_id,p.cid])).rows[0];if(!task||task.memory_id)fail(409,'Görev bulunamadı veya başka anıya bağlı.');}
    await db.query('INSERT INTO memories(id,couple_id,author_id,note,place,happened_on,latitude,longitude) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[b.id,p.cid,u.id,b.note,b.place,b.happened_on,b.latitude,b.longitude]);if(b.task_id)await db.query('UPDATE messages SET memory_id=$1,completed_at=COALESCE(completed_at,now()) WHERE id=$2',[b.id,b.task_id]);return {id:b.id,pending:photo.status==='pending'};});
  }
  if(name==='deleteMemory'){
   const b=z.object({id}).strict().parse(input);return mutate(async db=>{const p=await pair(db,u.id),row=(await db.query('SELECT author_id FROM memories WHERE id=$1 AND couple_id=$2',[b.id,p.cid])).rows[0];if(row&&row.author_id!==u.id)fail(403,'Yalnızca kendi anını silebilirsin.');await db.query('DELETE FROM photos WHERE id=$1 AND couple_id=$2 AND owner_id=$3',[b.id,p.cid,u.id]);return {deleted:true};});
  }
  if(name==='setLocationSharing'){
   const {enabled}=z.object({enabled:z.boolean()}).strict().parse(input);return mutate(async db=>{if(enabled)await pair(db,u.id);const version=randomUUID();await db.query('UPDATE users SET sharing=$2,sharing_version=$3 WHERE id=$1',[u.id,enabled,version]);if(!enabled)await db.query('DELETE FROM locations WHERE user_id=$1',[u.id]);return {version};});
  }
  if(name==='publishLocation'){
   const b=z.object({couple_id:id,version:id,latitude,longitude,accuracy:z.number().finite().nonnegative().nullable(),captured_at:z.iso.datetime()}).strict().parse(input),when=new Date(b.captured_at);if(when.getTime()>Date.now()+30000)fail(400,'Cihaz saatini kontrol et.');
   return mutate(async db=>{const own=(await db.query('SELECT * FROM users WHERE id=$1',[u.id])).rows[0] as User;if(!own.sharing||own.sharing_version!==b.version||own.couple_id!==b.couple_id)return {accepted:false};const p=await pair(db,u.id);
    const r=await db.query('INSERT INTO locations(user_id,couple_id,latitude,longitude,accuracy,captured_at,sharing) VALUES($1,$2,$3,$4,$5,$6,true) ON CONFLICT(user_id) DO UPDATE SET latitude=excluded.latitude,longitude=excluded.longitude,accuracy=excluded.accuracy,captured_at=excluded.captured_at,updated_at=now(),sharing=true WHERE locations.captured_at<=excluded.captured_at RETURNING user_id',[u.id,p.cid,b.latitude,b.longitude,b.accuracy,when]);return {accepted:!!r.rowCount};});
  }
  if(name==='disconnectPair'||name==='blockPartner'){z.object({}).strict().parse(input);return mutate(async db=>{await closePair(db,u.id,name==='blockPartner');return name==='blockPartner'?{blocked:true}:{disconnected:true};});}
  if(name==='deleteAccount'){
   const {password}=z.object({password:z.string().min(1).max(128)}).strict().parse(input);await auth.rate('delete:'+u.id,5,900);if(!await passwordMatches(password,u.password_hash))fail(403,'Silmek için mevcut şifreni doğru gir.');
   await mutate(async db=>{const fresh=(await db.query('SELECT password_hash FROM users WHERE id=$1',[u.id])).rows[0];if(fresh?.password_hash!==u.password_hash)fail(403,'Hesap güvenlik bilgileri değişti. Yeniden giriş yap.');await closePair(db,u.id);await db.query('DELETE FROM users WHERE id=$1',[u.id]);await db.query("INSERT INTO audit_events(action) VALUES('account_deleted')");});reply.clearCookie(auth.cookie,{path:'/',secure:cfg.production,sameSite:'lax'});return {deleted:true};
  }
  if(name==='reportContent'){
   const b=z.object({id,kind:z.enum(['partner','message','memory']),content_id:id.nullish(),reason:z.enum(['harassment','inappropriate','privacy','other']),details:z.string().trim().max(1000).default('')}).strict().parse(input);await auth.rate('report:'+u.id,10,86400);
   return mutate(async db=>{const p=await pair(db,u.id);let target=p.members.find(x=>x.user_id!==u.id)?.user_id,evidence='';
    if(b.kind!=='partner'){if(!b.content_id)fail(400,'İçerik kimliği gerekli.');const row=b.kind==='message'?(await db.query('SELECT author_id,body FROM messages WHERE id=$1 AND couple_id=$2',[b.content_id,p.cid])).rows[0]:(await db.query('SELECT author_id,note FROM memories WHERE id=$1 AND couple_id=$2',[b.content_id,p.cid])).rows[0];if(!row)fail(404,'İçerik bulunamadı.');target=row.author_id;evidence=row.body??row.note;}
    if(!target||target===u.id)fail(400,'Yalnızca partnerinin içeriğini bildirebilirsin.');const old=(await db.query('SELECT reporter_id FROM reports WHERE id=$1',[b.id])).rows[0];if(old&&old.reporter_id!==u.id)fail(409,'Bildirim kimliği kullanılmış.');await db.query('INSERT INTO reports(id,reporter_id,target_id,kind,reason,details,evidence) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING',[b.id,u.id,target,b.kind,b.reason,b.details,evidence]);return {reported:true};});
  }
  fail(404,'İşlem bulunamadı.');
 });
}
