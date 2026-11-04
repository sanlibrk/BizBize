import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { onIdTokenChanged } from 'firebase/auth';
import { firebase } from './lib/firebase';
import { signOutAccount } from './lib/auth';
import { loadShared, call, saveMemory, watchShared, clearPhotoCache } from './lib/api';
import { haltLocalTracking, resumeSharing, stopSharing } from './lib/location';
import { makeDemo, DEMO_USER, DEMO_COUPLE } from './demo';
import { EMPTY_DATA, type MemoryDraft, type SharedData } from './types';

const DEMO_KEY = 'yanyana.preview.v1';
type Session = { user: { id: string; email: string | null; emailVerified: boolean } };
type Store = {
  ready: boolean; session: Session | null; preview: boolean; data: SharedData; userId: string;
  coupleId?: string; sync: string; error: string; setError: (s: string) => void;
  openPreview: (empty?: boolean) => Promise<void>; exit: () => Promise<void>;
  refresh: () => Promise<void>; send: (body: string, task: boolean) => Promise<void>;
  complete: (id: string) => Promise<void>; addMemory: (draft: MemoryDraft, taskId?: string) => Promise<void>;
  removeMemory: (id: string) => Promise<void>; disconnect: () => Promise<void>; deleteAccount: () => Promise<void>;
};
const Context = createContext<Store | null>(null);
export function Provider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!firebase);
  const [session, setSession] = useState<Session | null>(null);
  const [preview, setPreview] = useState(false);
  const [data, setData] = useState<SharedData>(EMPTY_DATA);
  const [sync, setSync] = useState('Bağlanıyor');
  const [error, setError] = useState('');
  const epoch = useRef(0);
  const busyRefresh = useRef(false);
  const queuedRefresh = useRef(false);
  const previousCouple = useRef<string | undefined>(undefined);
  const currentUser = useRef<string | undefined>(undefined);
  const userId = preview ? DEMO_USER : session?.user.id ?? '';
  const coupleId = data.members.find(m => m.user_id === userId)?.couple_id;
  useEffect(() => {
    if (!firebase) return;
    return onIdTokenChanged(firebase.auth, user => {
      if (user?.uid !== currentUser.current) { epoch.current++; clearPhotoCache(); setData(EMPTY_DATA); }
      currentUser.current = user?.uid;
      setSession(user ? { user: { id: user.uid, email: user.email, emailVerified: user.emailVerified } } : null); setReady(true);
    }, () => { setError('Firebase oturumu yüklenemedi.'); setReady(true); });
  }, []);
  const refresh = useCallback(async () => {
    if (preview || !session?.user.emailVerified) return;
    if (busyRefresh.current) { queuedRefresh.current = true; return; }
    busyRefresh.current = true;
    const requestEpoch = epoch.current;
    try {
      do {
        queuedRefresh.current = false;
        try {
          const next = await loadShared(session.user.id);
          if (requestEpoch === epoch.current) { setData(next); setSync('Eşitlendi'); }
        } catch { if (requestEpoch === epoch.current) setSync('Bağlantı yok · son veriler'); }
      } while (queuedRefresh.current && requestEpoch === epoch.current);
    } finally { busyRefresh.current = false; }
  }, [preview, session]);
  useEffect(() => {
    if (preview || !session?.user.emailVerified) return;
    return watchShared(session.user.id, setData, setSync);
  }, [preview, session]);
  useEffect(() => {
    if (preview || !session || !coupleId) return;
    void resumeSharing({ userId: session.user.id, coupleId }, () => void refresh()).catch(() => setError('Konum yeniden başlatılamadı. Paylaşım ayarını kontrol et.'));
  }, [preview, session, coupleId, refresh]);
  useEffect(() => {
    if (previousCouple.current && !coupleId && !preview) void haltLocalTracking().catch(() => setError('Cihaz konum servisi durdurulamadı. Konum iznini cihaz ayarlarından kapatabilirsin.'));
    previousCouple.current = coupleId;
  }, [coupleId, preview]);
  // Never cache real messages, photo URLs or coordinates in the preview store.
  useEffect(() => { if (preview) void AsyncStorage.setItem(DEMO_KEY, JSON.stringify(data)).catch(() => setError('Yerel önizleme deposu doldu. Son değişiklikler bu oturumda duruyor; yeniden açılışta kaybolabilir.')); }, [data, preview]);
  const openPreview = async (empty = false) => {
    epoch.current++;
    const saved = empty ? null : await AsyncStorage.getItem(DEMO_KEY);
    let initial = makeDemo(empty);
    if (saved) { try { initial = JSON.parse(saved); } catch {} }
    setData(initial); setPreview(true); setSync('Yerel önizleme'); setError('');
  };
  const exit = async () => {
    if (!preview) {
      if (session?.user.emailVerified) await stopSharing();
      else await haltLocalTracking();
      await signOutAccount(); clearPhotoCache();
    }
    epoch.current++; setPreview(false); setData(EMPTY_DATA); setError('');
  };
  const send = async (body: string, task: boolean) => {
    const text = body.trim();
    if (!text || text.length > 2000 || !coupleId) throw new Error('1–2000 karakterlik bir mesaj yaz.');
    if (preview) setData(d => ({ ...d, messages: [...d.messages, { id: Crypto.randomUUID(), couple_id: DEMO_COUPLE,
      author_id: DEMO_USER, kind: task ? 'task' : 'text', body: text, completed_at: null, memory_id: null, created_at: new Date().toISOString() }] }));
    else {
      await call('sendMessage', { id: Crypto.randomUUID(), kind: task ? 'task' : 'text', body: text });
      await refresh();
    }
  };
  const complete = async (id: string) => {
    if (preview) setData(d => ({ ...d, messages: d.messages.map(m => m.id === id ? { ...m, completed_at: new Date().toISOString() } : m) }));
    else { await call('completeTask', { id }); await refresh(); }
  };
  const addMemory = async (draft: MemoryDraft, taskId?: string) => {
    if (!coupleId) throw new Error('Önce partnerinle eşleş.');
    if (preview) {
      const id = Crypto.randomUUID();
      setData(d => ({ ...d, memories: [{ id, couple_id: coupleId, author_id: userId, note: draft.note.trim(), place: draft.place.trim(),
        happened_on: draft.happened_on, latitude: draft.latitude, longitude: draft.longitude,
        photo_path: '', photo_url: draft.base64 ? `data:${draft.mimeType || 'image/jpeg'};base64,${draft.base64}` : draft.uri, created_at: new Date().toISOString() }, ...d.memories].sort((a,b) => b.happened_on.localeCompare(a.happened_on)),
        messages: d.messages.map(m => m.id === taskId ? { ...m, completed_at: new Date().toISOString(), memory_id: id } : m) }));
    } else { await saveMemory(draft, coupleId, userId, taskId); await refresh(); }
  };
  const removeMemory = async (id: string) => {
    if (preview) setData(d => ({ ...d, memories: d.memories.filter(m => m.id !== id), messages: d.messages.map(m => m.memory_id === id ? { ...m, memory_id: null } : m) }));
    else {
      await call('deleteMemory', { id });
      await refresh();
    }
  };
  const disconnect = async () => {
    if (preview) { setData(makeDemo(true)); return; }
    await stopSharing(); await call('disconnectPair'); clearPhotoCache(); await refresh();
  };
  const deleteAccount = async () => {
    if (preview) { await AsyncStorage.removeItem(DEMO_KEY); await exit(); return; }
    await stopSharing();
    await call('deleteAccount');
    await signOutAccount(); clearPhotoCache(); epoch.current++; setSession(null); setData(EMPTY_DATA);
  };
  return <Context.Provider value={{ ready, session, preview, data, userId, coupleId, sync, error, setError, openPreview, exit, refresh, send, complete, addMemory, removeMemory, disconnect, deleteAccount }}>{children}</Context.Provider>;
}
export function useApp() { const value = useContext(Context); if (!value) throw new Error('Provider missing'); return value; }
