// Run from firebase/functions with explicitly configured Application Default Credentials.
// No writes without an explicit action and report id; never prints report text or personal data.
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
const projectId = process.env.GCLOUD_PROJECT;
if (!projectId || projectId.startsWith('demo-')) throw new Error('Set GCLOUD_PROJECT to the intended cloud project.');
initializeApp({ projectId });
const db = getFirestore();
const [action = 'list', reportId] = process.argv.slice(2);
if (action === 'list') {
  const rows = await db.collection('reports').where('status', '==', 'open').limit(50).get();
  for (const row of rows.docs) console.log(JSON.stringify({ report: row.id, kind: row.data().kind, reason: row.data().reason, created_at: row.data().created_at }));
  console.log('Read evidence only in the restricted Firebase Console. Do not export it to public logs.');
} else if (action === 'resolve' && /^[a-f0-9-]{36}$/.test(reportId || '')) {
  await db.doc(`reports/${reportId}`).update({ status: 'resolved', resolved_at: new Date().toISOString() });
  console.log('Report resolved. Content removal/account action must be completed separately and recorded privately.');
} else throw new Error('Usage: node moderation.mjs [list | resolve REPORT_UUID]');
