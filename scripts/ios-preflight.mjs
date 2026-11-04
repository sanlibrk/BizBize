// Read-only readiness check. Never prints tokens, keys, URLs or account names.
import { readFile, access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = new URL('../', import.meta.url);
const config = JSON.parse(await readFile(new URL('app.json', root), 'utf8')).expo;
let env = {};
try {
  const contents = await readFile(new URL('.env', root), 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
} catch {}
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL || '';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
let expoSession = false;
try { expoSession = !!JSON.parse(await readFile(join(homedir(), '.expo/state.json'), 'utf8')).auth; } catch {}
let modules = false;
try { await access(new URL('node_modules/expo/bin/cli', root)); modules = true; } catch {}
let nativeLocation = false;
if (modules) {
  const run = spawnSync(process.execPath, ['node_modules/expo/bin/cli', 'config', '--type', 'introspect', '--json'], { cwd: root, encoding: 'utf8', timeout: 30000, windowsHide: true });
  try {
    const plist = JSON.parse(run.stdout)._internal.modResults.ios.infoPlist;
    nativeLocation = plist.UIBackgroundModes.includes('location') && !!plist.NSLocationAlwaysAndWhenInUseUsageDescription;
  } catch {}
}
const rows = [
  ['Yerel Expo bağımlılıkları', modules],
  ['iOS arka plan konum yapılandırması', nativeLocation],
  ['Supabase genel URL/anahtar değerleri', /^https:\/\//.test(url) && !url.includes('YOUR_PROJECT') && key.startsWith('sb_publishable_')],
  ['Expo yerel oturumu veya EXPO_TOKEN', expoSession || !!process.env.EXPO_TOKEN],
  ['EAS proje bağlantısı', !!config.extra?.eas?.projectId],
  ['Kullanıcıya ait bundle identifier', !!config.ios?.bundleIdentifier && !config.ios.bundleIdentifier.startsWith('com.example.')],
];
for (const [label, ok] of rows) console.log(`${ok ? 'HAZIR' : 'EKSİK'} · ${label}`);
console.log('MANUEL · Apple Developer imzalama erişimi, iki fiziksel iPhone, cihaz izinleri ve Supabase dağıtımı ayrıca doğrulanmalı.');
console.log('Bu kontrol hiçbir anahtarın doğruluğunu veya gerçek cihaz bağlantısını kanıtlamaz. Gizli değerler yazdırılmadı.');
process.exitCode = rows.every(([,ok]) => ok) ? 0 : 1;
