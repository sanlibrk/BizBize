import React from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../store';
import MemoryEditor from '../screens/MemoryEditor';
export default function MemoryRoute() {
  const app = useApp(); const router = useRouter(); const { task } = useLocalSearchParams<{ task?: string }>();
  if (!app.ready) return null;
  if (!app.preview && (!app.session || app.data.members.length !== 2)) return <Redirect href="/" />;
  return <MemoryEditor taskId={task} close={() => router.canGoBack() ? router.back() : router.replace('/map')} />;
}
