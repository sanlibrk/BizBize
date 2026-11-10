import { spawnSync } from 'node:child_process';
if (['production', 'testflight'].includes(process.env.EAS_BUILD_PROFILE)) {
  const result = spawnSync(process.execPath, ['scripts/ios-preflight.mjs', '--build'], { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}
