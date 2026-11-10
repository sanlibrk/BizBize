import React,{useState} from 'react';
import {ScrollView} from 'react-native';
import {Redirect,useLocalSearchParams,useRouter} from 'expo-router';
import {Body,Button,CloseRow,Field} from '../components/ui';
import {authMessage,changePassword} from '../lib/auth';
import {useApp} from '../store';
export default function PasswordRoute(){
 const app=useApp(),router=useRouter(),{email}=useLocalSearchParams<{email?:string}>();
 const [password,setPassword]=useState(''),[current,setCurrent]=useState(''),[code,setCode]=useState(''),[note,setNote]=useState(''),[busy,setBusy]=useState(false);
 if(!app.ready)return null;if(!app.session&&!email)return <Redirect href="/"/>;
 return <ScrollView contentContainerStyle={{padding:26,gap:20}} keyboardShouldPersistTaps="handled"><CloseRow title="Yeni şifreni belirle" close={()=>router.replace('/')}/>{email?<><Body>Bu adrese bağlı hesap varsa yenileme kodu e-posta kuyruğuna alındı. E-postadaki altı haneli kodu gir.</Body><Field label="Yenileme kodu" value={code} onChangeText={v=>setCode(v.replace(/\D/g,''))} maxLength={6} keyboardType="number-pad"/></>:<Field label="Mevcut şifren" value={current} onChangeText={setCurrent} secureTextEntry/>}<Field label="Yeni şifre" value={password} onChangeText={setPassword} secureTextEntry placeholder="En az 10 karakter"/><Body>{note}</Body><Button title="Şifreyi kaydet" busy={busy} disabled={password.length<10||(!!email&&code.length!==6)} onPress={()=>{setBusy(true);void changePassword(password,email?code:undefined,email,current).then(()=>router.replace('/')).catch(e=>setNote(authMessage(e))).finally(()=>setBusy(false));}}/></ScrollView>;
}
