import React from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Body, Button, CloseRow, Heading } from '../components/ui';
import { POLICY_VERSION, PRIVACY_VERSION, privacySections, termsSections, SUPPORT_EMAIL } from '../content/policies';
export default function Legal() {
  const router = useRouter();
  const { page } = useLocalSearchParams<{ page?: string }>();
  const terms = page === 'terms';
  const [error, setError] = React.useState('');
  return <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
    <CloseRow title={terms ? 'Kullanım koşulları' : 'Gizlilik politikası'} close={() => router.back()} />
    <Body muted>Son güncelleme: {terms ? POLICY_VERSION : PRIVACY_VERSION}</Body>
    {(terms ? termsSections : privacySections).map(([title, text]) => <View key={title} style={{ gap: 8 }}><Heading size={23}>{title}</Heading><Body>{text}</Body></View>)}
    <Button title="Destek e-postası oluştur" secondary onPress={() => { void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Biz%20Bize%20Destek`).catch(() => setError(`E-posta uygulaması açılamadı. ${SUPPORT_EMAIL} adresine yazabilirsin.`)); }} />
    {!!error && <Body>{error}</Body>}
  </ScrollView>;
}
