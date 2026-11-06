import '../lib/location';
import React, { useEffect } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter } from 'expo-router';
import { Provider, useApp } from '../store';
import { C } from '../components/ui';
import { applyEmailAction } from '../lib/auth';
import { firebase } from '../lib/firebase';

function Routes() {
  const app = useApp();
  const { setError } = app;
  const router = useRouter();
  useEffect(() => {
    const handle = async (url: string | null | undefined) => {
      if (!url?.startsWith('bizbize://auth') || !firebase) return;
      const params = new URLSearchParams(url.split('?')[1] ?? ''), code = params.get('oobCode');
      if (!code) return;
      if (params.get('mode') === 'resetPassword') router.replace({ pathname: '/password', params: { oobCode: code } });
      else if (params.get('mode') === 'verifyEmail') {
        try { await applyEmailAction(code); router.replace('/'); }
        catch { setError('E-posta bağlantısı geçersiz veya süresi dolmuş.'); }
      }
    };
    void Linking.getInitialURL().then(handle);
    const listener = Linking.addEventListener('url', event => void handle(event.url));
    return () => listener.remove();
  }, [router, setError]);
  return <View style={s.outer}><SafeAreaView style={s.frame}><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.cream } }}>
    <Stack.Screen name="index" /><Stack.Screen name="(main)" />
    <Stack.Screen name="memory" options={{ presentation: 'modal' }} />
    <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
    <Stack.Screen name="moment/[id]" options={{ presentation: 'modal' }} />
    <Stack.Screen name="legal" options={{ presentation: 'modal' }} />
    <Stack.Screen name="report" options={{ presentation: 'modal' }} />
    <Stack.Screen name="password" options={{ presentation: 'modal' }} />
  </Stack></SafeAreaView></View>;
}
export default function Layout() { return <SafeAreaProvider><Provider><Routes /></Provider></SafeAreaProvider>; }
const s = StyleSheet.create({ outer: { flex: 1, backgroundColor: '#EDE7DF' }, frame: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', backgroundColor: C.cream, boxShadow: '0 0 70px #51403916' } });

