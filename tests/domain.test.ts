import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clusterMemories, locationState, validateDraft } from '../src/domain';
import { makeDemo } from '../src/demo';
test('Konum eskiliği ölçüm zamanından hesaplanır; paylaşım kapalıysa gösterilmez', () => {
  const sample = makeDemo().locations[0];
  const now = Date.parse(sample.captured_at);
  assert.equal(locationState(sample, now + 119999), 'recent');
  assert.equal(locationState(sample, now + 120001), 'stale');
  assert.equal(locationState({ ...sample, updated_at: new Date(now + 999999).toISOString() }, now + 120001), 'stale');
  assert.equal(locationState({ ...sample, sharing: false }, now), 'off');
  assert.equal(locationState({ ...sample, captured_at: 'invalid' }, now), 'stale');
  assert.equal(locationState(sample, now - 60000), 'stale');
});
test('Anı kümeleri yakınlaştırıldığında fotoğraf noktalarına ayrılır', () => {
  const memories = makeDemo().memories;
  assert.ok(clusterMemories(memories, 1).length < memories.length);
  assert.equal(clusterMemories(memories, .01).length, memories.length);
  assert.equal(clusterMemories([], 1).length, 0);
});
test('Fotoğrafsız, yersiz ve geçersiz tarihli anı reddedilir', () => {
  const valid = { uri: 'photo', note: 'Bir anı', place: 'Bir yer', happened_on: '2026-11-02', latitude: 41, longitude: 29 };
  assert.equal(validateDraft(valid), null);
  for (const invalid of [{ ...valid, uri: '' }, { ...valid, note: ' ' }, { ...valid, latitude: NaN }, { ...valid, longitude: 181 }, { ...valid, happened_on: '2026-02-30' }, { ...valid, happened_on: '2026-99-01' }]) assert.ok(validateDraft(invalid));
});
test('Yeni gerçek alanın karşılığı olan boş önizlemede içerik yoktur', () => {
  const data = makeDemo(true);
  assert.equal(data.memories.length + data.messages.length + data.locations.length, 0);
  assert.equal(data.members.length, 2);
});
