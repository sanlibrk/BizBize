import { collection, doc, getDocFromServer, getDocsFromServer, limit, onSnapshot, orderBy, query, type DocumentData } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getBytes, ref } from 'firebase/storage';
import { decode, encode } from 'base64-arraybuffer';
import * as Crypto from 'expo-crypto';
import { services } from './firebase';
import { EMPTY_DATA, type Memory, type MemoryDraft, type SharedData } from '../types';

export async function call<T = unknown>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const result = await httpsCallable<Record<string, unknown>, T & { error?: string }>(services().functions, name)(args);
  if (result.data?.error) throw new Error(result.data.error);
  return result.data;
}
const photoCache = new Map<string, Promise<string>>();
export function clearPhotoCache() { photoCache.clear(); }
async function withPhotos(rows: Memory[]) {
  const keep = new Set(rows.map(row => row.photo_path));
  for (const key of photoCache.keys()) if (!keep.has(key)) photoCache.delete(key);
  return Promise.all(rows.map(async memory => {
    if (!photoCache.has(memory.photo_path)) {
      const request = getBytes(ref(services().storage, memory.photo_path), 10485760)
        .then(bytes => `data:image/jpeg;base64,${encode(bytes)}`)
        .catch(error => { photoCache.delete(memory.photo_path); throw error; });
      photoCache.set(memory.photo_path, request);
    }
    return { ...memory, photo_url: await photoCache.get(memory.photo_path) };
  }));
}
function members(cid: string, pair: DocumentData) {
  return (pair.members as string[]).map((uid, i) => ({ user_id: uid, couple_id: cid, slot: i + 1 }));
}
export async function loadShared(uid: string): Promise<SharedData> {
  const db = services().firestore;
  const user = await getDocFromServer(doc(db, 'users', uid)), cid = user.data()?.couple_id;
  if (!cid) return { ...EMPTY_DATA };
  const base = doc(db, 'couples', cid), pair = await getDocFromServer(base);
  if (pair.data()?.status !== 'active') return { ...EMPTY_DATA };
  const [photos, messages, locations] = await Promise.all([
    getDocsFromServer(query(collection(base, 'memories'), orderBy('happened_on', 'desc'), orderBy('created_at', 'desc'), limit(200))),
    getDocsFromServer(query(collection(base, 'messages'), orderBy('created_at', 'desc'), limit(200))),
    getDocsFromServer(collection(base, 'locations')),
  ]);
  return { members: members(cid, pair.data()!), memories: await withPhotos(photos.docs.map(d => d.data() as Memory)),
    messages: messages.docs.map(d => d.data() as SharedData['messages'][number]).reverse(), locations: locations.docs.map(d => d.data() as SharedData['locations'][number]) };
}
export function watchShared(uid: string, onData: (data: SharedData) => void, onStatus: (status: string) => void) {
  const db = services().firestore;
  let current: SharedData = { ...EMPTY_DATA }, activeCid: string | null = null, generation = 0, memoryVersion = 0;
  let stops: (() => void)[] = [];
  const reset = () => { generation++; memoryVersion++; stops.forEach(stop => stop()); stops = []; clearPhotoCache(); current = { ...EMPTY_DATA }; onData(current); };
  const failed = () => onStatus('Firebase bağlantısı yok · son veriler');
  const update = (part: Partial<SharedData>) => { current = { ...current, ...part }; onData(current); };
  const stopUser = onSnapshot(doc(db, 'users', uid), { includeMetadataChanges: true }, snapshot => {
    onStatus(snapshot.metadata.fromCache ? 'Firebase · bağlantı kontrol ediliyor' : 'Firebase ile eşitlendi');
    const cid = snapshot.data()?.couple_id ?? null;
    if (cid === activeCid) return;
    reset(); activeCid = cid;
    if (!cid) return;
    const run = generation, base = doc(db, 'couples', cid);
    stops.push(onSnapshot(base, pair => {
      if (run !== generation) return;
      if (pair.data()?.status !== 'active') { update({ ...EMPTY_DATA }); return; }
      update({ members: members(cid, pair.data()!) });
    }, failed));
    stops.push(onSnapshot(query(collection(base, 'memories'), orderBy('happened_on', 'desc'), orderBy('created_at', 'desc'), limit(200)), photos => {
      const version = ++memoryVersion;
      void withPhotos(photos.docs.map(d => d.data() as Memory)).then(memories => { if (run === generation && version === memoryVersion) update({ memories }); }).catch(failed);
    }, failed));
    stops.push(onSnapshot(query(collection(base, 'messages'), orderBy('created_at', 'desc'), limit(200)), messages => {
      if (run === generation) update({ messages: messages.docs.map(d => d.data() as SharedData['messages'][number]).reverse() });
    }, failed));
    stops.push(onSnapshot(collection(base, 'locations'), locations => {
      if (run === generation) update({ locations: locations.docs.map(d => d.data() as SharedData['locations'][number]) });
    }, failed));
  }, failed);
  return () => { stopUser(); reset(); };
}
export async function saveMemory(draft: MemoryDraft, coupleId: string, uid: string, taskId?: string) {
  const id = Crypto.randomUUID(), path = `couples/${coupleId}/${uid}/${id}.jpg`;
  const bytes = draft.base64 ? decode(draft.base64) : await (await fetch(draft.uri)).arrayBuffer();
  if (bytes.byteLength > 10485760) throw new Error('Fotoğraf 10 MB sınırından büyük.');
  await call('uploadMemoryPhoto', { id, photo_base64: draft.base64 || encode(bytes) });
  try {
    await call('addMemory', { id, note: draft.note.trim(), place: draft.place.trim(), happened_on: draft.happened_on,
      latitude: draft.latitude, longitude: draft.longitude, task_id: taskId ?? null });
  } catch (error) { await call('discardUpload', { id }).catch(() => {}); throw error; }
}
