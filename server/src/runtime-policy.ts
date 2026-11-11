import { isIP } from 'node:net';
import { timingSafeEqual } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import type { Config } from './config.js';
import type pg from 'pg';
export function clientIp(req: FastifyRequest, cfg: Config) {
  // Only the Vercel runtime may supply this platform-overwritten header.
  const forwarded = req.headers['x-vercel-forwarded-for'];
  return cfg.vercel && typeof forwarded === 'string' && isIP(forwarded.trim()) ? forwarded.trim() : req.ip;
}
export function cronAuthorized(header: string | undefined, secret: string | undefined) {
  if (!secret || !header) return false;
  const actual = Buffer.from(header), expected = Buffer.from('Bearer ' + secret);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export async function assertRuntimeDatabase(pool: pg.Pool, production: boolean) {
  if (production) {
    const {rows} = await pool.query('SELECT rolsuper,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname=current_user');
    if (!rows[0] || rows[0].rolsuper || rows[0].rolcreatedb || rows[0].rolcreaterole) throw new Error('Production API requires a non-superuser application database role.');
  }
}
