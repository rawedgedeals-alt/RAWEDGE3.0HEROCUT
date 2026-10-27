// Stores reader-submitted personal experiences in the private RawEdge Vercel Blob store.
// Important: new accounts are NOT made public until independently moderated.
import { randomBytes } from 'node:crypto';
import { put, get } from '@vercel/blob';

const CATEGORIES = new Set([
  'Withdrawal or cashout','Deposit or payment','Bonus or promotion terms',
  'Account verification','Customer support','Games or platform experience','Other experience'
]);
const SENTIMENTS = new Set(['Positive','Mixed','Negative']);
const OUTCOMES = new Set(['Resolved','Still waiting / unresolved','Not applicable']);
const RECEIPT = /^[a-f0-9]{48}$/;
const json = (res,status,payload) => {
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.end(JSON.stringify(payload));
};
const clean = value => typeof value==='string' ? value.trim().replace(/\r\n?/g,'\n') : '';
function hasSensitiveData(text) {
  return /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text) ||
    /(?:\b\d[ -]?){12,19}\b/.test(text) ||
    /\b(?:\+?\d[\s().-]?){10,}\b/.test(text) ||
    /\b(?:https?:\/\/|www\.)/i.test(text);
}
function isSameSite(req) {
  const origin=req.headers.origin;
  if(!origin)return false;
  try {
    const from=new URL(origin), host=(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim().toLowerCase();
    return from.protocol==='https:' && from.host.toLowerCase()===host;
  } catch {return false;}
}
async function readBody(req) {
  if(req.body && typeof req.body==='object')return req.body;
  let size=0,body='';
  for await(const chunk of req){
    size+=chunk.length;
    if(size>11000)throw new Error('too_large');
    body+=chunk.toString('utf8');
  }
  try{return JSON.parse(body||'{}')}catch{return null}
}
export default async function handler(req,res) {
  res.setHeader('Allow','GET, POST');
  if(req.method==='GET') {
    const receipt=typeof req.query?.receipt==='string'?req.query.receipt:'';
    if(!RECEIPT.test(receipt))return json(res,400,{error:'Invalid submission receipt.'});
    if(!process.env.BLOB_READ_WRITE_TOKEN)return json(res,503,{error:'Review storage is not connected.'});
    try {
      const saved=await get('reader-pending/'+receipt+'.json',{access:'private'});
      if(!saved||saved.statusCode!==200||!saved.stream)return json(res,404,{error:'Submission not found.'});
      const data=await new Response(saved.stream).json();
      // The random receipt is an unguessable bearer key. Never disclose an entire moderation queue.
      return json(res,200,{id:data.id,status:data.status,created_at:data.created_at,
        casino:data.casino,category:data.category,sentiment:data.sentiment,
        experience_month:data.experience_month,alias:data.alias,outcome:data.outcome,story:data.story});
    }catch(e){console.error('Review lookup failed:',e?.name);return json(res,503,{error:'Could not read your submission right now.'});}
  }
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed.'});
  if(!isSameSite(req))return json(res,403,{error:'Please submit directly from the RawEdge website.'});
  if(!/^application\/json\b/i.test(req.headers['content-type']||''))return json(res,415,{error:'Expected JSON.'});
  if(Number(req.headers['content-length']||0)>11000)return json(res,413,{error:'Submission too large.'});
  if(!process.env.BLOB_READ_WRITE_TOKEN)return json(res,503,{error:'Review storage is not connected yet.'});
  let body;
  try {body=await readBody(req)}catch(e){return json(res,413,{error:'Submission too large.'})}
  if(!body||typeof body!=='object'||Array.isArray(body))return json(res,400,{error:'Invalid submission.'});
  if(body.website||body.hidden_field)return json(res,202,{status:'pending',message:'Submission received for review.'});
  const casino=clean(body.casino), category=clean(body.category),sentiment=clean(body.sentiment),
        experience_month=clean(body.experience_month),alias=clean(body.alias)||'Anonymous reader',
        outcome=clean(body.outcome), story=clean(body.story);
  if(casino.length<2||casino.length>90||!CATEGORIES.has(category)||!SENTIMENTS.has(sentiment)
    ||!OUTCOMES.has(outcome)||alias.length>32||story.length<60||story.length>1800
    ||(experience_month && !/^(?:20[12]\d)-(?:0[1-9]|1[0-2])$/.test(experience_month))
    ||hasSensitiveData(casino+' '+alias+' '+story)) {
    return json(res,422,{error:'Please complete all fields and remove URLs, email addresses, phone numbers and account or card numbers.'});
  }
  const id=randomBytes(24).toString('hex');
  const record={
    id,status:'pending',created_at:new Date().toISOString(),casino,category,sentiment,
    experience_month:experience_month||null,alias,outcome,story,
    source:'unverified-firsthand-reader-account',ad_payment_affects_moderation:false
  };
  try {
    await put('reader-pending/'+id+'.json',JSON.stringify(record),{
      access:'private',contentType:'application/json',addRandomSuffix:false
    });
    return json(res,201,{id,status:'pending',created_at:record.created_at,
      message:'Your experience was saved. You can see your own submission below. It will be public only after editorial review.'});
  }catch(e) {
    console.error('Reader review storage failed:',e?.name);
    return json(res,503,{error:'We could not save your experience yet. Please try again.'});
  }
}
