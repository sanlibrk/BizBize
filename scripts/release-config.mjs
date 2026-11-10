import { readFile } from 'node:fs/promises';

export function parseEnv(contents) {
  const values = {};
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)?$/);
    if (!match) continue;
    let value = (match[2] || '').trim();
    if (/^["']/.test(value)) { const quote = value[0]; value = value.slice(1, value.indexOf(quote, 1) === -1 ? undefined : value.indexOf(quote, 1)); }
    else value = value.replace(/\s+#.*$/, '').trim();
    values[match[1]] = value;
  }
  return values;
}
export async function readEnvironment(root, runtime = process.env) {
  let local = {};
  try { local = parseEnv(await readFile(new URL('.env', root), 'utf8')); } catch {}
  return { ...local, ...runtime };
}
export const realValue = value => typeof value === 'string' && value.trim().length > 0 && !/YOUR_|CHANGE_ME|REPLACE_ME/i.test(value);
export function releaseChecks(config, env) {
  const bundle = env.BIZBIZE_IOS_BUNDLE_IDENTIFIER || config.ios?.bundleIdentifier || '';
  const project = env.EAS_PROJECT_ID || config.extra?.eas?.projectId || '';
  return [
    ['Üretim API adresi (HTTPS)', /^https:\/\//.test(env.EXPO_PUBLIC_API_URL||'') && realValue(env.EXPO_PUBLIC_API_URL) && !/localhost|127\.0\.0\.1|your-domain\.example/.test(env.EXPO_PUBLIC_API_URL||'')],
    ['Kullanıcıya ait iOS bundle identifier', /^(?:[A-Za-z][A-Za-z0-9-]*\.)+[A-Za-z][A-Za-z0-9-]*$/.test(bundle) && !bundle.startsWith('com.example.')],
    ['EAS proje kimliği', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(project)],
  ];
}
