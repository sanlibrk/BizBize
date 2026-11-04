import { applyActionCode, confirmPasswordReset, createUserWithEmailAndPassword, getIdToken, reload, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updatePassword } from 'firebase/auth';
import { services } from './firebase';

export async function signUp(email: string, password: string) {
  const result = await createUserWithEmailAndPassword(services().auth, email, password);
  await sendEmailVerification(result.user);
}
export async function signIn(email: string, password: string) {
  await signInWithEmailAndPassword(services().auth, email, password);
}
export async function sendReset(email: string) { await sendPasswordResetEmail(services().auth, email); }
export async function refreshVerification() {
  const user = services().auth.currentUser;
  if (!user) return;
  await reload(user); await getIdToken(user, true);
  if (!user.emailVerified) throw new Error('E-posta henüz doğrulanmadı. Gelen kutunu kontrol et.');
}
export async function resendVerification() {
  const user = services().auth.currentUser;
  if (user) await sendEmailVerification(user);
}
export async function signOutAccount() { await signOut(services().auth); }
export async function applyEmailAction(code: string) { await applyActionCode(services().auth, code); await refreshVerification(); }
export async function changePassword(password: string, code?: string) {
  if (code) await confirmPasswordReset(services().auth, code, password);
  else {
    const user = services().auth.currentUser;
    if (!user) throw new Error('Önce giriş yap veya e-postadaki yenileme bağlantısını kullan.');
    await updatePassword(user, password);
  }
}
export function authMessage(error: unknown) {
  const code = (error as { code?: string })?.code ?? '';
  if (/invalid-credential|wrong-password|user-not-found/.test(code)) return 'E-posta veya şifre hatalı.';
  if (code.includes('email-already-in-use')) return 'Bu e-posta kayıtlı. Giriş yapmayı dene.';
  if (code.includes('too-many-requests')) return 'Çok fazla deneme. Biraz sonra tekrar dene.';
  if (code.includes('network-request-failed')) return 'Firebase bağlantısı kurulamadı. İnternet veya emülatör bağlantısını kontrol et.';
  if (/expired-action-code|invalid-action-code/.test(code)) return 'E-posta bağlantısı geçersiz veya süresi dolmuş. Yeni bağlantı iste.';
  if (code.includes('requires-recent-login')) return 'Güvenlik için yeniden giriş yapıp tekrar dene.';
  return error instanceof Error ? error.message : 'İşlem tamamlanamadı.';
}
