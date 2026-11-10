import '../lib/location';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { Provider } from '../store';
import { C } from '../components/ui';

function Routes() {
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

