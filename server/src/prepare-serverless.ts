import { randomBytes } from 'node:crypto';
import { open, unlink } from 'node:fs/promises';
import { Pool, transaction } from './db.js';
import { migrate } from './migrate.js';
const destination=new URL('../.env.serverless',import.meta.url);
const direct=process.env.DIRECT_DATABASE_URL;
if(!direct)throw new Error('Set DIRECT_DATABASE_URL privately in server/.env.bootstrap first.');
const owner=new URL(direct);
if(!['postgres:','postgresql:'].includes(owner.protocol)||owner.hostname.includes('-pooler.'))throw new Error('Use the dedicated direct PostgreSQL owner URL, not the pooled hostname.');
// Never overwrite generated credentials or rotate an existing deployment silently.
const file=await open(destination,'wx',0o600);
const pool=new Pool({connectionString:direct,max:1,connectionTimeoutMillis:10000});let saved=false;
try{
 const exists=await pool.query("SELECT 1 FROM pg_roles WHERE rolname='bizbize_api'");
 if(exists.rowCount)throw new Error('bizbize_api already exists. Reuse the original private environment file; do not repeat bootstrap.');
 await migrate(pool);
 const password=randomBytes(32).toString('hex'),secret=randomBytes(32).toString('hex'),cron=randomBytes(32).toString('hex');
 const runtime=new URL(direct);runtime.username='bizbize_api';runtime.password=password;
 if(runtime.hostname.endsWith('.neon.tech'))runtime.hostname=runtime.hostname.replace('.', '-pooler.');
 // Write the secret file before committing role creation, so credentials remain recoverable.
 await file.writeFile(`NODE_ENV=production\nDEPLOYMENT_MODE=serverless\nDATABASE_URL=${runtime.toString()}\nAPP_SECRET=${secret}\nCRON_SECRET=${cron}\nPUBLIC_URL=CHANGE_ME_TO_YOUR_HTTPS_VERCEL_ADDRESS\nWEB_ORIGINS=CHANGE_ME_TO_YOUR_HTTPS_VERCEL_ADDRESS\nSMTP_HOST=smtp.gmail.com\nSMTP_PORT=465\nSMTP_SECURE=true\nSMTP_USER=CHANGE_ME_TO_YOUR_SENDING_ACCOUNT\nSMTP_PASS=CHANGE_ME_TO_YOUR_APP_PASSWORD\nMAIL_FROM=CHANGE_ME_TO_YOUR_SENDING_ACCOUNT\nPHOTO_MODERATION=manual\n`);
 await file.sync();saved=true;
 await transaction(pool,async db=>{
  const sql=(await db.query("SELECT format('CREATE ROLE bizbize_api LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L',$1::text)",[password])).rows[0].format;
  await db.query(sql);
  const database=(await db.query('SELECT current_database() AS name')).rows[0].name;
  await db.query((await db.query("SELECT format('GRANT CONNECT ON DATABASE %I TO bizbize_api',$1::text)",[database])).rows[0].format);
  await db.query('GRANT USAGE ON SCHEMA public TO bizbize_api');
  const tables=await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'schema_migrations'");
  for(const row of tables.rows)await db.query((await db.query("SELECT format('GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.%I TO bizbize_api',$1::text)",[row.tablename])).rows[0].format);
  await db.query('GRANT SELECT ON schema_migrations TO bizbize_api');
  await db.query('GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO bizbize_api');
 });
 console.log('Dedicated schema and restricted application role prepared. Private values saved to server/.env.serverless; never paste or commit this file. Complete the HTTPS and sender fields before deployment.');
}catch(error){if(!saved)await unlink(destination).catch(()=>{});throw error;}finally{await file.close();await pool.end();}
