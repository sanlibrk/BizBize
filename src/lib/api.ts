import { decode,encode } from 'base64-arraybuffer';
import * as Crypto from 'expo-crypto';
import { AppState } from 'react-native';
import { request } from './backend';
import { photoMaxBytes,sharedSyncIntervalMs } from './deployment';
import type { MemoryDraft,SharedData } from '../types';
export async function call<T=unknown>(name:string,args:Record<string,unknown>={}):Promise<T>{return request<T>('/v1/actions/'+encodeURIComponent(name),args);}
const photos=new Map<string,Promise<string>>();
export function clearPhotoCache(){photos.clear();}
export async function loadShared(_uid:string):Promise<SharedData>{
 const data=await request<SharedData>('/v1/shared');
 const keep=new Set(data.memories.map(m=>m.id));for(const id of photos.keys())if(!keep.has(id))photos.delete(id);
 // Bound parallel image downloads; keep real photos only in memory.
 const memories=[...data.memories];let cursor=0;
 await Promise.all(Array.from({length:Math.min(4,memories.length)},async()=>{while(cursor<memories.length){const i=cursor++,m=memories[i];if(!photos.has(m.id)){photos.set(m.id,request<{base64:string}>('/v1/photos/'+m.id).then(r=>'data:image/jpeg;base64,'+r.base64).catch(e=>{photos.delete(m.id);throw e;}));}memories[i]={...m,photo_url:await photos.get(m.id)};}}));
 return {...data,memories};
}
export function watchShared(uid:string,onData:(data:SharedData)=>void,onStatus:(status:string)=>void){
 let stopped=false,busy=false;
 const refresh=async()=>{if(stopped||busy||AppState.currentState==='background')return;busy=true;try{const data=await loadShared(uid);if(!stopped){onData(data);onStatus('Sunucuyla eşitlendi');}}catch{if(!stopped)onStatus('Bağlantı yok · son veriler');}finally{busy=false;}};
 void refresh();const timer=setInterval(()=>void refresh(),sharedSyncIntervalMs),listener=AppState.addEventListener('change',state=>{if(state==='active')void refresh();});
 return ()=>{stopped=true;clearInterval(timer);listener.remove();clearPhotoCache();};
}
export async function saveMemory(draft:MemoryDraft,_coupleId:string,_uid:string,taskId?:string){
 const id=Crypto.randomUUID(),bytes=draft.base64?decode(draft.base64):await(await fetch(draft.uri)).arrayBuffer();if(bytes.byteLength>photoMaxBytes)throw new Error(`Fotoğraf ${photoMaxBytes/(1024*1024)} MB sınırından büyük.`);
 await call('uploadMemoryPhoto',{id,photo_base64:draft.base64||encode(bytes)});
 try{return await call<{id:string;pending:boolean}>('addMemory',{id,note:draft.note.trim(),place:draft.place.trim(),happened_on:draft.happened_on,latitude:draft.latitude,longitude:draft.longitude,task_id:taskId??null});}
 catch(e){await call('discardUpload',{id}).catch(()=>{});throw e;}
}
