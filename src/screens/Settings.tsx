import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, View, Text } from 'react-native';
import { MapPin, ShieldCheck, LogOut, Radio, Trash2, Unlink, Check } from 'lucide-react-native';
import { useApp } from '../store';
import { startSharing, stopSharing } from '../lib/location';
import { Body, Button, C, CloseRow, Heading, Field } from '../components/ui';
import { locationState, relativeTime } from '../domain';

export default function Settings({ close }: { close: () => void }) {
  const app = useApp();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState<'disconnect' | 'delete' | null>(null);
  const own = app.data.locations.find(l => l.user_id === app.userId);
  const run = async (work: () => Promise<void>) => { setBusy(true); setNote(''); try { await work(); } catch (e) { setNote(e instanceof Error ? e.message : 'İşlem tamamlanamadı.'); } finally { setBusy(false); } };
  const start = async (background: boolean) => {
    if (!app.coupleId) return;
    const result = await startSharing({ userId: app.userId, coupleId: app.coupleId }, () => void app.refresh(), background);
    setNote(result); await app.refresh();
  };
  return <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}><CloseRow title="Sana ait kontroller" close={busy ? () => {} : close} />
    {app.preview && <View style={card}><Body style={{ color: C.pink }}>Yerel önizleme</Body><Body muted>Buradaki kişiler ve konumlar örnektir. Konum izni istenmez, bir partnere veri gönderilmez.</Body></View>}
    <View style={card}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><Radio size={20} color={C.green} /><Heading size={23}>Konum paylaşımı</Heading></View>
      <Body>{app.preview ? 'Örnek konumlar · canlı değil' : locationState(own) === 'off' ? 'Paylaşımın kapalı' : locationState(own) === 'stale' ? 'Konumun eski · bağlantını kontrol et' : 'Son konumun partnerinle paylaşılıyor'}</Body>
      {own?.sharing && !app.preview && <Body muted>Son ölçüm: {relativeTime(own.captured_at)}. Doğruluk: {own.accuracy ? `yaklaşık ${Math.round(own.accuracy)} m` : 'bilinmiyor'}.</Body>}
      <Body muted>Yalnızca eşleştiğin kişi konumunu görür. Paylaşımı istediğin an durdurabilirsin. Canlı konum geçmişi tutulmaz; son ölçüm saklanır.</Body>
      <Button title="Uygulama açıkken paylaş" icon={MapPin} busy={busy} disabled={app.preview} onPress={() => void run(() => start(false))} />
      <Button title="Arka planda da paylaş" icon={Radio} secondary busy={busy} disabled={app.preview} onPress={() => void run(() => start(true))} />
      <Button title="Konum paylaşımını durdur" secondary busy={busy} disabled={app.preview} onPress={() => void run(async () => { await stopSharing(); await app.refresh(); setNote('Konum paylaşımın durduruldu.'); })} />
      <Body muted style={{ fontSize: 11 }}>iOS arka plan paylaşımı için geliştirme derlemesi ve “Her Zaman” izni gerekir. Güncellemeler kesintisiz takip garantisi vermez. Uygulama zorla kapatılırsa güncellemeler durabilir. Eski ölçümler haritada soluk görünür.</Body>
    </View>
    <View style={card}><View style={{ flexDirection: 'row', gap: 9, alignItems: 'center' }}><ShieldCheck color={C.pink} size={20} /><Heading size={23}>İkinizin özel alanı</Heading></View><Body muted>Fotoğraflar, mesajlar ve konumlar sunucuda çift üyeliğine göre korunur. Mesajlar uçtan uca şifreli değildir; hizmet altyapısında işlenir. Eşleşmeyi bitirmek ortak alana erişimi iki kişi için de sonlandırır.</Body><Body muted style={{ fontSize: 11 }}>Davet kodunu yalnızca partnerinle paylaş. Fotoğraflar oturumunla indirilir; herkese açık kalıcı bağlantı oluşturulmaz. İndirilmiş kopyalar geri alınamaz.</Body></View>
    <View style={card}><Heading size={23}>Gizlilik ve destek</Heading><Button title="Gizlilik politikası" secondary onPress={() => router.push('/legal')} /><Button title="Kullanım koşulları" secondary onPress={() => router.push({ pathname: '/legal', params: { page: 'terms' } })} /><Button title="İçerik bildir / partneri engelle" secondary onPress={() => router.push('/report')} /></View>
    <View style={{ gap: 10 }}><Body muted>{app.preview ? 'Hesap kullanılmıyor' : app.session?.user.email}</Body><Button title={app.preview ? 'Önizlemeden çık' : 'Çıkış yap'} secondary icon={LogOut} busy={busy} onPress={() => void run(async () => { await app.exit(); close(); })} />
      {app.preview && <Button title="Boş başlangıcı dene" secondary onPress={() => void run(async () => { await app.openPreview(true); close(); })} />}
      <Button title="Eşleşmeyi bitir" secondary icon={Unlink} disabled={busy} onPress={() => setConfirm('disconnect')} /><Button title={app.preview ? 'Yerel önizleme verisini sil' : 'Hesabımı sil'} secondary icon={Trash2} disabled={busy} onPress={() => setConfirm('delete')} />
    </View>
    {confirm && <View style={[card, { borderColor: C.pink }]}><Heading size={22}>{confirm === 'delete' ? 'Hesabın silinsin mi?' : 'Eşleşme bitsin mi?'}</Heading><Body>{app.preview ? 'Önizlemede oluşturduğun içerikler silinir.' : confirm === 'delete' ? 'Hesabın, ortak fotoğraflarınız, mesajlarınız ve konum verileriniz kalıcı olarak silinir. Partnerin de ortak alanı kaybeder. Bu işlem geri alınamaz.' : 'İkinizin ortak anı ve mesaj kayıtları silinir, konum paylaşımı kapanır. Fotoğraflara erişim kaldırılır; depodaki dosyalar sunucu temizliğinde silinir. Bu işlem geri alınamaz.'}</Body>{confirm === 'delete' && !app.preview && <Field label="Mevcut şifren" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />}<Button title="Evet, devam et" icon={Check} busy={busy} onPress={() => void run(async () => { if (confirm === 'delete') await app.deleteAccount(password); else await app.disconnect(); close(); })} /><Button title="Vazgeç" secondary disabled={busy} onPress={() => setConfirm(null)} /></View>}
    {!!note && <Body style={{ color: C.pink }}>{note}</Body>}
    <Text style={{ color: C.muted, fontSize: 10, textAlign: 'center' }}>Biz Bize · Kendi sunucumuz · 0.2.0{ '\n' }{app.sync}</Text>
  </ScrollView>;
}
const card = { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 21, padding: 19, gap: 13 } as const;

