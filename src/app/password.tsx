import React,{useEffect,useState} from 'react';
import {AppState,ScrollView} from 'react-native';
import {Redirect,useLocalSearchParams,useRouter} from 'expo-router';
import {Body,Button,CloseRow,Field} from '../components/ui';
import {authMessage,changePassword} from '../lib/auth';
import {useApp} from '../store';
import {request} from '../lib/backend';
import {isServerlessDeployment} from '../lib/deployment';
export default function PasswordRoute(){
 const app=useApp(),router=useRouter(),{email}=useLocalSearchParams<{email?:string}>();
 const [password,setPassword]=useState(''),[current,setCurrent]=useState(''),[code,setCode]=useState(''),[note,setNote]=useState(''),[busy,setBusy]=useState(false);
 const [saved,setSaved]=useState(false),[deliveryNote,setDeliveryNote]=useState('');
 useEffect(()=>{
  if(!isServerlessDeployment||!app.ready||!email||busy||saved)return;
  let stopped=false,inFlight=false,currentRequest:AbortController|undefined;
  const retryDelivery=async()=>{
   if(stopped||inFlight||AppState.currentState==='background'||AppState.currentState==='inactive')return;
   inFlight=true;const controller=new AbortController();currentRequest=controller;
   try{await request('/v1/auth/mail-delivery',{}, {anonymous:true,signal:controller.signal});if(!stopped)setDeliveryNote('');}
   catch{if(!stopped&&!controller.signal.aborted)setDeliveryNote('E-posta gönderimini kontrol etmek için sunucuya ulaşılamadı. Bağlantı sağlandığında yeniden denenecek.');}
   finally{inFlight=false;if(currentRequest===controller)currentRequest=undefined;}
  };
  void retryDelivery();const timer=setInterval(()=>void retryDelivery(),10000);
  const listener=AppState.addEventListener('change',state=>{if(state==='active')void retryDelivery();else currentRequest?.abort();});
  return()=>{stopped=true;clearInterval(timer);listener.remove();currentRequest?.abort();};
 },[app.ready,email,busy,saved]);
 if(!app.ready)return null;if(!app.session&&!email)return <Redirect href="/"/>;
 return <ScrollView contentContainerStyle={{padding:26,gap:20}} keyboardShouldPersistTaps="handled"><CloseRow title="Yeni şifreni belirle" close={()=>router.replace('/')}/>{email?<><Body>Bu adrese bağlı hesap varsa yenileme kodu e-posta kuyruğuna alındı. E-postadaki altı haneli kodu gir.</Body><Field label="Yenileme kodu" value={code} onChangeText={v=>setCode(v.replace(/\D/g,''))} maxLength={6} keyboardType="number-pad"/></>:<Field label="Mevcut şifren" value={current} onChangeText={setCurrent} secureTextEntry/>}<Field label="Yeni şifre" value={password} onChangeText={setPassword} secureTextEntry placeholder="En az 10 karakter"/>{!!deliveryNote&&<Body>{deliveryNote}</Body>}<Body>{note}</Body><Button title="Şifreyi kaydet" busy={busy} disabled={saved||password.length<10||(!!email&&code.length!==6)} onPress={()=>{setBusy(true);void changePassword(password,email?code:undefined,email,current).then(()=>{setSaved(true);router.replace('/');}).catch(e=>setNote(authMessage(e))).finally(()=>setBusy(false));}}/></ScrollView>;
}
