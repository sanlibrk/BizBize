import { randomBytes, scrypt, timingSafeEqual, createHash, createHmac } from 'node:crypto';
export const token = () => randomBytes(32).toString('base64url');
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const codeHash = (secret: string, uid: string, purpose: string, code: string) => createHmac('sha256',secret).update(`${uid}:${purpose}:${code}`).digest('hex');
const derive = (password: string,salt: string) => new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:67108864},(e,key)=>e?reject(e):resolve(key)));
export async function passwordHash(password: string) { const salt=randomBytes(16).toString('hex'); return `scrypt$32768$${salt}$${(await derive(password,salt)).toString('hex')}`; }
export async function passwordMatches(password: string, encoded: string) {
  const parts=encoded.split('$'); if(parts.length!==4||parts[0]!=='scrypt'||parts[1]!=='32768')return false;
  const actual=await derive(password,parts[2]), expected=Buffer.from(parts[3],'hex');return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
export class HttpError extends Error { constructor(public status: number, message: string){super(message);} }
export function fail(status:number,message:string):never {throw new HttpError(status,message);}
export function safeText(value: string) {
 const normalized=value.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g,'');
 if(/seni\s+(?:öldür|oldur)(?:eceğim|ecegim|ürüm|urum)|(?:i will|i'll)\s+(?:kill|rape)\s+you|(?:çocuk|cocuk|child)\s+(?:porn|porno)/iu.test(normalized))fail(400,'Bu metin içerik kurallarına uygun değil.');
 return value.trim();
}
