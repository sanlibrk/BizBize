import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Body, Button, Heading, Logo } from '../components/ui';
import { authMessage, refreshVerification, resendVerification } from '../lib/auth';
import { useApp } from '../store';
export default function VerifyEmail() {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const app = useApp(); const [busy, setBusy] = useState(false); const [note, setNote] = useState('');
  const run = async (action: () => Promise<void>) => { setBusy(true); setNote(''); try { await action(); } catch (error) { setNote(authMessage(error)); } finally { setBusy(false); } };
  return <ScrollView contentContainerStyle={{ padding: 28, gap: 24 }}><Logo /><Heading>E-postanı doğrula.</Heading><Body>{app.session?.user.email} adresine gelen Firebase doğrulama bağlantısını tarayıcıda aç. Sonra buradaki düğmeyle devam et.</Body><Button title="E-postamı doğruladım" busy={busy} onPress={() => void run(refreshVerification)} /><Button title="Doğrulama e-postasını yeniden gönder" secondary busy={busy} onPress={() => void run(async () => { await resendVerification(); setNote('Yeni doğrulama bağlantısı gönderildi.'); })} /><Body>{note}</Body><Button title="Gizlilik politikası" secondary onPress={() => router.push('/legal')} /><Button title="Çıkış yap" secondary busy={busy} onPress={() => void run(app.exit)} /><Button title="Hesabımı sil" secondary disabled={busy} onPress={() => setDeleting(true)} />{deleting && <View style={{ gap: 12 }}><Body>Doğrulanmamış hesabın kalıcı olarak silinsin mi? Bu işlem geri alınamaz.</Body><Button title="Evet, hesabımı sil" busy={busy} onPress={() => void run(app.deleteAccount)} /><Button title="Vazgeç" secondary disabled={busy} onPress={() => setDeleting(false)} /></View>}</ScrollView>;
}

