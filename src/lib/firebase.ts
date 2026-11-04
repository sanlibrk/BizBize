import { getApp, getApps, initializeApp } from 'firebase/app';
import { browserLocalPersistence, connectAuthEmulator, getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const emulators = process.env.EXPO_PUBLIC_FIREBASE_USE_EMULATORS === '1';
const publicConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
const cloudConfigured = Object.values(publicConfig).every(value => !!value && !value.startsWith('YOUR_'));
export const backendMode = emulators ? 'emulator' : cloudConfigured ? 'cloud' : 'preview';
export const isConfigured = backendMode !== 'preview';
const config = emulators ? {
  apiKey: 'demo-key-not-a-secret', authDomain: 'demo-yanyana.firebaseapp.com', projectId: 'demo-yanyana',
  storageBucket: 'demo-yanyana.appspot.com', appId: 'demo-yanyana',
} : publicConfig;

// Firebase persistence keys contain punctuation disallowed by SecureStore; encode it bijectively.
const keyFor = (key: string) => 'firebase.' + key.replace(/[^A-Za-z0-9.-]/g, c => `_${c.charCodeAt(0).toString(16)}_`);
const secureStorage = {
  async getItem(raw: string) {
    const key = keyFor(raw), count = Number(await SecureStore.getItemAsync(key + '.count'));
    if (!count || count > 64) return null;
    const parts = await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`)));
    return parts.some(part => part === null) ? null : parts.join('');
  },
  async setItem(raw: string, value: string) {
    const key = keyFor(raw), old = Number(await SecureStore.getItemAsync(key + '.count')) || 0;
    const parts = value.match(/.{1,1800}/gs) ?? [];
    for (let i = 0; i < parts.length; i++) await SecureStore.setItemAsync(`${key}.${i}`, parts[i], { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
    await SecureStore.setItemAsync(key + '.count', String(parts.length));
    for (let i = parts.length; i < old; i++) await SecureStore.deleteItemAsync(`${key}.${i}`);
  },
  async removeItem(raw: string) {
    const key = keyFor(raw), count = Number(await SecureStore.getItemAsync(key + '.count')) || 0;
    await SecureStore.deleteItemAsync(key + '.count');
    for (let i = 0; i < count; i++) await SecureStore.deleteItemAsync(`${key}.${i}`);
  },
};
function initialize() {
  if (!isConfigured) return null;
  // Keep singleton connections across Fast Refresh; emulator wiring must precede every SDK request.
  if (getApps().length) {
    const app = getApp();
    return { app, auth: getAuth(app), firestore: initializeFirestore(app, { experimentalAutoDetectLongPolling: true }), storage: getStorage(app), functions: getFunctions(app, 'europe-west1') };
  }
  const app = initializeApp(config);
  const auth = initializeAuth(app, { persistence: Platform.OS === 'web' ? browserLocalPersistence : getReactNativePersistence(secureStorage) });
  const firestore = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  const storage = getStorage(app), functions = getFunctions(app, 'europe-west1');
  if (emulators) {
    const host = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST || '127.0.0.1';
    if (!['127.0.0.1', 'localhost', '10.0.2.2'].includes(host)) throw new Error('Emülatör bağlantısı yalnızca yerel adreslerle kullanılabilir.');
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(firestore, host, 8085);
    connectStorageEmulator(storage, host, 9199);
    connectFunctionsEmulator(functions, host, 5001);
  }
  return { app, auth, firestore, storage, functions };
}
export const firebase = initialize();
export function services() {
  if (!firebase) throw new Error('Firebase bağlantısı henüz yapılandırılmadı. Yerel önizlemeyi kullanabilirsin.');
  return firebase;
}
