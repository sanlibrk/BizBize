import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type Transaction, type DocumentSnapshot } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';

initializeApp();
setGlobalOptions({ region: 'europe-west1', maxInstances: 10 });
const db = getFirestore();
const bucket = () => getStorage().bucket();
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const iso = () => new Date().toISOString();
const userRef = (uid: string) => db.doc(`users/${uid}`);
function uidOf(request: CallableRequest, verified = true) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Önce giriş yap.');
  if (verified && request.auth.token.email_verified !== true) throw new HttpsError('permission-denied', 'Önce e-posta adresini doğrula.');
  return request.auth.uid;
}
function text(value: unknown, max: number, label: string) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new HttpsError('invalid-argument', `${label} geçersiz.`);
  return value.trim();
}
function id(value: unknown) {
  if (typeof value !== 'string' || !/^[a-f0-9-]{36}$/.test(value)) throw new HttpsError('invalid-argument', 'Kayıt kimliği geçersiz.');
  return value;
}
async function pairFor(tx: Transaction, uid: string, needTwo = true) {
  const user = await tx.get(userRef(uid));
  const cid = user.data()?.couple_id as string | undefined;
  if (!cid) throw new HttpsError('failed-precondition', 'Önce partnerinle eşleş.');
  const ref = db.doc(`couples/${cid}`);
  const pair = await tx.get(ref);
  const members = pair.data()?.members as string[] | undefined;
  if (pair.data()?.status !== 'active' || !members?.includes(uid) || (needTwo && members.length !== 2)) throw new HttpsError('permission-denied', 'Ortak alan artık kullanılamıyor veya eşleşme tamamlanmadı.');
  return { cid, ref, pair, user, members };
}

export const createInvite = onCall(async request => {
  const uid = uidOf(request), code = randomBytes(6).toString('hex').toUpperCase(), codeHash = hash(code);
  const newPairId = randomUUID(), expires = new Date(Date.now() + 86400000).toISOString();
  return db.runTransaction(async tx => {
    const own = await tx.get(userRef(uid));
    const limitRef = db.doc(`limits/${uid}`), limits = await tx.get(limitRef);
    const recent = (limits.data()?.creates ?? []).filter((v: number) => v > Date.now() - 3600000) as number[];
    if (recent.length >= 10) throw new HttpsError('resource-exhausted', 'Çok fazla kod oluşturdun. Bir saat sonra tekrar dene.');
    const cid: string = own.data()?.couple_id ?? newPairId;
    const pairRef = db.doc(`couples/${cid}`), pair = await tx.get(pairRef);
    if (own.data()?.couple_id && (pair.data()?.status !== 'active' || !pair.data()?.members?.includes(uid))) throw new HttpsError('failed-precondition', 'Mevcut eşleşmeyi önce bitir.');
    if ((pair.data()?.members?.length ?? 0) >= 2) throw new HttpsError('failed-precondition', 'Zaten eşleştin.');
    if (pair.data()?.invite_hash) tx.delete(db.doc(`invites/${pair.data()!.invite_hash}`));
    tx.set(limitRef, { creates: [...recent, Date.now()] }, { merge: true });
    tx.set(pairRef, { members: [uid], status: 'active', invite_hash: codeHash, created_at: pair.data()?.created_at ?? iso() });
    tx.set(userRef(uid), { couple_id: cid, sharing: false, sharing_version: randomUUID() }, { merge: true });
    tx.create(db.doc(`invites/${codeHash}`), { couple_id: cid, owner_id: uid, expires_at: expires, used: false });
    return { code, expires_at: expires };
  });
});

export const joinPair = onCall(async request => {
  const uid = uidOf(request), code = typeof request.data?.code === 'string' ? request.data.code.replace(/[\s-]/g, '').toUpperCase() : '';
  const inviteRef = db.doc(`invites/${hash(code)}`), limitsRef = db.doc(`limits/${uid}`);
  return db.runTransaction(async tx => {
    const [own, invite, limits] = await tx.getAll(userRef(uid), inviteRef, limitsRef);
    const recent = (limits.data()?.joins ?? []).filter((v: number) => v > Date.now() - 900000) as number[];
    if (recent.length >= 5) return { error: 'Çok fazla deneme. 15 dakika sonra tekrar dene.' };
    const cid = invite.data()?.couple_id as string | undefined;
    const pairRef = cid ? db.doc(`couples/${cid}`) : null;
    const pair = pairRef ? await tx.get(pairRef) : null;
    // Failed attempts are committed too. Throwing inside this transaction would roll them back.
    tx.set(limitsRef, { joins: [...recent, Date.now()] }, { merge: true });
    if (!/^[A-F0-9]{12}$/.test(code) || !invite.exists || invite.data()?.used || invite.data()!.expires_at <= iso() || pair?.data()?.status !== 'active' || pair?.data()?.members?.length !== 1) return { error: 'Kod geçersiz, kullanılmış veya süresi dolmuş.' };
    if (invite.data()!.owner_id === uid) return { error: 'Kendi kodunla eşleşemezsin.' };
    if (own.data()?.couple_id) return { error: 'Önce mevcut eşleşmeni veya davetini bitir.' };
    tx.update(pairRef!, { members: [...pair!.data()!.members, uid] });
    tx.update(inviteRef, { used: true });
    tx.set(userRef(uid), { couple_id: cid, sharing: false, sharing_version: randomUUID() }, { merge: true });
    return { couple_id: cid };
  });
});

export const sendMessage = onCall(async request => {
  const uid = uidOf(request), body = text(request.data?.body, 2000, 'Mesaj');
  const kind = request.data?.kind;
  if (kind !== 'text' && kind !== 'task') throw new HttpsError('invalid-argument', 'Mesaj türü geçersiz.');
  const messageId = id(request.data?.id);
  return db.runTransaction(async tx => {
    const pair = await pairFor(tx, uid);
    const ref = pair.ref.collection('messages').doc(messageId), existing = await tx.get(ref);
    if (existing.exists) {
      if (existing.data()?.author_id !== uid) throw new HttpsError('already-exists', 'Kayıt zaten mevcut.');
      return { id: messageId };
    }
    tx.create(ref, { id: messageId, couple_id: pair.cid, author_id: uid, kind, body, completed_at: null, memory_id: null, created_at: iso() });
    return { id: messageId };
  });
});
export const completeTask = onCall(async request => {
  const uid = uidOf(request), taskId = id(request.data?.id);
  await db.runTransaction(async tx => {
    const pair = await pairFor(tx, uid), ref = pair.ref.collection('messages').doc(taskId), task = await tx.get(ref);
    if (!task.exists || task.data()?.kind !== 'task') throw new HttpsError('not-found', 'Görev bulunamadı.');
    tx.update(ref, { completed_at: task.data()?.completed_at ?? iso() });
  });
  return { completed: true };
});

export const uploadMemoryPhoto = onCall({ memory: '512MiB' }, async request => {
  const uid = uidOf(request), memoryId = id(request.data?.id), encoded = request.data?.photo_base64;
  if (typeof encoded !== 'string' || encoded.length > 13981016 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) throw new HttpsError('invalid-argument', 'Fotoğraf verisi geçersiz.');
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.length < 4 || bytes.length > 10485760 || bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255) throw new HttpsError('invalid-argument', '10 MB sınırında geçerli bir JPEG fotoğraf gerekli.');
  const pair = await db.runTransaction(tx => pairFor(tx, uid));
  const path = `couples/${pair.cid}/${uid}/${memoryId}.jpg`;
  await bucket().file(path).save(bytes, { resumable: false, contentType: 'image/jpeg', preconditionOpts: { ifGenerationMatch: 0 }, metadata: { cacheControl: 'private, no-store', metadata: { coupleId: pair.cid, ownerId: uid } } });
  const active = await pair.ref.get();
  if (active.data()?.status !== 'active' || !active.data()?.members?.includes(uid)) {
    await bucket().file(path).delete({ ignoreNotFound: true });
    throw new HttpsError('failed-precondition', 'Eşleşme sona erdi.');
  }
  return { path };
});
export const discardUpload = onCall(async request => {
  const uid = uidOf(request), memoryId = id(request.data?.id);
  const pair = await db.runTransaction(async tx => {
    const pair = await pairFor(tx, uid), memory = await tx.get(pair.ref.collection('memories').doc(memoryId));
    return memory.exists ? null : pair;
  });
  if (pair) await bucket().file(`couples/${pair.cid}/${uid}/${memoryId}.jpg`).delete({ ignoreNotFound: true });
  return { discarded: !!pair };
});

export const addMemory = onCall(async request => {
  const uid = uidOf(request), memoryId = id(request.data?.id), note = text(request.data?.note, 500, 'Not'), place = text(request.data?.place, 120, 'Yer');
  const happened = text(request.data?.happened_on, 10, 'Tarih'), parsed = new Date(happened + 'T12:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(happened) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== happened) throw new HttpsError('invalid-argument', 'Tarih geçersiz.');
  const lat = request.data?.latitude, lng = request.data?.longitude;
  if (typeof lat !== 'number' || !Number.isFinite(lat) || Math.abs(lat) > 90 || typeof lng !== 'number' || !Number.isFinite(lng) || Math.abs(lng) > 180) throw new HttpsError('invalid-argument', 'Konum geçersiz.');
  const user = await userRef(uid).get(), cid = user.data()?.couple_id;
  if (typeof cid !== 'string') throw new HttpsError('failed-precondition', 'Önce eşleş.');
  const path = `couples/${cid}/${uid}/${memoryId}.jpg`, file = bucket().file(path);
  let metadata;
  try { [metadata] = await file.getMetadata(); } catch { throw new HttpsError('failed-precondition', 'Fotoğraf yüklenemedi.'); }
  if (metadata.contentType !== 'image/jpeg' || Number(metadata.size) > 10485760 || metadata.metadata?.ownerId !== uid || metadata.metadata?.coupleId !== cid) throw new HttpsError('invalid-argument', 'Fotoğraf bilgisi geçersiz.');
  // Do not distribute long-lived download-token URLs. The app downloads via authenticated SDK requests.
  await file.setMetadata({ metadata: { firebaseStorageDownloadTokens: null } });
  const taskId = request.data?.task_id ? id(request.data.task_id) : null;
  await db.runTransaction(async tx => {
    const pair = await pairFor(tx, uid);
    if (pair.cid !== cid) throw new HttpsError('failed-precondition', 'Eşleşme değişti.');
    const ref = pair.ref.collection('memories').doc(memoryId), existing = await tx.get(ref);
    const taskRef = taskId ? pair.ref.collection('messages').doc(taskId) : null;
    const task = taskRef ? await tx.get(taskRef) : null;
    if (existing.exists) {
      if (existing.data()?.author_id !== uid) throw new HttpsError('already-exists', 'Anı zaten mevcut.');
      return;
    }
    if (taskRef && (!task?.exists || task.data()?.kind !== 'task' || task.data()?.memory_id)) throw new HttpsError('failed-precondition', 'Görev başka bir anıya bağlı veya mevcut değil.');
    tx.create(ref, { id: memoryId, couple_id: cid, author_id: uid, note, place, happened_on: happened, photo_path: path, latitude: lat, longitude: lng, created_at: iso() });
    if (taskRef) tx.update(taskRef, { completed_at: task!.data()?.completed_at ?? iso(), memory_id: memoryId });
  });
  return { id: memoryId };
});

export const setLocationSharing = onCall(async request => {
  const enabled = request.data?.enabled;
  if (typeof enabled !== 'boolean') throw new HttpsError('invalid-argument', 'Paylaşım durumu geçersiz.');
  const uid = uidOf(request, enabled), version = randomUUID();
  await db.runTransaction(async tx => {
    let user: DocumentSnapshot, cid: string | undefined;
    if (enabled) { const pair = await pairFor(tx, uid); user = pair.user; cid = pair.cid; }
    else { user = await tx.get(userRef(uid)); cid = user.data()?.couple_id; }
    tx.set(userRef(uid), { sharing: enabled, sharing_version: version }, { merge: true });
    if (!enabled && cid) tx.set(db.doc(`couples/${cid}/locations/${uid}`), { user_id: uid, couple_id: cid, latitude: 0, longitude: 0, accuracy: null, sharing: false, captured_at: iso(), updated_at: iso() });
  });
  return { version };
});
export const publishLocation = onCall(async request => {
  const uid = uidOf(request), d = request.data;
  if (typeof d?.latitude !== 'number' || !Number.isFinite(d.latitude) || Math.abs(d.latitude) > 90 || typeof d?.longitude !== 'number' || !Number.isFinite(d.longitude) || Math.abs(d.longitude) > 180 || (d.accuracy !== null && (typeof d.accuracy !== 'number' || !Number.isFinite(d.accuracy) || d.accuracy < 0))) throw new HttpsError('invalid-argument', 'Konum ölçümü geçersiz.');
  const captured = Date.parse(d.captured_at);
  if (!Number.isFinite(captured) || captured > Date.now() + 30000) throw new HttpsError('invalid-argument', 'Cihaz saatini kontrol et.');
  return db.runTransaction(async tx => {
    const user = await tx.get(userRef(uid));
    if (!user.data()?.sharing || user.data()?.sharing_version !== d.version || user.data()?.couple_id !== d.couple_id) return { accepted: false };
    const pairRef = db.doc(`couples/${d.couple_id}`), pair = await tx.get(pairRef);
    if (pair.data()?.status !== 'active' || !pair.data()?.members?.includes(uid) || pair.data()?.members?.length !== 2) return { accepted: false };
    const ref = pairRef.collection('locations').doc(uid), old = await tx.get(ref);
    if (old.data()?.sharing && Date.parse(old.data()!.captured_at) > captured) return { accepted: false };
    tx.set(ref, { user_id: uid, couple_id: d.couple_id, latitude: d.latitude, longitude: d.longitude, accuracy: d.accuracy, sharing: true, captured_at: new Date(captured).toISOString(), updated_at: iso() });
    return { accepted: true };
  });
});

async function closePair(uid: string) {
  await db.runTransaction(async tx => {
    const own = await tx.get(userRef(uid)), cid = own.data()?.couple_id;
    if (!cid) return;
    const ref = db.doc(`couples/${cid}`), pair = await tx.get(ref), members: string[] = pair.data()?.members ?? [];
    if (!members.includes(uid)) throw new HttpsError('permission-denied', 'Ortak alan bulunamadı.');
    tx.update(ref, { status: 'deleting' });
    tx.set(db.doc(`cleanupJobs/${cid}`), { couple_id: cid, members, requested_by: uid, created_at: iso() });
    if (pair.data()?.invite_hash) tx.delete(db.doc(`invites/${pair.data()!.invite_hash}`));
    for (const member of members) tx.set(userRef(member), { couple_id: null, sharing: false, sharing_version: randomUUID() }, { merge: true });
  });
}
async function cleanupFor(uid: string) {
  const jobs = await db.collection('cleanupJobs').where('members','array-contains',uid).get();
  for (const job of jobs.docs) {
    const cid = job.data().couple_id;
    await bucket().deleteFiles({ prefix: `couples/${cid}/` });
    await db.recursiveDelete(db.doc(`couples/${cid}`));
    await job.ref.delete();
  }
}
export const disconnectPair = onCall(async request => {
  const uid = uidOf(request);
  await closePair(uid);
  try { await cleanupFor(uid); } catch { throw new HttpsError('unavailable', 'Ortak erişim kapandı. Dosya temizliği tamamlanamadı; işlemi tekrar dene.'); }
  return { disconnected: true };
});
export const deleteAccount = onCall(async request => {
  const uid = uidOf(request, false);
  await closePair(uid);
  try {
    await cleanupFor(uid);
    await userRef(uid).delete();
    await db.doc(`limits/${uid}`).delete();
    await getAuth().deleteUser(uid);
  } catch { throw new HttpsError('unavailable', 'Hesap silme tamamlanamadı. Tekrar dene.'); }
  return { deleted: true };
});
export const deleteMemory = onCall(async request => {
  const uid = uidOf(request), memoryId = id(request.data?.id);
  const path = await db.runTransaction(async tx => {
    const pair = await pairFor(tx, uid), ref = pair.ref.collection('memories').doc(memoryId), memory = await tx.get(ref);
    if (!memory.exists) return null;
    if (memory.data()?.author_id !== uid) throw new HttpsError('permission-denied', 'Yalnızca kendi anını silebilirsin.');
    const tasks = await tx.get(pair.ref.collection('messages').where('memory_id','==',memoryId));
    tx.delete(ref);
    for (const task of tasks.docs) tx.update(task.ref, { memory_id: null });
    return memory.data()!.photo_path as string;
  });
  if (path) await bucket().file(path).delete({ ignoreNotFound: true });
  return { deleted: true };
});
