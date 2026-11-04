// Explicit, temporary cloud Auth smoke test. Never logs email, password, token or UID.
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase/app';
import { createUserWithEmailAndPassword, deleteUser, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
if (!process.argv.includes('--run')) throw new Error('Bulutta geçici hesap testi için açık --run seçeneği gerekli.');
if (process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Bu komut cloud testi içindir; emülatör ortamında çalıştırma.');
const env = Object.fromEntries((await readFile(new URL('../.env', import.meta.url), 'utf8')).split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => { const i = line.indexOf('='); return [line.slice(0,i),line.slice(i+1).trim()]; }));
if (!env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || env.EXPO_PUBLIC_FIREBASE_PROJECT_ID.startsWith('demo-')) throw new Error('Gerçek client config bulunamadı.');
const app = initializeApp({ apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY, authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN, projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID }, 'cloud-auth-smoke');
const auth = getAuth(app), email = `bizbize-smoke-${randomUUID()}@example.invalid`, password = randomUUID() + 'Aa1!';
let createdUid;
try {
  const created = await createUserWithEmailAndPassword(auth, email, password); createdUid = created.user.uid;
  await signOut(auth);
  const signedIn = await signInWithEmailAndPassword(auth, email, password);
  if (signedIn.user.uid !== createdUid) throw new Error('Test hesabı kimliği uyuşmuyor.');
  await deleteUser(signedIn.user); createdUid = undefined;
  console.log(JSON.stringify({ project: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID, cloud: true, signUp: 'passed', signIn: 'passed', temporaryAccountDeleted: true }));
} catch (error) {
  if (createdUid && auth.currentUser?.uid === createdUid) { try { await deleteUser(auth.currentUser); createdUid = undefined; } catch {} }
  console.log(JSON.stringify({ cloud: true, passed: false, code: error.code ?? 'unknown', temporaryAccountCleanupPending: !!createdUid }));
  process.exitCode = 1;
} finally { await deleteApp(app); }
