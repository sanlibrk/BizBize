import { waitUntil, attachDatabasePool } from '@vercel/functions';
import { Pool } from './db.js';
import { configFrom } from './config.js';
import { createApp } from './app.js';
import { assertRuntimeDatabase } from './runtime-policy.js';
let ready: ReturnType<typeof initialize> | undefined;
async function initialize() {
  const cfg = configFrom();
  if (!cfg.serverless) throw new Error('Serverless entry requires DEPLOYMENT_MODE=serverless.');
  const pool = new Pool({connectionString:cfg.databaseUrl,max:2,connectionTimeoutMillis:8000,idleTimeoutMillis:10000,allowExitOnIdle:true});
  pool.on('error',()=>console.error('Idle database connection unavailable.'));
  if(cfg.vercel)attachDatabasePool(pool);
  try {
    await assertRuntimeDatabase(pool, cfg.production);
    const schema = await pool.query('SELECT version FROM schema_migrations WHERE version=1');
    if (!schema.rowCount) throw new Error('Initialize the dedicated database before deployment.');
    const app = await createApp(pool,cfg,cfg.vercel?{schedule:waitUntil}:{});
    app.addHook('onClose',async()=>{await pool.end();});
    await app.ready();
    return app;
  } catch (error) { await pool.end(); throw error; }
}
// One small pool per warm instance; no DDL or perpetual timer at request time.
export function serverlessApp() {
  if (!ready) ready = initialize().catch(error => {ready=undefined;throw error;});
  return ready;
}
