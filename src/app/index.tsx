import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useApp } from '../store';
import { C } from '../components/ui';
import Auth from '../screens/Auth';
import Pairing from '../screens/Pairing';
import VerifyEmail from '../screens/VerifyEmail';
export default function Index() {
  const app = useApp();
  if (!app.ready) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={C.pink} /></View>;
  if (!app.session && !app.preview) return <Auth />;
  if (!app.preview && !app.session?.user.emailVerified) return <VerifyEmail />;
  if (!app.preview && app.data.members.length !== 2) return <Pairing />;
  return <Redirect href="/map" />;
}
