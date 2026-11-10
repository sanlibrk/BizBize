import { writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { Pool,transaction,serialize } from './db.js';
import { closePair } from './actions.js';
const pool=new Pool({connectionString:process.env.DATABASE_URL});const [action='list',raw,output]=process.argv.slice(2);
try{
 if(action==='list'){const photos=await pool.query("SELECT id,created_at FROM photos WHERE status='pending' ORDER BY created_at LIMIT 50"),reports=await pool.query("SELECT id,kind,reason,created_at FROM reports WHERE status='open' ORDER BY created_at LIMIT 50");console.log(JSON.stringify({pendingPhotos:photos.rows,reports:reports.rows}));}
 else{const id=z.uuid().parse(raw);
  if(action==='export-photo'){if(!output)throw new Error('Output file required');const r=await pool.query('SELECT bytes FROM photos WHERE id=$1',[id]);if(!r.rowCount)throw new Error('Photo not found');await writeFile(output,r.rows[0].bytes,{mode:0o600,flag:'wx'});console.log('Photo exported to private operator file. Remove copy after review.');}
  else await transaction(pool,async db=>{await serialize(db);
   if(action==='approve-photo')await db.query("UPDATE photos SET status='approved' WHERE id=$1",[id]);
   else if(action==='reject-photo')await db.query('DELETE FROM photos WHERE id=$1',[id]);
   else if(action==='resolve-report')await db.query("UPDATE reports SET status='resolved' WHERE id=$1",[id]);
   else if(action==='disable-user'){await closePair(db,id);await db.query('UPDATE users SET disabled=true WHERE id=$1',[id]);await db.query('DELETE FROM sessions WHERE user_id=$1',[id]);}
   else throw new Error('Unknown action');await db.query('INSERT INTO audit_events(action,object_id) VALUES($1,$2)',[action,id]);console.log('Operator action recorded.');});
 }
}finally{await pool.end();}
