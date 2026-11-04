import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Copy, HeartHandshake, Link, LogOut } from 'lucide-react-native';
import { Button, C, Field, Heading, Body, Eyebrow, Logo } from '../components/ui';
import { call } from '../lib/api';
import { useApp } from '../store';

export default function Pairing() {
  const app = useApp();
  const [code, setCode] = useState('');
  const [invite, setInvite] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [deleting, setDeleting] = useState(false);
  const run = async (work: () => Promise<void>) => { setBusy(true); setNote(''); try { await work(); } catch (e) { setNote(e instanceof Error ? e.message : 'İşlem tamamlanamadı.'); } finally { setBusy(false); } };
  return <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 28, gap: 24 }} keyboardShouldPersistTaps="handled"><Logo />
    <View style={{ backgroundColor: C.pale, alignSelf: 'center', padding: 28, borderRadius: 60, marginTop: 28 }}><HeartHandshake size={42} strokeWidth={1.2} color={C.pink} /></View>
    <Eyebrow>İKİ KİŞİ, BİR DÜNYA</Eyebrow><Heading size={36}>Birbirinizi bulun.</Heading><Body muted>Biriniz davet kodu oluştursun, diğeriniz kodu girsin. Ortak alanınız yalnızca ikinize açılır.</Body>
    <Button title={invite ? 'Yeni kod oluştur' : 'Davet kodu oluştur'} busy={busy} icon={Link} onPress={() => void run(async () => { const result = await call<{ code: string }>('createInvite'); setInvite(result.code); await app.refresh(); })} />
    {!!invite && <View style={{ padding: 20, borderWidth: 1, borderColor: C.line, borderRadius: 20, backgroundColor: C.white, gap: 14 }}><Text selectable style={{ textAlign: 'center', color: C.pink, fontSize: 26, letterSpacing: 3, fontWeight: '600' }}>{invite.slice(0,6)} {invite.slice(6)}</Text><Body muted>24 saat geçerli. Yalnızca partnerinle paylaş. Yeni kod oluşturmak eski kodu iptal eder.</Body><Button title="Kodu kopyala" secondary icon={Copy} onPress={() => void run(async () => { await Clipboard.setStringAsync(invite); setNote('Kod kopyalandı. Partnerinin hesabında bu kodu girin.'); })} /></View>}
    {!app.coupleId ? <><View style={{ height: 1, backgroundColor: C.line }} /><Field label="Partnerinin davet kodu" placeholder="12 karakterlik kod" autoCapitalize="characters" value={code} onChangeText={setCode} maxLength={15} /><Button title="Eşleş ve devam et" secondary busy={busy} disabled={code.replace(/[\s-]/g,'').length!==12} onPress={() => void run(async () => { await call('joinPair', { code }); await app.refresh(); })} /></>
      : <><Body muted>Partnerinin katılmasını bekliyoruz. Katıldığında ortak haritanız açılır.</Body><Button title="Davetimi iptal et" secondary onPress={() => void run(async () => { await app.disconnect(); setInvite(''); })} /></>}
    {!!note && <Body style={{ color: C.pink }}>{note}</Body>}<Body muted style={{ fontSize: 11 }}>{app.sync}</Body><Button title="Çıkış yap" icon={LogOut} secondary onPress={() => void run(app.exit)} />
    <Button title="Hesabımı sil" secondary disabled={busy} onPress={() => setDeleting(true)} />
    {deleting && <View style={{ gap: 12 }}><Body>Hesabın ve varsa ortak alanınız kalıcı olarak silinsin mi? Bu işlem geri alınamaz.</Body><Button title="Evet, hesabımı sil" busy={busy} onPress={() => void run(app.deleteAccount)} /><Button title="Vazgeç" secondary onPress={() => setDeleting(false)} /></View>}
  </ScrollView>;
}
