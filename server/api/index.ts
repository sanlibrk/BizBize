import type { IncomingMessage, ServerResponse } from 'node:http';
import { serverlessApp } from '../src/serverless.js';
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await serverlessApp();
    await new Promise<void>((resolve,reject) => {
      res.once('finish',resolve);
      res.once('close',resolve);
      res.once('error',reject);
      app.server.emit('request',req,res);
    });
  } catch {
    console.error('Serverless API initialization unavailable.');
    if (!res.headersSent) {
      res.writeHead(503, {'Content-Type':'application/json','Cache-Control':'no-store'});
      res.end(JSON.stringify({error:{message:'Sunucu şu an hazır değil. Biraz sonra tekrar dene.'}}));
    } else res.end();
  }
}
