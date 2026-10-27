// RawEdge-only editorial moderation. Requires a high-entropy key in Vercel env.
import { createHash, timingSafeEqual } from 'node:crypto';
import { get, list, put } from '@vercel/blob';
function respond(res,status,data){
 res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 res.end(JSON.stringify(data));
}
function allowed(req){
 const expected=process.env.READER_MODERATION_KEY||'',auth=req.headers.authorization||'';
 if(expected.length<32||!auth.startsWith('Bearer '))return false;
 const a=createHash('sha256').update(auth.slice(7)).digest();
 const b=createHash('sha256').update(expected).digest();
 return timingSafeEqual(a,b);
}
function isSameSite(req){
 try{
  const u=new URL(req.headers.origin||'');
  const host=(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();
  return u.protocol==='https:'&&u.host.toLowerCase()===host.toLowerCase();
 }catch{return false}
}
async function load(path){
 const saved=await get(path,{access:'private'});
 if(!saved||saved.statusCode!==200||!saved.stream)return null;
 return new Response(saved.stream).json();
}
export default async function handler(req,res){
 if(!allowed(req))return respond(res,401,{error:'Authorized RawEdge editors only.'});
 if(!process.env.BLOB_READ_WRITE_TOKEN)return respond(res,503,{error:'Review storage unavailable.'});
 if(req.method==='GET'){
  try{
   const {blobs}=await list({prefix:'reader-pending/',limit:100});
   const records=await Promise.all(blobs.map(x=>load(x.pathname).catch(()=>null)));
   const pending=records.filter(x=>x?.status==='pending').map(x=>({
    id:x.id,created_at:x.created_at,casino:x.casino,category:x.category,
    sentiment:x.sentiment,experience_month:x.experience_month,alias:x.alias,
    outcome:x.outcome,story:x.story
   })).sort((a,b)=>a.created_at.localeCompare(b.created_at));
   return respond(res,200,{pending,displayed:pending.length,notice:'Approve only accurate, privacy-safe reader submissions; missing evidence is not proof of dishonesty.'});
  }catch(e){console.error('Moderation list failed:',e?.name);return respond(res,503,{error:'Moderation queue temporarily unavailable.'});}
 }
 if(req.method!=='POST')return respond(res,405,{error:'Method not allowed.'});
 if(!isSameSite(req))return respond(res,403,{error:'Origin verification failed.'});
 const body=req.body||{};
 const id=typeof body.id==='string'?body.id:'',decision=body.decision;
 if(!/^[a-f0-9]{48}$/.test(id)||!['approve','reject'].includes(decision))return respond(res,400,{error:'Invalid moderation action.'});
 try{
  const record=await load('reader-pending/'+id+'.json');
  if(!record||record.status!=='pending')return respond(res,409,{error:'Submission no longer awaits review.'});
  const now=new Date().toISOString();
  if(decision==='reject'){
   const rejected={...record,status:'rejected',moderated_at:now,moderation_reason:'Rejected after manual editorial review'};
   await put('reader-pending/'+id+'.json',JSON.stringify(rejected),{access:'private',contentType:'application/json',addRandomSuffix:false,allowOverwrite:true,cacheControlMaxAge:60});
   return respond(res,200,{id,status:'rejected'});
  }
  const story=typeof body.story==='string'?body.story.trim():record.story;
  const alias=typeof body.alias==='string'?body.alias.trim():record.alias;
  if(story.length<60||story.length>1800||alias.length<1||alias.length>32||
     /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(story)||/(?:\b\d[ -]?){12,19}\b/.test(story)||
     /(?:https?:\/\/|www\.)/i.test(story)){
   return respond(res,422,{error:'Remove private details and keep the account within the limits.'});
  }
  const published={...record,story,alias,status:'approved',moderated_at:now,published_at:now,
    editorial_note:'Reader-submitted personal experience; not independently verified by RawEdge.'};
  await put('reader-approved/'+id+'.json',JSON.stringify(published),{
    access:'private',contentType:'application/json',addRandomSuffix:false,cacheControlMaxAge:60
  });
  await put('reader-pending/'+id+'.json',JSON.stringify(published),{
    access:'private',contentType:'application/json',addRandomSuffix:false,
    allowOverwrite:true,cacheControlMaxAge:60
  });
  return respond(res,200,{id,status:'approved',published_at:now});
 }catch(e){console.error('Moderation write failed:',e?.name);return respond(res,503,{error:'Could not apply moderation decision. Check storage and retry.'});}
}
