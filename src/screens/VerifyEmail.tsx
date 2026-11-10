import React,{useState} from 'react';
import {ScrollView,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Body,Button,Field,Heading,Logo} from '../components/ui';
import {authMessage,refreshVerification,resendVerification} from '../lib/auth';
import {useApp} from '../store';
export default function VerifyEmail(){
 const app=useApp(),router=useRouter();const [code,setCode]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[note,setNote]=useState(''),[deleting,setDeleting]=useState(false);
 const run=async(action:()=>Promise<void>)=>{setBusy(true);setNote('');try{await action();}catch(e){setNote(authMessage(e));}finally{setBusy(false);}};
 return <ScrollView contentContainerStyle={{padding:28,gap:20}} keyboardShouldPersistTaps="handled"><Logo/><Heading>E-postanı doğrula.</Heading><Body>{app.session?.user.email} adresine gönderilen altı haneli kodu gir. Kod 15 dakika geçerli. Yerel geliştirmede e-postayı yerel posta kutusundan açabilirsin.</Body><Field label="Doğrulama kodu" value={code} onChangeText={value=>setCode(value.replace(/\D/g,''))} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code"/><Button title="E-postamı doğrula" busy={busy} disabled={code.length!==6} onPress={()=>void run(()=>refreshVerification(code))}/><Button title="Yeni kod gönder" secondary busy={busy} onPress={()=>void run(async()=>{await resendVerification();setNote('Yeni kod e-posta gönderim kuyruğuna alındı. Önceki kod geçersizdir.');})}/><Body>{note}</Body><Button title="Gizlilik politikası" secondary onPress={()=>router.push('/legal')}/><Button title="Çıkış yap" secondary busy={busy} onPress={()=>void run(app.exit)}/><Button title="Hesabımı sil" secondary disabled={busy} onPress={()=>setDeleting(true)}/>{deleting&&<View style={{gap:12}}><Body>Hesabın kalıcı olarak silinsin mi?</Body><Field label="Mevcut şifren" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password"/><Button title="Evet, hesabımı sil" busy={busy} disabled={!password} onPress={()=>void run(()=>app.deleteAccount(password))}/><Button title="Vazgeç" secondary onPress={()=>setDeleting(false)}/></View>}</ScrollView>;
}
