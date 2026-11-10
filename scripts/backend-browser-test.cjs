const {chromium}=require('playwright');
const {randomUUID}=require('node:crypto');
const fs=require('node:fs/promises');
const password='Browser-test-password-2026!';
async function verificationCode(email){
 for(let attempt=0;attempt<40;attempt++){
  const list=await fetch('http://127.0.0.1:8025/api/v1/messages').then(r=>r.json());
  const message=list.messages?.find(m=>m.To?.some(x=>x.Address===email));
  if(message){const full=await fetch('http://127.0.0.1:8025/api/v1/message/'+message.ID).then(r=>r.json());const match=full.Text?.match(/\b\d{6}\b/);if(match)return match[0];}
  await new Promise(r=>setTimeout(r,1000));
 }
 throw new Error('Local verification email was not delivered');
}
(async()=>{
 const browser=await chromium.launch({headless:true});await fs.mkdir('browser-results',{recursive:true});const errors=[];
 async function signup(){
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const email=`browser-${randomUUID()}@example.test`;
  await page.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Birlikte başlayalım',exact:true}).click();
  await page.getByLabel('E-posta',{exact:true}).fill(email);await page.getByLabel('Şifre',{exact:true}).fill(password);
  await page.getByRole('checkbox').click();await page.getByRole('button',{name:'Hesap oluştur',exact:true}).click();
  await page.getByLabel('Doğrulama kodu',{exact:true}).waitFor();const code=await verificationCode(email);
  await page.getByLabel('Doğrulama kodu',{exact:true}).fill(code);await page.getByRole('button',{name:'E-postamı doğrula',exact:true}).click();
  await page.getByText('Birbirinizi bulun.',{exact:true}).waitFor();return {context,page};
 }
 try{
  const a=await signup();await a.page.getByRole('button',{name:'Davet kodu oluştur',exact:true}).click();
  const invite=await a.page.getByText(/^[A-F0-9]{6} [A-F0-9]{6}$/).innerText();const b=await signup();
  await b.page.getByLabel('Partnerinin davet kodu',{exact:true}).fill(invite);await b.page.getByRole('button',{name:'Eşleş ve devam et',exact:true}).click();
  await a.page.getByRole('tab',{name:'Harita',exact:true}).waitFor({timeout:30000});await b.page.getByRole('tab',{name:'Harita',exact:true}).waitFor();
  await a.page.getByRole('tab',{name:'Mesajlar',exact:true}).click();await a.page.getByLabel('Mesaj',{exact:true}).fill('İki hesap arasında gerçek API testi');await a.page.getByRole('button',{name:'Gönder',exact:true}).click();
  await b.page.getByRole('tab',{name:'Mesajlar',exact:true}).click();await b.page.getByText('İki hesap arasında gerçek API testi',{exact:true}).waitFor({timeout:30000});await b.page.screenshot({path:'browser-results/shared-message.png'});
  await b.page.getByRole('button',{name:'Ayarlar ve konum paylaşımı',exact:true}).click();await b.page.getByRole('button',{name:'İçerik bildir / partneri engelle',exact:true}).click();
  await b.page.getByRole('button',{name:'Bildirimi gönder',exact:true}).click();await b.page.getByRole('button',{name:'Bildirim alındı',exact:true}).waitFor();
  await b.page.getByRole('button',{name:'Partneri engelle',exact:true}).click();await b.page.getByRole('button',{name:'Evet, engelle ve ortak alanı kapat',exact:true}).click();
  await b.page.getByText('Birbirinizi bulun.',{exact:true}).waitFor();await a.page.getByText('Birbirinizi bulun.',{exact:true}).waitFor({timeout:30000});
  if(errors.length)throw new Error('Browser runtime errors: '+errors.join('; '));
  await fs.writeFile('browser-results/result.json',JSON.stringify({signup:true,emailDelivery:true,emailVerification:true,pairing:true,sharedMessaging:true,reporting:true,blocking:true,browserErrors:errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
