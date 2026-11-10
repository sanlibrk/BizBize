import { readFile } from 'node:fs/promises';
import { Pool, transaction } from './db.js';
export async function migrate(pool: InstanceType<typeof Pool>) {
 const sql=await readFile(new URL('../migrations/001_initial.sql',import.meta.url),'utf8').catch(()=>readFile(new URL('../../migrations/001_initial.sql',import.meta.url),'utf8'));
 await transaction(pool,async db=>{await db.query('SELECT pg_advisory_xact_lock(773800)');await db.query('CREATE TABLE IF NOT EXISTS schema_migrations(version integer PRIMARY KEY)');const r=await db.query('SELECT version FROM schema_migrations WHERE version=1');if(!r.rowCount){await db.query(sql);await db.query('INSERT INTO schema_migrations VALUES(1)');}});
}
if(process.argv[1]?.endsWith('migrate.ts')||process.argv[1]?.endsWith('migrate.js')) {const pool=new Pool({connectionString:process.env.DATABASE_URL});await migrate(pool);await pool.end();console.log('Database schema ready.');}
