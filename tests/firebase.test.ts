import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getIdToken, initializeAuth, inMemoryPersistence, reload } from 'firebase/auth';
import { collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore, onSnapshot, setDoc } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import { connectStorageEmulator, getBytes, getMetadata, getStorage, ref, uploadBytes } from 'firebase/storage';

const enabled = process.env.FIRESTORE_EMULATOR_HOST === '127.0.0.1:8085';
test('Firebase SDK: Auth + Firestore kuralları + Storage + callable Functions', { skip: !enabled, timeout: 180000 }, async t => {
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
  const server = createRequire(new URL('../firebase/functions/package.json', import.meta.url));
  const adminApp = server('firebase-admin/app').initializeApp({ projectId: 'demo-yanyana', storageBucket: 'demo-yanyana.appspot.com' }, 'security-tests');
  const adminAuth = server('firebase-admin/auth').getAuth(adminApp);
  const adminDb = server('firebase-admin/firestore').getFirestore(adminApp);
  const clientApps: ReturnType<typeof initializeApp>[] = [];
  function makeClient() {
    const app = initializeApp({ apiKey: 'demo-key', projectId: 'demo-yanyana', storageBucket: 'demo-yanyana.appspot.com' }, randomUUID());
    const auth = initializeAuth(app, { persistence: inMemoryPersistence });
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    const db = getFirestore(app); connectFirestoreEmulator(db, '127.0.0.1', 8085);
    const storage = getStorage(app); connectStorageEmulator(storage, '127.0.0.1', 9199);
    const functions = getFunctions(app, 'europe-west1'); connectFunctionsEmulator(functions, '127.0.0.1', 5001);
    const client = { app, auth, db, storage, invoke: async <T = Record<string, unknown>>(name: string, data: Record<string, unknown> = {}) => {
      const result = await httpsCallable<Record<string, unknown>, T & { error?: string }>(functions, name)(data);
      if (result.data?.error) throw new Error(result.data.error);
      return result.data;
    } };
    clientApps.push(app); return client;
  }
  async function account(verified = true) {
    const client = makeClient();
    const result = await createUserWithEmailAndPassword(client.auth, `${randomUUID()}@example.invalid`, randomUUID() + 'Aa1!');
    if (verified) { await adminAuth.updateUser(result.user.uid, { emailVerified: true }); await reload(result.user); await getIdToken(result.user, true); }
    return Object.assign(client, { uid: result.user.uid });
  }
  const a = await account(), b = await account(), c = await account(), unverified = await account(false);
  const anonymous = makeClient();
  let cid = '';
  await t.test('Doğrulanmamış hesap ve anonim kullanıcı davet oluşturamaz', async () => {
    await assert.rejects(unverified.invoke('createInvite'), /doğrula/);
    await assert.rejects(anonymous.invoke('createInvite'), /giriş yap/);
  });
  await t.test('Davet yenilenir, tek kullanımlıdır ve eşzamanlı iki katılımda çift iki kişiyi aşmaz', async () => {
    const old = await a.invoke<{ code: string }>('createInvite');
    const current = await a.invoke<{ code: string }>('createInvite');
    assert.notEqual(old.code, current.code);
    await assert.rejects(c.invoke('joinPair', { code: old.code }), /geçersiz/);
    await b.invoke('joinPair', { code: current.code });
    cid = (await getDoc(doc(a.db, 'users', a.uid))).data()!.couple_id;
    assert.equal((await getDoc(doc(a.db, 'couples', cid))).data()!.members.length, 2);
    await assert.rejects(c.invoke('joinPair', { code: current.code }), /geçersiz/);
    const d = await account(), e = await account(), f = await account();
    const invitation = await d.invoke<{ code: string }>('createInvite');
    const joins = await Promise.allSettled([e.invoke('joinPair', { code: invitation.code }), f.invoke('joinPair', { code: invitation.code })]);
    assert.equal(joins.filter(result => result.status === 'fulfilled').length, 1);
  });
  await t.test('Üyelik ve özel belgeler istemciden keyfi yazılamaz; üçüncü kişi okuyamaz', async () => {
    await assert.rejects(setDoc(doc(c.db, 'users', c.uid), { couple_id: cid }));
    await assert.rejects(setDoc(doc(a.db, 'couples', cid), { members: [a.uid, b.uid, c.uid] }));
    await assert.rejects(getDoc(doc(c.db, 'couples', cid)));
    await assert.rejects(getDocs(collection(c.db, 'couples', cid, 'messages')));
    await assert.rejects(getDoc(doc(anonymous.db, 'couples', cid)));
  });
  const taskId = randomUUID();
  await t.test('Mesaj SDK dinleyicisine gerçek zamanlı ulaşır; tekrar istek aynı mesajı çoğaltmaz', async () => {
    const arrived = new Promise<void>((resolve, reject) => {
      let stop = () => {};
      const timer = setTimeout(() => { stop(); reject(new Error('Dinleyici zaman aşımı')); }, 15000);
      stop = onSnapshot(collection(b.db, 'couples', cid, 'messages'), snapshot => {
        if (snapshot.docs.some(row => row.id === taskId)) { clearTimeout(timer); stop(); resolve(); }
      }, reject);
    });
    await a.invoke('sendMessage', { id: taskId, kind: 'task', body: 'Birlikte bir kahve seç' });
    await a.invoke('sendMessage', { id: taskId, kind: 'task', body: 'Birlikte bir kahve seç' });
    await arrived;
    assert.equal((await getDocs(collection(b.db, 'couples', cid, 'messages'))).size, 1);
    await assert.rejects(c.invoke('completeTask', { id: taskId }));
  });
  const memoryId = randomUUID(), photoPath = `couples/${cid}/${a.uid}/${memoryId}.jpg`;
  const bytes = new Uint8Array([255,216,255,217]);
  await t.test('Fotoğraf özel kalır; üçüncü kişi, anonim ve sahte sahip yüklemesi reddedilir', async () => {
    await a.invoke('uploadMemoryPhoto', { id: memoryId, photo_base64: Buffer.from(bytes).toString('base64') });
    assert.equal((await getBytes(ref(b.storage, photoPath))).byteLength, bytes.length);
    await assert.rejects(getBytes(ref(c.storage, photoPath)));
    await assert.rejects(getBytes(ref(anonymous.storage, photoPath)));
    await assert.rejects(uploadBytes(ref(b.storage, `couples/${cid}/${a.uid}/${randomUUID()}.jpg`), bytes, { contentType: 'image/jpeg', customMetadata: { coupleId: cid, ownerId: a.uid } }));
    await assert.rejects(uploadBytes(ref(a.storage, `couples/${cid}/${a.uid}/${randomUUID()}.jpg`), bytes, { contentType: 'image/jpeg', customMetadata: { coupleId: cid, ownerId: a.uid, firebaseStorageDownloadTokens: 'leak' } }));
  });
  await t.test('Anı ile görev tek işlemde bağlanır; kalıcı indirme tokenı dağıtılmaz', async () => {
    await a.invoke('addMemory', { id: memoryId, note: 'Bir anı', place: 'Kafe', happened_on: '2026-11-03', latitude: 41, longitude: 29, task_id: taskId });
    const task = await getDoc(doc(b.db, 'couples', cid, 'messages', taskId));
    assert.equal(task.data()!.memory_id, memoryId); assert.ok(task.data()!.completed_at);
    assert.equal((await getDoc(doc(b.db, 'couples', cid, 'memories', memoryId))).data()!.photo_path, photoPath);
    assert.equal((await getMetadata(ref(a.storage, photoPath))).customMetadata?.firebaseStorageDownloadTokens, undefined);
    await assert.rejects(b.invoke('deleteMemory', { id: memoryId }), /kendi anını/);
  });
  await t.test('Konum izni, zaman sırası ve paylaşım sürümü sunucuda doğrulanır', async () => {
    const version1 = (await a.invoke<{ version: string }>('setLocationSharing', { enabled: true })).version;
    const fix = { couple_id: cid, version: version1, latitude: 41, longitude: 29, accuracy: 12, captured_at: new Date(Date.now() - 1000).toISOString() };
    assert.equal((await a.invoke<{ accepted: boolean }>('publishLocation', fix)).accepted, true);
    assert.equal((await a.invoke<{ accepted: boolean }>('publishLocation', { ...fix, latitude: 42, captured_at: new Date(Date.now() - 60000).toISOString() })).accepted, false);
    assert.equal((await getDoc(doc(b.db, 'couples', cid, 'locations', a.uid))).data()!.latitude, 41);
    await a.invoke('setLocationSharing', { enabled: false });
    assert.equal((await a.invoke<{ accepted: boolean }>('publishLocation', fix)).accepted, false);
    const stopped = (await getDoc(doc(b.db, 'couples', cid, 'locations', a.uid))).data()!;
    assert.equal(stopped.sharing, false); assert.equal(stopped.latitude, 0);
    const version2 = (await a.invoke<{ version: string }>('setLocationSharing', { enabled: true })).version;
    assert.notEqual(version1, version2);
    assert.equal((await a.invoke<{ accepted: boolean }>('publishLocation', fix)).accepted, false);
    await assert.rejects(getDoc(doc(c.db, 'couples', cid, 'locations', a.uid)));
    await assert.rejects(setDoc(doc(a.db, 'couples', cid, 'locations', a.uid), fix));
  });
  await t.test('Yanlış kod denemeleri başarısız işlemde bile sayılır', async () => {
    const attacker = await account();
    for (let i = 0; i < 5; i++) await assert.rejects(attacker.invoke('joinPair', { code: 'BAD' }), /geçersiz/);
    await assert.rejects(attacker.invoke('joinPair', { code: 'BAD' }), /Çok fazla/);
  });
  await t.test('Bildirim yalnızca kendi çiftindeki partner içeriği için oluşturulur ve özel kalır', async () => {
    const reportId = randomUUID();
    await b.invoke('reportContent', { id: reportId, kind: 'message', content_id: taskId, reason: 'harassment', details: 'Test bildirimi' });
    await b.invoke('reportContent', { id: reportId, kind: 'message', content_id: taskId, reason: 'harassment' });
    assert.equal((await adminDb.doc(`reports/${reportId}`).get()).data()!.status, 'open');
    await assert.rejects(getDoc(doc(a.db, 'reports', reportId)));
    await assert.rejects(setDoc(doc(b.db, 'reports', randomUUID()), { reporter_id: b.uid }));
    await assert.rejects(c.invoke('reportContent', { id: randomUUID(), kind: 'message', content_id: taskId, reason: 'harassment' }));
    await assert.rejects(a.invoke('reportContent', { id: randomUUID(), kind: 'message', content_id: taskId, reason: 'other' }));
  });
  await t.test('Engelleme iki yönlü yeniden eşleşmeyi önler ve paylaşım erişimini kapatır', async () => {
    const d = await account(), e = await account();
    const invite = await d.invoke<{ code: string }>('createInvite');
    await e.invoke('joinPair', { code: invite.code });
    const pairId = (await getDoc(doc(d.db, 'users', d.uid))).data()!.couple_id;
    await d.invoke('blockPartner');
    assert.equal((await getDoc(doc(e.db, 'users', e.uid))).data()!.couple_id, null);
    await assert.rejects(getDoc(doc(e.db, 'couples', pairId)));
    const next = await d.invoke<{ code: string }>('createInvite');
    await assert.rejects(e.invoke('joinPair', { code: next.code }), /kullanılamıyor/);
    await d.invoke('disconnectPair');
    const reverse = await e.invoke<{ code: string }>('createInvite');
    await assert.rejects(d.invoke('joinPair', { code: reverse.code }), /kullanılamıyor/);
  });
  await t.test('Eşleşmeyi bitirmek iki kişinin veri ve fotoğraf erişimini kapatır ve dosyayı temizler', async () => {
    await a.invoke('disconnectPair');
    assert.equal((await getDoc(doc(b.db, 'users', b.uid))).data()!.couple_id, null);
    await assert.rejects(getDoc(doc(b.db, 'couples', cid, 'messages', taskId)));
    await assert.rejects(getBytes(ref(b.storage, photoPath)));
    assert.equal((await adminDb.doc(`couples/${cid}`).get()).exists, false);
  });
  await t.test('E-posta doğrulaması tamamlanmamış hesap da kendini silebilir', async () => {
    const pending = await account(false);
    await pending.invoke('deleteAccount');
    await assert.rejects(adminAuth.getUser(pending.uid));
  });
  await t.test('Hesap silme Auth hesabını ve özel kullanıcı kaydını kaldırır', async () => {
    await c.invoke('deleteAccount');
    await assert.rejects(adminAuth.getUser(c.uid));
    assert.equal((await adminDb.doc(`users/${c.uid}`).get()).exists, false);
  });
  await Promise.all(clientApps.map(app => deleteApp(app)));
  await adminApp.delete();
});

