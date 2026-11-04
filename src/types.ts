export type Coordinate = { latitude: number; longitude: number };
export type Memory = Coordinate & {
  id: string; couple_id: string; author_id: string; note: string; place: string;
  happened_on: string; photo_path: string; photo_url?: string; created_at: string;
};
export type Message = {
  id: string; couple_id: string; author_id: string; kind: 'text' | 'task';
  body: string; completed_at: string | null; memory_id: string | null; created_at: string;
};
export type LiveLocation = Coordinate & {
  user_id: string; couple_id: string; accuracy: number | null;
  captured_at: string; updated_at: string; sharing: boolean;
};
export type Member = { user_id: string; couple_id: string; slot: number };
export type SharedData = { members: Member[]; memories: Memory[]; messages: Message[]; locations: LiveLocation[] };
export type MemoryDraft = Coordinate & {
  note: string; place: string; happened_on: string; uri: string; base64?: string; mimeType?: string;
};
export const EMPTY_DATA: SharedData = { members: [], memories: [], messages: [], locations: [] };
