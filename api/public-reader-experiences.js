// Public, moderated-only reader experiences. Never exposes pending private submissions.
import {list,get} from '@vercel/blob';

const json=(res,status,body)=>{
 res.statusCode=status;
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','public, max-age=0, s-maxage=30, stale-while-revalidate=30');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.end(JSON.stringify(body));
};
export default async function handler(req,res){
 if(req.method!=='GET')return json(res,405,{error:'Method not allowed.'});
 if(!process.env.BLOB_READ_WRITE_TOKEN)return json(res,503,{error:'Community reviews are currently unavailable.'});
 try{
  const {blobs}=await list({prefix:'reader-approved/',limit:50});
  const newest=[...blobs].sort((a,b)=>String(b.uploadedAt).localeCompare(String(a.uploadedAt))).slice(0,30);
  const found=await Promise.all(newest.map(async item=>{
   try{
    const response=await get(item.pathname,{access:'private'});
    if(!response||response.statusCode!==200||!response.stream)return null;
    const record=await new Response(response.stream).json();
    if(record.status!=='approved'||!record.published_at||typeof record.story!=='string')return null;
    return {
     casino:record.casino,category:record.category,sentiment:record.sentiment,
     alias:record.alias,experience_month:record.experience_month,outcome:record.outcome,
     published_at:record.published_at,story:record.story
    };
   }catch(_){return null}
  }));
  const experiences=found.filter(Boolean).sort((a,b)=>b.published_at.localeCompare(a.published_at));
  return json(res,200,{experiences,displayed:experiences.length,disclosure:'Reader submissions, not verified RawEdge payout tests; all visible items were moderated.'});
 }catch(error){
  console.error('Public reader feed unavailable:',error?.name);
  return json(res,503,{error:'Community reviews are temporarily unavailable.'});
 }
}
