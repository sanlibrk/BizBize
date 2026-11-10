import {randomBytes} from 'node:crypto';
import {readFile,writeFile,access} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),file=new URL('../server/.env.local',import.meta.url),action=process.argv[2]||'up';
if(!['up','down','logs'].includes(action))throw new Error('Supported: up, down, logs');
try{await access(file);}catch{await writeFile(file,`POSTGRES_PASSWORD=${randomBytes(24).toString('hex')}\nAPP_DB_PASSWORD=${randomBytes(24).toString('hex')}\nAPP_SECRET=${randomBytes(32).toString('hex')}\n`,{mode:0o600,flag:'wx'});}
if(action==='up'){
 const envFile=new URL('../.env',import.meta.url);let contents='';try{contents=await readFile(envFile,'utf8');}catch{}
 if(!/^EXPO_PUBLIC_API_URL=/m.test(contents))await writeFile(envFile,contents+'\nEXPO_PUBLIC_API_URL=http://localhost:3001\n',{mode:0o600});
 else if(!/^EXPO_PUBLIC_API_URL=http:\/\/localhost:3001\s*$/m.test(contents))console.log('Existing API URL preserved. To use the local server set EXPO_PUBLIC_API_URL=http://localhost:3001.');
}
const args=['compose','--project-name','bizbize-local','--env-file',fileURLToPath(file),'-f',fileURLToPath(new URL('../server/compose.dev.yml',import.meta.url)),...(action==='up'?['up','--build','-d']:action==='down'?['down']:['logs','--tail','100','api'])];
const result=spawnSync('docker',args,{cwd:fileURLToPath(root),stdio:'inherit',windowsHide:true});
if(result.error)console.error('Docker Desktop is required and must be running.');
if(result.status===0&&action==='up')console.log('Backend: http://localhost:3001/healthz\nLocal email inbox: http://localhost:8025\nNext: npm run web\nDevelopment only; no email is sent to Gmail.');
process.exitCode=result.status??1;
