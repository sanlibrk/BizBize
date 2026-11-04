// Read-only readiness check. Never prints tokens, keys, URLs or account names.
import { readFile, access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = new URL('../', import.meta.url);
const config = JSON.parse(await readFile(new URL('app.json', root), 'utf8')).expo;
const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const eas = JSON.parse(await readFile(new URL('eas.json', root), 'utf8'));
let env = {};
try {
  const contents = await readFile(new URL('.env', root), 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
} catch {}
const firebaseKeys = ['API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID', 'STORAGE_BUCKET', 'APP_ID'];
const firebaseConfigured = firebaseKeys.every(suffix => {
  const name = `EXPO_PUBLIC_FIREBASE_${suffix}`;
  const value = process.env[name] || env[name] || '';
  return !!value && !value.startsWith('YOUR_');
});
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
  ['Native geliştirme istemcisi', !!pkg.dependencies?.['expo-dev-client']],
  ['Fiziksel iPhone geliştirme profili', eas.build?.development?.developmentClient === true && eas.build.development.distribution === 'internal' && eas.build.development.ios?.simulator === false],
  ['iOS arka plan konum yapılandırması', nativeLocation],
  ['Expo yerel oturumu veya EXPO_TOKEN', expoSession || !!process.env.EXPO_TOKEN],
  ['EAS proje bağlantısı', !!config.extra?.eas?.projectId],
  ['Kullanıcıya ait bundle identifier', !!config.ios?.bundleIdentifier && !config.ios.bundleIdentifier.startsWith('com.example.')],
];
for (const [label, ok] of rows) console.log(`${ok ? 'HAZIR' : 'EKSİK'} · ${label}`);
console.log(`BİLGİ · Firebase genel istemci ayarları ${firebaseConfigured ? 'yerelde tanımlı; EAS ortamı ayrıca kontrol edilmeli' : 'tanımlı değil; hesapsız örnek önizleme kullanılabilir'}. İlk örnek önizleme için Firebase dağıtımı gerekmez.`);
console.log('MANUEL · Etkin Apple Developer üyeliği, iPhone cihaz kaydı, imzalama ve gerçek cihaz izinleri ayrıca doğrulanmalı.');
console.log('Bu kontrol hiçbir anahtarın doğruluğunu veya gerçek cihaz bağlantısını kanıtlamaz. Gizli değerler yazdırılmadı.');
process.exitCode = rows.every(([,ok]) => ok) ? 0 : 1;
