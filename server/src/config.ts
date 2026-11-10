import { z } from 'zod';
export function configFrom(env: NodeJS.ProcessEnv = process.env) {
  const production = env.NODE_ENV === 'production';
  const cfg = z.object({
    databaseUrl: z.string().min(1), port: z.coerce.number().int().min(1).max(65535),
    publicUrl: z.url(), origins: z.array(z.url()).min(1), secret: z.string().min(32),
    smtpHost: z.string().min(1), smtpPort: z.coerce.number().int().positive(), smtpSecure: z.boolean(),
    smtpUser: z.string().optional(), smtpPass: z.string().optional(), mailFrom: z.string().min(3),
    trustProxy: z.boolean(), photoMode: z.enum(['development','manual']), production: z.boolean(),
  }).parse({
    databaseUrl: env.DATABASE_URL, port: env.PORT || 3001, publicUrl: env.PUBLIC_URL || 'http://localhost:3001',
    origins: (env.WEB_ORIGINS || 'http://localhost:8081,http://127.0.0.1:8081').split(',').map(x=>x.trim()),
    secret: env.APP_SECRET || (!production ? 'local-development-only-change-before-deploy-2026' : ''),
    smtpHost: env.SMTP_HOST || (!production ? '127.0.0.1' : ''), smtpPort: env.SMTP_PORT || 1025,
    smtpSecure: env.SMTP_SECURE === 'true', smtpUser: env.SMTP_USER, smtpPass: env.SMTP_PASS,
    mailFrom: env.MAIL_FROM || (!production ? 'Biz Bize <hello@bizbize.local>' : ''),
    trustProxy: env.TRUST_PROXY === '1', photoMode: env.PHOTO_MODERATION || (production ? 'manual' : 'development'), production,
  });
  if (production && (cfg.photoMode === 'development' || !cfg.publicUrl.startsWith('https://') || cfg.origins.some(x=>!x.startsWith('https://')) || (/local-development|CHANGE_ME|REPLACE_ME/.test(cfg.secret) || cfg.databaseUrl.includes('CHANGE_ME') || cfg.smtpHost.endsWith('.example') || cfg.publicUrl.includes('your-domain.example')))) throw new Error('Production requires HTTPS, an independent secret and manual photo moderation.');
  return cfg;
}
export type Config = ReturnType<typeof configFrom>;
