import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './map.web.css';
import { clusterMemories, locationState } from '../domain';
import type { MapProps } from './SharedMap.types';

const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const icon = (html: string, size: number) => L.divIcon({ className: 'yanyana-marker', html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
function Content({ memories, locations, userId, preview, onMemory, focus, pick, selected }: MapProps) {
  const map = useMap();
  const [delta, setDelta] = useState(0.1);
  const fitted = useRef(false);
  const points = useMemo(() => [...memories, ...locations.filter(l => l.sharing)], [memories, locations]);
  useEffect(() => {
    if (fitted.current || !points.length || focus || pick) return;
    fitted.current = true;
    map.fitBounds(L.latLngBounds(points.map(p => [p.latitude,p.longitude])), { paddingTopLeft: [50,85], paddingBottomRight: [50,65], maxZoom: 14 });
  }, [map, points, focus, pick]);
  useMapEvents({ zoomend: () => setDelta(map.getBounds().getNorth() - map.getBounds().getSouth()), click: e => pick?.({ latitude: e.latlng.lat, longitude: e.latlng.lng }) });
  useEffect(() => { const timer = setTimeout(() => { map.invalidateSize(); setDelta(map.getBounds().getNorth() - map.getBounds().getSouth()); }, 100); return () => clearTimeout(timer); }, [map]);
  useEffect(() => { if (focus) map.flyTo([focus.latitude, focus.longitude], 15); }, [focus, map]);
  return <>
    {clusterMemories(memories, delta).map(cluster => {
      const close = delta < 0.035;
      const html = close ? `<div style="width:54px;height:60px;padding:3px;background:#fff;border-radius:12px;box-shadow:0 3px 12px #51403940"><img alt="${escape(cluster.memories[0].place)}" src="${escape(cluster.memories[0].photo_url ?? '')}" style="width:100%;height:100%;object-fit:cover;border-radius:9px" /></div>`
        : `<div style="width:26px;height:26px;border:3px solid #fffaf4;border-radius:50%;background:#ae596c;color:white;display:grid;place-items:center;font:700 12px system-ui;box-shadow:0 2px 6px #55443330">${cluster.memories.length > 1 ? cluster.memories.length : '♥'}</div>`;
      return <Marker key={cluster.id} position={[cluster.latitude, cluster.longitude]} icon={icon(html, close ? 60 : 32)}
        eventHandlers={{ click: () => cluster.memories.length > 1 ? map.flyTo([cluster.latitude, cluster.longitude], map.getZoom() + 2) : onMemory(cluster.memories[0]) }} />;
    })}
    {locations.filter(l => l.sharing).map(location => {
      const me = location.user_id === userId;
      const stale = preview || locationState(location) === 'stale';
      return <Marker key={location.user_id} position={[location.latitude, location.longitude]} zIndexOffset={1000}
        icon={icon(`<div style="opacity:${stale ? 0.65 : 1};text-align:center;width:76px;margin-left:-15px"><div style="width:39px;height:39px;margin:auto;border:4px solid white;border-radius:50%;background:${me ? '#527A72' : '#BA7184'};color:white;display:grid;place-items:center;font:700 16px system-ui;box-shadow:0 0 0 8px ${me ? '#527a7218' : '#ba718418'}">${me ? 'S' : 'P'}</div><span style="display:inline-block;background:#fffcf7;border-radius:5px;padding:2px 5px;margin-top:5px;color:#443d3b;font:10px system-ui;white-space:nowrap">${me ? 'Sen' : 'Partnerin'}${preview ? ' · örnek' : stale ? ' · eski' : ''}</span></div>`, 46)} />;
    })}
    {selected && <Marker position={[selected.latitude, selected.longitude]} icon={icon('<div style="font-size:32px;color:#ae596c;text-shadow:0 2px 4px #fff">📍</div>', 36)} />}
  </>;
}
export default function SharedMap(props: MapProps) {
  const initial = props.selected ?? props.memories[0] ?? props.locations.find(l => l.sharing) ?? { latitude: 41.015, longitude: 28.98 };
  return <MapContainer center={[initial.latitude, initial.longitude]} zoom={12} zoomControl={false} attributionControl style={{ position: 'absolute', inset: 0, background: '#EDECE3', zIndex: 0 }}>
    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
    <Content {...props} />
  </MapContainer>;
}
