import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseEnv,releaseChecks} from '../scripts/release-config.mjs';
test('dotenv parser preserves quoted hashes and supports export',()=>{assert.deepEqual(parseEnv('export A="value#part"\nB=hello # comment\n#skip\nEMPTY=\n'),{A:'value#part',B:'hello',EMPTY:''});});
const complete={EXPO_PUBLIC_API_URL:'https://api.bizbize.test',BIZBIZE_IOS_BUNDLE_IDENTIFIER:'com.acme.bizbize',EAS_PROJECT_ID:'12345678-1234-1234-1234-123456789012'};
test('release refuses plaintext transport, placeholder and local addresses',()=>{assert.ok(releaseChecks({},complete).every(([,ok])=>ok));for(const api of ['', 'http://api.bizbize.test','https://localhost','https://your-domain.example'])assert.ok(releaseChecks({},{...complete,EXPO_PUBLIC_API_URL:api}).some(([,ok])=>!ok));});
