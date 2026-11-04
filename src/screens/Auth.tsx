import React, { useState } from 'react';
import { View, Text, Image, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { ArrowRight, MapPin, Heart, LockKeyhole, ArrowLeft } from 'lucide-react-native';
import { C, Heading, Body, Button, Field, Logo, Eyebrow } from '../components/ui';
import { useApp } from '../store';
import { isConfigured } from '../lib/firebase';
import { authMessage, signUp, signIn, sendReset } from '../lib/auth';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function Auth() {
  const app = useApp();
  const params = useLocalSearchParams<{ mode?: 'welcome' | 'signup' | 'login' | 'reset' }>();
  const router = useRouter();
  const mode = params.mode ?? 'welcome';
  const setMode = (next: 'welcome' | 'signup' | 'login' | 'reset') => router.setParams({ mode: next });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const submit = async () => {
    setBusy(true); setNotice('');
    try {
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error('Geçerli bir e-posta adresi gir.');
      if (mode === 'reset') {
        await sendReset(email.trim());
        setNotice('Bu adrese bağlı bir hesap varsa şifre yenileme bağlantısı gönderildi. E-postadaki bağlantıyı tarayıcıda tamamla, sonra giriş yap.');
      } else {
        if (password.length < 8) throw new Error('Şifren en az 8 karakter olmalı.');
        if (mode === 'signup') await signUp(email.trim(), password);
        else await signIn(email.trim(), password);
      }
    } catch (e) { setNotice(authMessage(e)); }
    finally { setBusy(false); }
  };
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}><ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
    <View style={s.brand}><Logo /><View style={s.pill}><Text style={s.pillText}>SADECE İKİNİZE</Text></View></View>
    {mode === 'welcome' ? <>
      <View style={s.hero}>
        <Svg width="100%" height="100%" viewBox="0 0 380 320" style={StyleSheet.absoluteFill}>
          <Path d="M-10 65 Q80 105 110 0 M-10 240 Q100 110 185 130 T400 70 M80 340 Q150 200 400 220" stroke="#DFDACF" strokeWidth="26" fill="none" />
          <Path d="M-10 65 Q80 105 110 0 M-10 240 Q100 110 185 130 T400 70 M80 340 Q150 200 400 220" stroke="#FCF9F2" strokeWidth="18" fill="none" />
          <Path d="M260 -10 Q185 80 255 130 T270 330" stroke="#CEE0DC" strokeWidth="67" fill="none" />
          <Path d="M95 206 Q160 90 252 145" stroke="#C98B9B" strokeWidth="2" strokeDasharray="5 6" fill="none" />
          <Circle cx="95" cy="206" r="16" fill="#AE596C" stroke="#FFFCF7" strokeWidth="5" />
          <Circle cx="252" cy="145" r="16" fill="#527A72" stroke="#FFFCF7" strokeWidth="5" />
        </Svg>
        <View style={s.photoCard}><Image source={{ uri: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=600&q=80' }} style={s.heroPhoto} /><Text style={s.photoNote}>Birlikte biriktirdikleriniz.</Text></View>
        <View style={s.heart}><Heart color={C.pink} size={26} strokeWidth={1.5} /></View>
        <View style={s.mapTag}><MapPin size={13} color={C.green} /><Text style={{ color: C.green, fontSize: 10 }}>İkinizin küçük dünyası</Text></View>
      </View>
      <View style={{ gap: 14 }}><Eyebrow>HER GÜN, BİRAZ DAHA YAKIN</Eyebrow><Heading size={40}>Aynı hikâyenin{ '\n' }iki güzel yanı.</Heading><Body muted>Anılarınız bir haritada, sohbetiniz hep yanınızda. Mesafeler değişse de birbirinize yakın kalın.</Body></View>
      <View style={{ gap: 11, marginTop: 25 }}><Button title="Birlikte başlayalım" icon={ArrowRight} onPress={() => { setMode('signup'); setNotice(''); }} /><Button title="Zaten hesabım var" secondary onPress={() => { setMode('login'); setNotice(''); }} /></View>
      <Pressable accessibilityRole="button" onPress={() => void app.openPreview().catch(() => app.setError('Önizleme açılamadı.'))} style={s.preview}><Text style={s.previewText}>Örnek dünyayı keşfet <Text style={{ color: C.pink }}>↗</Text></Text><Text style={{ color: C.muted, fontSize: 10 }}>Hesapsız, açıkça işaretlenmiş yerel önizleme</Text></Pressable>
    </> : <>
      <Pressable accessibilityRole="button" accessibilityLabel="Geri" onPress={() => setMode('welcome')} style={{ marginTop: 24, alignSelf: 'flex-start' }}><ArrowLeft color={C.ink} size={22} /></Pressable>
      <View style={{ gap: 14, marginTop: 32, marginBottom: 28 }}><Eyebrow>İKİNİZE AİT BİR ALAN</Eyebrow><Heading size={35}>{mode === 'signup' ? 'Güzel şeyler\nburada başlasın.' : mode === 'reset' ? 'Yeniden merhaba.' : 'Hoş geldin.'}</Heading><Body muted>{mode === 'signup' ? 'Hesabını oluştur, sonra davet kodunla partnerinle eşleş.' : mode === 'reset' ? 'Şifreni yenilemek için e-posta adresini gir.' : 'Ortak dünyanıza kaldığınız yerden devam edin.'}</Body></View>
      <View style={{ gap: 18 }}><Field label="E-posta" value={email} onChangeText={setEmail} placeholder="sen@ornek.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        {mode !== 'reset' && <Field label="Şifre" value={password} onChangeText={setPassword} placeholder="En az 8 karakter" secureTextEntry autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />}
        {!!notice && <Body style={{ color: C.pink }}>{notice}</Body>}
        {!isConfigured && <View style={s.info}><Body muted>Canlı hesap bağlantısı henüz kurulmadı. Uygulamayı aşağıdaki yerel önizlemeyle deneyebilirsin.</Body></View>}
        <Button title={mode === 'signup' ? 'Hesap oluştur' : mode === 'reset' ? 'Yenileme bağlantısı gönder' : 'Giriş yap'} busy={busy} onPress={() => void submit()} />
        {mode === 'login' && <Pressable accessibilityRole="button" onPress={() => { setMode('reset'); setNotice(''); }}><Text style={s.previewText}>Şifremi unuttum</Text></Pressable>}
        <Pressable accessibilityRole="button" onPress={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setNotice(''); }}><Text style={s.previewText}>{mode === 'signup' ? 'Hesabın var mı? Giriş yap' : 'Yeni misin? Hesap oluştur'}</Text></Pressable>
        {!isConfigured && <Button title="Yerel önizlemeyi aç" secondary onPress={() => void app.openPreview()} />}
      </View>
    </>}
    <View style={s.privacy}><LockKeyhole size={12} color={C.muted} /><Text style={{ color: C.muted, fontSize: 10 }}>İki kişilik alan. Konum paylaşımı senin kontrolünde.</Text></View>
  </ScrollView></KeyboardAvoidingView>;
}
const s = StyleSheet.create({ page: { padding: 27, flexGrow: 1, backgroundColor: C.cream }, brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, pill: { backgroundColor: C.pale, borderRadius: 20, padding: 8 }, pillText: { color: C.pink, fontSize: 8, letterSpacing: 1.2, fontWeight: '600' }, hero: { height: 277, marginVertical: 20, backgroundColor: '#EDECE2', borderRadius: 30, overflow: 'hidden' }, photoCard: { position: 'absolute', top: 22, left: 27, padding: 7, paddingBottom: 13, backgroundColor: '#FFFEFB', borderRadius: 5, transform: [{ rotate: '-8deg' }], boxShadow: '0 8px 25px #51403920' }, heroPhoto: { width: 142, height: 130, borderRadius: 2 }, photoNote: { fontFamily: 'Georgia', fontStyle: 'italic', fontSize: 10, color: C.ink, textAlign: 'center', marginTop: 10 }, heart: { position: 'absolute', right: 43, top: 102, backgroundColor: '#FFFEFB', padding: 13, borderRadius: 50, transform: [{ rotate: '10deg' }] }, mapTag: { position: 'absolute', bottom: 24, right: 20, flexDirection: 'row', gap: 5, backgroundColor: '#FFFEFBEF', padding: 10, borderRadius: 20 }, preview: { alignItems: 'center', gap: 6, paddingTop: 21 }, previewText: { fontSize: 12, color: C.ink, textAlign: 'center' }, privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 29 }, info: { backgroundColor: C.pale, borderRadius: 14, padding: 14 } });
