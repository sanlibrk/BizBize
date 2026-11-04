import React, { useState } from 'react';
import { ScrollView, View, Image, Pressable, Text, Platform, KeyboardAvoidingView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { Camera, MapPin, LocateFixed, Check } from 'lucide-react-native';
import { useApp } from '../store';
import { Button, Body, C, CloseRow, Field } from '../components/ui';
import SharedMap from '../components/SharedMap';
import type { Coordinate, MemoryDraft } from '../types';
import { localDate, validateDraft } from '../domain';

export default function MemoryEditor({ close, taskId }: { close: () => void; taskId?: string }) {
  const app = useApp();
  const [photo, setPhoto] = useState<{ uri: string; base64?: string }>({ uri: '' });
  const [note, setNote] = useState('');
  const [place, setPlace] = useState('');
  const [date, setDate] = useState(localDate());
  const [coordinate, setCoordinate] = useState<Coordinate>();
  const [focus, setFocus] = useState<Coordinate>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (work: () => Promise<void>) => { setBusy(true); setError(''); try { await work(); } catch (e) { setError(e instanceof Error ? e.message : 'İşlem tamamlanamadı.'); } finally { setBusy(false); } };
  const choose = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: .85, allowsEditing: false });
    if (result.canceled) return;
    const image = await ImageManipulator.manipulateAsync(result.assets[0].uri, [{ resize: { width: 1600 } }], { compress: .8, format: ImageManipulator.SaveFormat.JPEG, base64: true });
    setPhoto({ uri: image.uri, base64: image.base64 });
  };
  const current = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') throw new Error('Konum izni verilmedi. Haritaya dokunarak yer seçebilirsin.');
    const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const point = { latitude: fix.coords.latitude, longitude: fix.coords.longitude };
    setCoordinate(point); setFocus(point);
  };
  const save = async () => {
    const draft: MemoryDraft = { ...photo, note, place, happened_on: date, latitude: coordinate?.latitude ?? NaN, longitude: coordinate?.longitude ?? NaN, mimeType: 'image/jpeg' };
    const message = validateDraft(draft); if (message) throw new Error(message);
    await app.addMemory(draft, taskId); close();
  };
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={{ padding: 24, gap: 19 }} keyboardShouldPersistTaps="handled">
    <CloseRow title={taskId ? 'Görevden bir anıya' : 'Küçük bir anı ekle'} close={busy ? () => {} : close} />
    <Pressable accessibilityRole="button" accessibilityLabel="Fotoğraf seç" disabled={busy} onPress={() => void run(choose)} style={{ minHeight: 185, backgroundColor: C.pale, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      {photo.uri ? <Image source={{ uri: photo.uri }} style={{ width: '100%', height: 220 }} /> : <><Camera color={C.pink} size={30} strokeWidth={1.4} /><Text style={{ color: C.pink, fontSize: 13 }}>Bir fotoğraf seç</Text><Text style={{ color: C.muted, fontSize: 10 }}>Yalnızca seçtiğin fotoğraf paylaşılır</Text></>}
    </Pressable>
    {app.preview && !photo.uri && <Button title="Örnek fotoğrafı kullan" secondary onPress={() => setPhoto({ uri: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=900&q=85' })} />}
    <Field label="Bu anı nasıl hatırlayalım?" placeholder="Bir kahve, güzel bir sohbet…" multiline maxLength={500} value={note} onChangeText={setNote} />
    <Field label="Tarih · YYYY-AA-GG" placeholder="2026-11-02" value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" maxLength={10} />
    <Field label="Yer adı" placeholder="Örneğin: sahildeki küçük kafe" value={place} onChangeText={setPlace} maxLength={120} />
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Body>Haritadan yer seç</Body>{!app.preview && <Pressable accessibilityRole="button" disabled={busy} onPress={() => void run(current)} style={{ flexDirection: 'row', gap: 5, alignItems: 'center', padding: 10 }}><LocateFixed size={15} color={C.pink} /><Text style={{ color: C.pink, fontSize: 11 }}>Konumumu kullan</Text></Pressable>}</View>
    <View style={{ height: 230, overflow: 'hidden', borderRadius: 20 }}><SharedMap memories={[]} locations={[]} userId={app.userId} preview={app.preview} onMemory={() => {}} pick={setCoordinate} selected={coordinate} focus={focus} /></View>
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><MapPin size={14} color={C.pink} /><Body muted style={{ fontSize: 11 }}>{coordinate ? `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)} · yer seçildi` : 'Henüz yer seçilmedi. Haritaya dokun.'}</Body></View>
    {!!error && <Body style={{ color: C.pink }}>{error}</Body>}
    <Button title={taskId ? 'Anıyı kaydet ve görevi tamamla' : 'Anıyı birlikte saklayın'} busy={busy} icon={Check} onPress={() => void run(save)} />
    <Body muted style={{ fontSize: 11, textAlign: 'center' }}>{app.preview ? 'Yerel önizlemeye kaydedilir. Gerçek hesaba aktarılmaz.' : 'Fotoğraf, not ve seçtiğin yer ortak harita ve albümde görünür.'}</Body>
  </ScrollView></KeyboardAvoidingView>;
}
