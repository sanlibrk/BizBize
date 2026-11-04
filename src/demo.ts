import type { SharedData } from './types';
export const DEMO_USER = 'preview-you';
export const DEMO_COUPLE = 'preview-couple';
export function makeDemo(empty = false): SharedData {
  const members = [
    { user_id: DEMO_USER, couple_id: DEMO_COUPLE, slot: 1 },
    { user_id: 'preview-partner', couple_id: DEMO_COUPLE, slot: 2 },
  ];
  if (empty) return { members, memories: [], messages: [], locations: [] };
  // Fixed, explicitly simulated positions. They never receive a fresh live timestamp.
  return { members, memories: [
    { id: 'demo-1', couple_id: DEMO_COUPLE, author_id: DEMO_USER, note: 'Günün en güzel molası. Bir kahve, uzun bir sohbet.', place: 'Karaköy', happened_on: '2026-10-18', latitude: 41.0255, longitude: 28.9776, photo_path: '', photo_url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=900&q=85', created_at: '2026-10-18T12:00:00Z' },
    { id: 'demo-2', couple_id: DEMO_COUPLE, author_id: 'preview-partner', note: 'Biraz yürüdük, biraz da zamanı unuttuk.', place: 'Galata', happened_on: '2026-10-12', latitude: 41.0257, longitude: 28.9741, photo_path: '', photo_url: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=900&q=85', created_at: '2026-10-12T15:00:00Z' },
    { id: 'demo-3', couple_id: DEMO_COUPLE, author_id: DEMO_USER, note: 'Aynı manzaraya bir kez daha hayran kaldık.', place: 'Moda sahili', happened_on: '2026-10-05', latitude: 40.9815, longitude: 29.0258, photo_path: '', photo_url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=900&q=85', created_at: '2026-10-05T16:00:00Z' },
  ], messages: [
    { id: 'demo-msg-1', couple_id: DEMO_COUPLE, author_id: 'preview-partner', kind: 'text', body: 'Bugün birlikte küçük bir mola verelim mi? ☕', completed_at: null, memory_id: null, created_at: '2026-10-18T09:30:00Z' },
    { id: 'demo-msg-2', couple_id: DEMO_COUPLE, author_id: DEMO_USER, kind: 'text', body: 'Olur, yeni bir anı daha biriktirelim.', completed_at: null, memory_id: null, created_at: '2026-10-18T09:32:00Z' },
    { id: 'demo-task-1', couple_id: DEMO_COUPLE, author_id: 'preview-partner', kind: 'task', body: 'Bir sonraki kahve yerimizi sen seç', completed_at: null, memory_id: null, created_at: '2026-10-18T09:33:00Z' },
  ], locations: [
    { user_id: DEMO_USER, couple_id: DEMO_COUPLE, latitude: 41.0287, longitude: 28.9816, accuracy: 20, captured_at: '2026-10-18T10:00:00Z', updated_at: '2026-10-18T10:00:00Z', sharing: true },
    { user_id: 'preview-partner', couple_id: DEMO_COUPLE, latitude: 41.019, longitude: 28.9703, accuracy: 25, captured_at: '2026-10-18T09:50:00Z', updated_at: '2026-10-18T09:50:00Z', sharing: true },
  ] };
}
