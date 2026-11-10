import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
export type Session = {user:{id:string;email:string;emailVerified:boolean}};
const base=(process.env.EXPO_PUBLIC_API_URL||'').trim().replace(/\/+$/,'');
export const isConfigured=!!base;
export const backendMode=isConfigured?'server':'preview';
const KEY='bizbize.api.session.v1';
let session:Session|null=null;
const listeners=new Set<(value:Session|null)=>void>();
export function subscribeSession(listener:(value:Session|null)=>void){listeners.add(listener);return ()=>{listeners.delete(listener);};}
export function setSession(value:Session|null){session=value;for(const listener of listeners)listener(value);}
export async function forgetSession(){if(Platform.OS!=='web')await SecureStore.deleteItemAsync(KEY);setSession(null);}
export async function acceptSession(value:Session&{token?:string}){
 if(Platform.OS!=='web'){if(!value.token)throw new Error('Sunucu oturum anahtarı döndürmedi.');await SecureStore.setItemAsync(KEY,value.token,{keychainAccessible:SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY});}
 setSession({user:value.user});
}
export async function request<T>(path:string,body?:Record<string,unknown>,options:{anonymous?:boolean;signal?:AbortSignal}={}):Promise<T>{
 if(!base)throw new Error('Sunucu adresi yapılandırılmadı. Yerel önizlemeyi açabilirsin.');
 const url=new URL(base);
 if(url.protocol!=='https:'&&process.env.NODE_ENV==='production'&&!['localhost','127.0.0.1','10.0.2.2'].includes(url.hostname))throw new Error('Yayın sürümünde HTTPS sunucu adresi gerekli.');
 const headers:Record<string,string>={'Content-Type':'application/json','X-BizBize-Client':Platform.OS==='web'?'web':'native'};
 if(Platform.OS!=='web'&&!options.anonymous){const token=await SecureStore.getItemAsync(KEY);if(token)headers.Authorization=`Bearer ${token}`;}
 let response:Response;
 let result:{error?:{message?:string}}|null;
 const timeout=new AbortController(),timer=setTimeout(()=>timeout.abort(),20000);
 const aborted=()=>timeout.abort();options.signal?.addEventListener('abort',aborted,{once:true});
 try{response=await fetch(base+path,{method:body===undefined?'GET':'POST',credentials:'include',headers,body:body===undefined?undefined:JSON.stringify(body),signal:timeout.signal});result=await response.json();}
 catch{throw new Error('Sunucuya ulaşılamadı. İnternetini ve sunucu bağlantısını kontrol et.');}
 finally{clearTimeout(timer);options.signal?.removeEventListener('abort',aborted);}
 if(!response.ok){if(response.status===401&&!options.anonymous)await forgetSession();throw new Error(result?.error?.message||'Sunucu işlemi tamamlanamadı.');}
 return result as T;
}
export async function initializeSession(){if(!isConfigured){setSession(null);return;}try{const value=await request<Session>('/v1/auth/me');setSession(value);}catch(error){if(session)throw error;setSession(null);}}
export async function refreshSession(){const value=await request<Session>('/v1/auth/me');setSession(value);return value;}
