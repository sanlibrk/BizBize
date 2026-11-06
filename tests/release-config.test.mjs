import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEnv, releaseChecks, firebaseKeys } from '../scripts/release-config.mjs';
test('dotenv parser keeps quoted hashes, ignores comments and supports export', () => {
  assert.deepEqual(parseEnv('export A="value#part"\nB=hello # comment\n#skip\nEMPTY=\n'), { A: 'value#part', B: 'hello', EMPTY: '' });
});
const complete = Object.fromEntries(firebaseKeys.map(key => [key, 'configured-value']));
Object.assign(complete, { EXPO_PUBLIC_FIREBASE_USE_EMULATORS: '0', BIZBIZE_IOS_BUNDLE_IDENTIFIER: 'com.acme.bizbize', EAS_PROJECT_ID: '12345678-1234-1234-1234-123456789012' });
test('release requires cloud config and owned native/project identifiers', () => {
  assert.ok(releaseChecks({}, complete).every(([, ok]) => ok));
  for (const overrides of [{ EXPO_PUBLIC_FIREBASE_API_KEY: 'YOUR_KEY' }, { EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'demo-yanyana' }, { EXPO_PUBLIC_FIREBASE_USE_EMULATORS: '1' }, { BIZBIZE_IOS_BUNDLE_IDENTIFIER: 'com.example.bizbize' }, { EAS_PROJECT_ID: '' }]) {
    assert.ok(releaseChecks({}, { ...complete, ...overrides }).some(([, ok]) => !ok));
  }
});
