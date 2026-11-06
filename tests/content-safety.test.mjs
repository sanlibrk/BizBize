import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textAllowed, photoAllowed } from '../firebase/functions/src/content-safety.ts';
test('baseline text filter rejects explicit threats including hidden separators', () => {
  assert.equal(textAllowed('Seni öldüreceğim'), false);
  assert.equal(textAllowed('I will k\u200Bill you'), false);
  assert.equal(textAllowed('Birlikte kahve içelim'), true);
});
test('photo safety rejects unsafe, incomplete and unknown responses', () => {
  assert.equal(photoAllowed({ adult: 'UNLIKELY', violence: 'VERY_UNLIKELY', racy: 'POSSIBLE' }), true);
  assert.equal(photoAllowed({ adult: 'LIKELY', violence: 'UNLIKELY', racy: 'UNLIKELY' }), false);
  assert.equal(photoAllowed({ adult: 'UNLIKELY' }), false);
  assert.equal(photoAllowed(undefined), false);
  assert.equal(photoAllowed({ adult: 'UNKNOWN', violence: 'UNLIKELY', racy: 'UNLIKELY' }), false);
});
