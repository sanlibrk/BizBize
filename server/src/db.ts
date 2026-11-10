import pg from 'pg';
export const { Pool } = pg;
export type DB = pg.PoolClient;
export async function transaction<T>(pool: pg.Pool, work: (db: DB) => Promise<T>) {
  const db = await pool.connect();
  try { await db.query('BEGIN'); await db.query("SET LOCAL statement_timeout = '10s'"); const result = await work(db); await db.query('COMMIT'); return result; }
  catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
}
export async function serialize(db: DB) { await db.query('SELECT pg_advisory_xact_lock(773801)'); }
// Membership changes share an advisory transaction lock; data operations lock the pair row.
