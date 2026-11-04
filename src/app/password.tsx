import React, { useState } from 'react';
import { View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Body, Button, CloseRow, Field } from '../components/ui';
import { authMessage, changePassword } from '../lib/auth';
import { useApp } from '../store';
export default function PasswordRoute() {
  const app = useApp(); const router = useRouter();
  const { oobCode } = useLocalSearchParams<{ oobCode?: string }>();
  const [password, setPassword] = useState(''); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false);
  if (!app.ready) return null;
  if (!app.session && !oobCode) return <Redirect href="/" />;
  return <View style={{ padding: 26, gap: 22 }}><CloseRow title="Yeni şifreni belirle" close={() => router.replace('/')} /><Field label="Yeni şifre" value={password} onChangeText={setPassword} secureTextEntry placeholder="En az 8 karakter" /><Body>{note}</Body><Button title="Şifreyi kaydet" busy={busy} onPress={() => {
    if (password.length < 8) { setNote('Şifren en az 8 karakter olmalı.'); return; }
    setBusy(true);
    void changePassword(password, oobCode).then(() => { setPassword(''); router.replace('/'); }).catch(error => setNote(authMessage(error))).finally(() => setBusy(false));
  }} /></View>;
}
