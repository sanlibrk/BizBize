// Fail CI on missing permission declarations; never print the resolved app config.
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const result = spawnSync(process.execPath, ['node_modules/expo/bin/cli', 'config', '--type', 'introspect', '--json'], { encoding: 'utf8', timeout: 60000 });
if (result.status !== 0) throw new Error('Expo native config introspection failed.');
const config = JSON.parse(result.stdout);
const plist = config._internal?.modResults?.ios?.infoPlist;
assert.ok(plist?.UIBackgroundModes?.includes('location'), 'Missing background location mode');
assert.ok(plist?.NSLocationWhenInUseUsageDescription, 'Missing foreground purpose string');
assert.ok(plist?.NSLocationAlwaysAndWhenInUseUsageDescription, 'Missing background purpose string');
assert.ok(plist?.NSPhotoLibraryUsageDescription, 'Missing photo purpose string');
assert.equal(config.ios?.privacyManifests?.NSPrivacyTracking, false);
console.log('Native permission configuration and tracking declaration checked. Signed binary SDK manifests still require review.');
