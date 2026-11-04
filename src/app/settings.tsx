import React from 'react';
import { Redirect, useRouter } from 'expo-router';
import { useApp } from '../store';
import Settings from '../screens/Settings';
export default function SettingsRoute() {
  const app = useApp(); const router = useRouter();
  if (!app.ready) return null;
  if (!app.preview && !app.session) return <Redirect href="/" />;
  return <Settings close={() => router.canGoBack() ? router.back() : router.replace('/')} />;
}
