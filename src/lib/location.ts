import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { call } from './api';

export const LOCATION_TASK = 'yanyana-location-v1';
const CONTEXT_KEY = 'yanyana.location.context';
type Context = { userId: string; coupleId: string; version?: string };
let foreground: Location.LocationSubscription | null = null;
let generation = 0;
let onFix: (() => void) | undefined;

async function publish(fix: Location.LocationObject, expectedGeneration?: number) {
  const raw = await AsyncStorage.getItem(CONTEXT_KEY);
  if (!raw || (expectedGeneration !== undefined && expectedGeneration !== generation)) return;
  const context: Context = JSON.parse(raw);
  // Server consent and its generation reject callbacks from a previous sharing session.
  await call('publishLocation', {
    latitude: fix.coords.latitude, longitude: fix.coords.longitude, accuracy: fix.coords.accuracy,
    captured_at: new Date(fix.timestamp).toISOString(), couple_id: context.coupleId, version: context.version,
  });
  onFix?.();
}
if (Platform.OS !== 'web' && !TaskManager.isTaskDefined(LOCATION_TASK)) {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
    if (error || !data?.locations.length) return;
    try { await publish(data.locations[data.locations.length - 1]); }
    catch { /* No fake freshness: the last successful timestamp remains visible. */ }
  });
}
export async function startSharing(context: Context, refresh: () => void, background: boolean) {
  // Switching to foreground-only must stop a previously enabled background task.
  if (!background && Platform.OS !== 'web' && await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') throw new Error('Konum izni verilmedi. Paylaşım kapalı. İzni cihaz ayarlarından değiştirebilirsin.');
  // Obtain a real fix before changing server consent.
  const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const consent = await call<{ version: string }>('setLocationSharing', { enabled: true });
  onFix = refresh;
  const currentGeneration = ++generation;
  foreground?.remove();
  foreground = null;
  try {
    await AsyncStorage.setItem(CONTEXT_KEY, JSON.stringify({ ...context, version: consent.version }));
    await publish(fix, currentGeneration);
    foreground = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, distanceInterval: 15, timeInterval: 15000 },
      position => { void publish(position, currentGeneration).catch(() => refresh()); });
  } catch (error) { await stopSharing(); throw error; }
  if (!background || Platform.OS === 'web') return 'Uygulama açıkken paylaşım etkin.';
  if (!(await TaskManager.isAvailableAsync())) return 'Ön planda paylaşım açık. Arka plan için Expo Go yerine geliştirme derlemesi kur.';
  const permissionBg = await Location.requestBackgroundPermissionsAsync();
  if (permissionBg.status !== 'granted') return 'Ön planda paylaşım açık. Arka plan izni verilmedi; iOS Ayarlar > Konum > Her Zaman seçebilirsin.';
  try { await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced, distanceInterval: 20, deferredUpdatesInterval: 30000,
    pausesUpdatesAutomatically: false, showsBackgroundLocationIndicator: true,
    activityType: Location.ActivityType.Other,
    foregroundService: { notificationTitle: 'Biz Bize · Konum paylaşımı', notificationBody: 'Konumun yalnızca eşleştiğin kişiyle paylaşılıyor.', notificationColor: '#AE596C' },
  }); } catch { return 'Ön planda paylaşım açık. Arka plan başlatılamadı; geliştirme derlemesini ve Her Zaman iznini kontrol et.'; }
  return 'Arka plan paylaşımı etkin. Güncelleme sıklığını iOS, pil ve bağlantı koşulları belirler.';
}
export async function stopSharing() {
  let localFailed = false;
  try { await haltLocalTracking(); } catch { localFailed = true; }
  try { await call('setLocationSharing', { enabled: false }); }
  catch { throw new Error('Sunucuda paylaşımın kapatıldığı doğrulanamadı. İnternete bağlanıp tekrar dene; cihaz konum iznini de kapatabilirsin.'); }
  if (localFailed) throw new Error('Sunucuda paylaşım kapatıldı. Cihaz konum servisi durdurulamadı; konum iznini cihaz ayarlarından kapat.');
}
export async function haltLocalTracking() {
  ++generation;
  foreground?.remove(); foreground = null; onFix = undefined;
  await AsyncStorage.removeItem(CONTEXT_KEY);
  if (Platform.OS !== 'web' && await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
}
export async function resumeSharing(context: Context, refresh: () => void) {
  const stored = await AsyncStorage.getItem(CONTEXT_KEY);
  if (!stored) return;
  const previous = JSON.parse(stored) as Context;
  if (previous.userId !== context.userId || previous.coupleId !== context.coupleId || !previous.version) {
    await AsyncStorage.removeItem(CONTEXT_KEY); return;
  }
  const permission = await Location.getForegroundPermissionsAsync();
  if (permission.status !== 'granted') { await stopSharing(); return; }
  // Resume only existing consent, without presenting new permission prompts.
  onFix = refresh;
  const currentGeneration = ++generation;
  foreground?.remove();
  foreground = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, distanceInterval: 15, timeInterval: 15000 },
    fix => { void publish(fix, currentGeneration).catch(() => refresh()); });
}

