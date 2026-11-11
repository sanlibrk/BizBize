import type pg from 'pg';
// Daily serverless scheduling can physically purge up to a day after logical expiry.
export async function cleanupExpired(pool: pg.Pool) {
  await pool.query("DELETE FROM reports WHERE expires_at<now(); DELETE FROM email_codes WHERE expires_at<now(); DELETE FROM invites WHERE expires_at<now(); DELETE FROM mail_outbox WHERE expires_at<now(); DELETE FROM sessions WHERE expires_at<now(); DELETE FROM rate_limits WHERE expires_at<now(); DELETE FROM photos WHERE created_at<now()-interval '1 day' AND NOT EXISTS(SELECT 1 FROM memories m WHERE m.id=photos.id); DELETE FROM audit_events WHERE created_at<now()-interval '90 days'");
}
