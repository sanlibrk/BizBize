import React, { useState } from 'react';
import { ScrollView, View, Linking } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { Body, Button, CloseRow, Field, Heading } from '../components/ui';
import { useApp } from '../store';
import { call, clearPhotoCache } from '../lib/api';
import { haltLocalTracking } from '../lib/location';
import { SUPPORT_EMAIL } from '../content/policies';
const reasons = [['harassment', 'Taciz veya tehdit'], ['inappropriate', 'Uygunsuz içerik'], ['privacy', 'Gizlilik ihlali'], ['other', 'Diğer']] as const;
export default function Report() {
  const app = useApp(), router = useRouter();
  const params = useLocalSearchParams<{ kind?: string; id?: string }>();
  const kind = params.kind === 'message' || params.kind === 'memory' ? params.kind : 'partner';
  const [reason, setReason] = useState('harassment'), [details, setDetails] = useState('');
  const [reportId] = useState(() => Crypto.randomUUID());
  const [busy, setBusy] = useState(false), [sent, setSent] = useState(false), [blocking, setBlocking] = useState(false), [note, setNote] = useState('');
  if (!app.ready) return null;
  if (!app.preview && !app.session) return <Redirect href="/" />;
  const run = async (work: () => Promise<void>) => { setBusy(true); setNote(''); try { await work(); } catch (e) { setNote(e instanceof Error ? e.message : 'İşlem tamamlanamadı.'); } finally { setBusy(false); } };
  return <ScrollView contentContainerStyle={{ padding: 24, gap: 18 }} keyboardShouldPersistTaps="handled">
    <CloseRow title="Güvenlik ve destek" close={busy ? () => {} : () => router.back()} />
    <Heading size={25}>Bildirim gönder</Heading>
    <Body>Bildirim, seçtiğin gerekçe ve açıklama ile ilgili hesap bilgilerini özel inceleme kuyruğuna iletir. Bir mesaj veya anı bildiriminde ilgili metin de eklenir; fotoğraf ve konum kopyalanmaz.</Body>
    {app.preview && <Body>Yerel önizlemede gerçek bildirim veya engelleme yapılmaz.</Body>}
    {reasons.map(([value, label]) => <Button key={value} title={`${reason === value ? '✓ ' : ''}${label}`} secondary disabled={busy || sent} onPress={() => setReason(value)} />)}
    <Field label="Ek açıklama (isteğe bağlı)" value={details} onChangeText={setDetails} multiline maxLength={1000} editable={!busy && !sent} />
    <Button title={sent ? 'Bildirim alındı' : 'Bildirimi gönder'} disabled={app.preview || sent || !app.coupleId} busy={busy} onPress={() => void run(async () => { await call('reportContent', { id: reportId, kind, content_id: params.id, reason, details }); setSent(true); setNote('Bildirim özel inceleme kuyruğuna kaydedildi. Acil destek için aşağıdaki e-posta adresini kullanabilirsin.'); })} />
    <Heading size={25}>Partneri engelle</Heading>
    <Body>Engellemek ortak alana erişimi iki kişi için de kapatır, ortak içerikleri silme sürecini başlatır ve aynı hesapla yeniden eşleşmeyi önler. Geri alınamaz. Bildirim göndermek engellemeden ayrı bir işlemdir.</Body>
    <Button title="Partneri engelle" secondary disabled={app.preview || busy || !app.coupleId} onPress={() => setBlocking(true)} />
    {blocking && <View style={{ gap: 10 }}><Body>Ortak erişimi kapatıp partnerini engellemek istediğinden emin misin?</Body><Button title="Evet, engelle ve ortak alanı kapat" busy={busy} onPress={() => void run(async () => { await haltLocalTracking().catch(() => {}); await call('blockPartner'); clearPhotoCache(); await app.refresh(); router.replace('/'); })} /><Button title="Vazgeç" secondary disabled={busy} onPress={() => setBlocking(false)} /></View>}
    <Body>{SUPPORT_EMAIL}</Body><Button title="Destek e-postası oluştur" secondary onPress={() => void run(async () => { await Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Biz%20Bize%20Destek`); })} />
    {!!note && <Body>{note}</Body>}
  </ScrollView>;
}
