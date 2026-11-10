import { request,acceptSession,forgetSession,refreshSession,type Session } from './backend';
export async function signUp(email:string,password:string){const value=await request<Session&{token?:string}>('/v1/auth/register',{email,password,terms_version:'2026-11-10'},{anonymous:true});await acceptSession(value);}
export async function signIn(email:string,password:string){const value=await request<Session&{token?:string}>('/v1/auth/login',{email,password},{anonymous:true});await acceptSession(value);}
export async function sendReset(email:string){await request('/v1/auth/forgot',{email},{anonymous:true});}
export async function resendVerification(){await request('/v1/auth/resend',{});}
export async function refreshVerification(code?:string){if(code)await request('/v1/auth/verify',{code});const value=await refreshSession();if(!value.user.emailVerified)throw new Error('E-posta henüz doğrulanmadı. E-postadaki altı haneli kodu gir.');}
export async function signOutAccount(){try{await request('/v1/auth/logout',{});}finally{await forgetSession();}}
export async function changePassword(password:string,code?:string,email?:string,currentPassword?:string){
 if(code&&email)await request('/v1/auth/reset',{email,code,password},{anonymous:true});
 else await request('/v1/auth/password',{password,current_password:currentPassword});
 await forgetSession();
}
export function authMessage(error:unknown){return error instanceof Error?error.message:'İşlem tamamlanamadı.';}
