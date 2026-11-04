import type { Coordinate, LiveLocation, Memory } from './types';

export const STALE_AFTER_MS = 2 * 60 * 1000;
export function locationState(location: LiveLocation | undefined, now = Date.now()) {
  if (!location?.sharing) return 'off' as const;
  const age = now - Date.parse(location.captured_at);
  if (!Number.isFinite(age) || age < -30000 || age > STALE_AFTER_MS) return 'stale' as const;
  return 'recent' as const;
}
export function relativeTime(iso: string, now = Date.now()) {
  const seconds = Math.max(0, Math.floor((now - Date.parse(iso)) / 1000));
  if (!Number.isFinite(seconds)) return 'Zaman bilinmiyor';
  if (seconds < 60) return 'Az önce';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} dk önce`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} sa önce`;
  return `${Math.floor(seconds / 86400)} gün önce`;
}
export function dateLabel(date: string) {
  return new Date(date.slice(0, 10) + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}
export function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function validateDraft(draft: { note: string; place: string; happened_on: string; uri: string } & Coordinate) {
  if (!draft.uri) return 'Bir fotoğraf seç.';
  if (!draft.note.trim() || draft.note.trim().length > 500) return '1–500 karakterlik bir not ekle.';
  if (!draft.place.trim() || draft.place.length > 120) return 'Bir yer adı ekle (en fazla 120 karakter).';
  const parsedDate = new Date(draft.happened_on + 'T12:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.happened_on) || !Number.isFinite(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== draft.happened_on) return 'Tarihi YYYY-AA-GG biçiminde gir.';
  if (!Number.isFinite(draft.latitude) || draft.latitude < -90 || draft.latitude > 90 ||
      !Number.isFinite(draft.longitude) || draft.longitude < -180 || draft.longitude > 180) return 'Haritadan geçerli bir yer seç.';
  return null;
}
export type MemoryCluster = Coordinate & { id: string; memories: Memory[] };
// Screen-sized geographical cells; points become photo markers as the map zooms in.
export function clusterMemories(memories: Memory[], latitudeDelta: number): MemoryCluster[] {
  if (latitudeDelta < 0.035) return memories.map(m => ({ id: m.id, latitude: m.latitude, longitude: m.longitude, memories: [m] }));
  const cell = Math.max(latitudeDelta / 5, 0.004);
  const cells = new Map<string, Memory[]>();
  for (const memory of memories) {
    const key = `${Math.floor(memory.latitude / cell)}:${Math.floor(memory.longitude / cell)}`;
    cells.set(key, [...(cells.get(key) ?? []), memory]);
  }
  return [...cells].map(([id, group]) => ({ id,
    latitude: group.reduce((s, m) => s + m.latitude, 0) / group.length,
    longitude: group.reduce((s, m) => s + m.longitude, 0) / group.length, memories: group }));
}
