import React from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../../store';
import { MemoryDetail } from '../../screens/Home';
export default function MomentRoute() {
  const app = useApp(); const router = useRouter(); const { id } = useLocalSearchParams<{ id: string }>();
  const memory = app.data.memories.find(m => m.id === id);
  if (!app.ready) return null;
  if (!memory) return <Redirect href="/" />;
  return <MemoryDetail memory={memory} close={() => router.canGoBack() ? router.back() : router.replace('/map')} onMap={() => router.replace({ pathname: '/map', params: { lat: memory.latitude, lng: memory.longitude } })} />;
}
