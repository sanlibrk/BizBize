import React from 'react';
import { Redirect, Slot } from 'expo-router';
import { useApp } from '../../store';
export default function MainLayout() {
  const app = useApp();
  if (!app.ready) return null;
  if (!app.preview && (!app.session || app.data.members.length !== 2)) return <Redirect href="/" />;
  return <Slot />;
}
