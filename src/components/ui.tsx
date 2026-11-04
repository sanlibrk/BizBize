import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { Heart, X, type LucideIcon } from 'lucide-react-native';
export const C = { cream: '#FBF8F2', white: '#FFFEFB', pink: '#AE596C', pale: '#F3E3E6', ink: '#342E2D', muted: '#8A7D78', line: '#EAE2DA', green: '#527A72' };
export const serif = Platform.OS === 'ios' ? 'Georgia' : Platform.OS === 'web' ? 'Georgia, serif' : 'serif';
export function Heading({ children, size = 30 }: { children: React.ReactNode; size?: number }) { return <Text style={{ fontFamily: serif, fontSize: size, lineHeight: size * 1.17, color: C.ink, letterSpacing: -0.7 }}>{children}</Text>; }
export function Body({ children, muted = false, style }: { children: React.ReactNode; muted?: boolean; style?: any }) { return <Text style={[{ fontSize: 14, lineHeight: 22, color: muted ? C.muted : C.ink }, style]}>{children}</Text>; }
export function Eyebrow({ children }: { children: React.ReactNode }) { return <Text style={{ color: C.pink, fontSize: 10, letterSpacing: 2, fontWeight: '700' }}>{children}</Text>; }
export function Button({ title, onPress, secondary, busy, disabled, icon: Icon, style }: { title: string; onPress: () => void; secondary?: boolean; busy?: boolean; disabled?: boolean; icon?: LucideIcon; style?: ViewStyle }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy }} disabled={disabled || busy} onPress={onPress}
    style={({ pressed }) => [s.button, secondary && s.secondary, (disabled || busy) && { opacity: .5 }, pressed && { opacity: .8 }, style]}>
    {busy ? <ActivityIndicator color={secondary ? C.pink : '#fff'} /> : Icon ? <Icon size={18} color={secondary ? C.pink : '#fff'} strokeWidth={1.8} /> : null}
    <Text style={[s.buttonText, secondary && { color: C.pink }]}>{title}</Text>
  </Pressable>;
}
export function IconButton({ icon: Icon, onPress, label, color = C.ink }: { icon: LucideIcon; onPress: () => void; label: string; color?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [s.iconButton, pressed && { opacity: .6 }]}><Icon size={21} color={color} strokeWidth={1.7} /></Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) { return <View style={{ gap: 7 }}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor="#AB9E98" {...props} style={[s.input, props.multiline && { minHeight: 84, textAlignVertical: 'top' }, props.style]} /></View>; }
export function Logo({ small = false }: { small?: boolean }) { return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={{ width: small ? 30 : 40, height: small ? 30 : 40, borderRadius: 14, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center' }}><Heart size={small ? 18 : 24} color={C.pink} strokeWidth={1.6} /></View><Text style={{ fontFamily: serif, fontSize: small ? 23 : 27, color: C.ink, letterSpacing: -.7 }}>biz bize<Text style={{ color: C.pink }}>.</Text></Text></View>; }
export function CloseRow({ title, close }: { title: string; close: () => void }) { return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}><Heading size={26}>{title}</Heading><IconButton icon={X} label="Kapat" onPress={close} /></View>; }
export function Empty({ title, text, icon: Icon = Heart }: { title: string; text: string; icon?: LucideIcon }) { return <View style={{ alignItems: 'center', padding: 30, gap: 12 }}><View style={{ padding: 18, borderRadius: 50, backgroundColor: C.pale }}><Icon size={26} color={C.pink} strokeWidth={1.4} /></View><Heading size={24}>{title}</Heading><Body muted style={{ textAlign: 'center' }}>{text}</Body></View>; }
const s = StyleSheet.create({
  button: { minHeight: 52, borderRadius: 17, backgroundColor: C.pink, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  secondary: { backgroundColor: C.pale }, buttonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFEFBD9', borderWidth: 1, borderColor: C.line },
  label: { fontSize: 12, fontWeight: '600', color: C.ink }, input: { minHeight: 50, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, color: C.ink, fontSize: 14 },
});
