// Read-only: output only readiness labels; never output config values or credentials.
import { readFile, access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { readEnvironment, releaseChecks } from './release-config.mjs';
const root = new URL('../', import.meta.url);
const config = JSON.parse(await readFile(new URL('app.json', root), 'utf8')).expo;
const env = await readEnvironment(root);
let modules = false, nativeLocation = false, expoSession = false;
try { await access(new URL('node_modules/expo/bin/cli', root)); modules = true; } catch {}
try { expoSession = !!JSON.parse(await readFile(join(homedir(), '.expo/state.json'), 'utf8')).auth; } catch {}
if (modules) {
  const run = spawnSync(process.execPath, ['node_modules/expo/bin/cli', 'config', '--type', 'introspect', '--json'], { cwd: root, env, encoding: 'utf8', timeout: 30000, windowsHide: true });
  try {
    const plist = JSON.parse(run.stdout)._internal.modResults.ios.infoPlist;
    nativeLocation = plist.UIBackgroundModes.includes('location') && !!plist.NSLocationAlwaysAndWhenInUseUsageDescription;
  } catch {}
}
const buildServer = process.argv.includes('--build');
const rows = [
  ['Yerel Expo bağımlılıkları', modules],
  ...releaseChecks(config, env),
  ...(!buildServer ? [['iOS arka plan konum yapılandırması', nativeLocation], ['Expo oturumu veya EXPO_TOKEN', expoSession || !!env.EXPO_TOKEN]] : []),
];
for (const [label, ok] of rows) console.log(`${ok ? 'HAZIR' : 'EKSİK'} · ${label}`);
console.log('MANUEL · API, PostgreSQL ve SMTP dağıtımı, Apple imzalama, App Store Connect kaydı, moderasyon ve iki iPhone testi ayrıca doğrulanmalı.');
console.log('Bu kontrol canlı hizmetin veya gerçek cihaz davranışının kanıtı değildir.');
process.exitCode = rows.every(([, ok]) => ok) ? 0 : 1;
