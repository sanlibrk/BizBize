import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { clusterMemories, locationState } from '../domain';
import type { MapProps } from './SharedMap.types';

export default function SharedMap({ memories, locations, userId, preview, onMemory, focus, pick, selected }: MapProps) {
  const ref = useRef<MapView>(null);
  const [delta, setDelta] = useState(0.10);
  const [ready, setReady] = useState(false);
  const fitted = useRef(false);
  const visible = useMemo(() => locations.filter(l => l.sharing), [locations]);
  const points = useMemo(() => [...memories, ...visible], [memories, visible]);
  useEffect(() => {
    if (!ready || fitted.current || !points.length || focus || pick) return;
    fitted.current = true;
    if (points.length === 1) ref.current?.animateToRegion({ ...points[0], latitudeDelta: .035, longitudeDelta: .035 }, 300);
    else ref.current?.fitToCoordinates(points, { edgePadding: { top: 85, bottom: 65, left: 50, right: 50 }, animated: false });
  }, [ready, points, focus, pick]);
  useEffect(() => {
    if (focus) ref.current?.animateToRegion({ ...focus, latitudeDelta: 0.018, longitudeDelta: 0.018 }, 600);
  }, [focus]);
  const initial = selected ?? memories[0] ?? visible[0] ?? { latitude: 41.015, longitude: 28.98 };
  return <MapView ref={ref} style={StyleSheet.absoluteFill} initialRegion={{ ...initial, latitudeDelta: 0.10, longitudeDelta: 0.10 }}
    onMapReady={() => setReady(true)}
    onRegionChangeComplete={(r: Region) => setDelta(r.latitudeDelta)}
    onPress={pick ? e => pick(e.nativeEvent.coordinate) : undefined}
    showsCompass={false} showsUserLocation={false} showsPointsOfInterests={false}>
    {clusterMemories(memories, delta).map(cluster => <Marker key={cluster.id} coordinate={cluster}
      onPress={e => { e.stopPropagation(); if (cluster.memories.length > 1) ref.current?.animateToRegion({ ...cluster, latitudeDelta: delta / 3, longitudeDelta: delta / 3 }, 450); else onMemory(cluster.memories[0]); }}
      accessibilityLabel={cluster.memories.length > 1 ? `${cluster.memories.length} anı, yakınlaştır` : cluster.memories[0].place}>
      {delta < 0.035 ? <View style={s.photoPin}><Image source={{ uri: cluster.memories[0].photo_url }} style={s.photo} /><View style={s.tip} /></View>
        : <View style={s.dot}><Text style={s.count}>{cluster.memories.length > 1 ? cluster.memories.length : '♥'}</Text></View>}
    </Marker>)}
    {visible.map(location => <Marker key={location.user_id} coordinate={location} zIndex={10} title={location.user_id === userId ? 'Sen' : 'Partnerin'}
      description={preview ? 'Örnek konum · canlı değil' : locationState(location) === 'recent' ? 'Son 2 dakika içinde güncellendi' : 'Eski konum · çevrimdışı olabilir'}>
      <View style={s.personWrap}><View style={[s.person, location.user_id !== userId && s.partner, (preview || locationState(location) === 'stale') && s.stale]}><Text style={s.initial}>{location.user_id === userId ? 'S' : 'P'}</Text></View>
        <Text style={s.personLabel}>{location.user_id === userId ? 'Sen' : 'Partnerin'}{preview ? ' · örnek' : ''}</Text></View>
    </Marker>)}
    {selected && <Marker coordinate={selected} pinColor="#AE596C" title="Seçilen yer" />}
  </MapView>;
}
const s = StyleSheet.create({
  dot: { width: 29, height: 29, borderRadius: 15, backgroundColor: '#B25B70', borderWidth: 3, borderColor: '#FFFCF7', alignItems: 'center', justifyContent: 'center' },
  count: { color: '#fff', fontWeight: '700', fontSize: 12 },
  photoPin: { backgroundColor: '#fff', padding: 3, borderRadius: 12, marginBottom: 8 }, photo: { width: 52, height: 55, borderRadius: 9 },
  tip: { width: 10, height: 10, backgroundColor: '#fff', position: 'absolute', bottom: -4, left: 24, transform: [{ rotate: '45deg' }] },
  personWrap: { alignItems: 'center', padding: 4 }, person: { width: 42, height: 42, borderRadius: 23, borderWidth: 4, borderColor: '#fff', backgroundColor: '#527A72', alignItems: 'center', justifyContent: 'center' },
  partner: { backgroundColor: '#BA7184' }, stale: { opacity: 0.65, borderColor: '#E0D8CD' }, initial: { color: '#fff', fontWeight: '700', fontSize: 17 },
  personLabel: { fontSize: 10, color: '#443D3B', backgroundColor: '#FFFCF7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
});
