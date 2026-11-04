import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { Body, Button, Heading, Logo } from '../components/ui';
import { authMessage, refreshVerification, resendVerification } from '../lib/auth';
import { useApp } from '../store';
export default function VerifyEmail() {
  const app = useApp(); const [busy, setBusy] = useState(false); const [note, setNote] = useState('');
  const run = async (action: () => Promise<void>) => { setBusy(true); setNote(''); try { await action(); } catch (error) { setNote(authMessage(error)); } finally { setBusy(false); } };
  return <ScrollView contentContainerStyle={{ padding: 28, gap: 24 }}><Logo /><Heading>E-postanı doğrula.</Heading><Body>{app.session?.user.email} adresine gelen Firebase doğrulama bağlantısını tarayıcıda aç. Sonra buradaki düğmeyle devam et.</Body><Button title="E-postamı doğruladım" busy={busy} onPress={() => void run(refreshVerification)} /><Button title="Doğrulama e-postasını yeniden gönder" secondary busy={busy} onPress={() => void run(async () => { await resendVerification(); setNote('Yeni doğrulama bağlantısı gönderildi.'); })} /><Body>{note}</Body><Button title="Çıkış yap" secondary onPress={() => void run(app.exit)} /></ScrollView>;
}
