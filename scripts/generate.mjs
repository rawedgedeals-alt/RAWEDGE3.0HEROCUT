import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('.');
const topics=JSON.parse(fs.readFileSync(path.join(root,'content/topics.json'),'utf8'));
const dir=path.join(root,'content/queue');
const social=path.join(root,'content/social-drafts');
const publishedPath=path.join(root,'content/published.json');
const published=fs.existsSync(publishedPath)?JSON.parse(fs.readFileSync(publishedPath,'utf8')):[];
const slugs=new Set(published.map(x=>x.slug));
fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(social,{recursive:true});
const limit=Math.max(0,Math.min(20,Number(process.env.MAX_DRAFTS_PER_RUN||'2')));
const now=new Date(), due=new Date(now.getTime()+60_000).toISOString();
let made=0;
async function expand(topic) {
  // Optional LLM: draft-only. AI content never self-approves; verify facts and citations.
  const key=process.env.OPENAI_API_KEY;
  if(!key) return null;
  const endpoint=process.env.CONTENT_AI_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
  const response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
    body:JSON.stringify({model:process.env.CONTENT_AI_MODEL||'gpt-4o-mini',temperature:0.4,
      messages:[{role:'system',content:'Write a factual 600-850 word educational casino-research explainer in Markdown (## headings and lists), plain English. Discuss concepts only. Never invent first-hand reviews, payout times, verified numbers, operator licensing, promises, offers, rankings or current jurisdiction legality. Never encourage gambling as income. State uncertainty clearly. No external links, no affiliate promotions. Output ONLY article body.'},
      {role:'user',content:'Topic: '+topic.title+'\nEditorial notes:\n'+topic.source_notes+'\nRequired outline:\n'+topic.outline.join('\n')}]})});
  if(!response.ok)throw new Error('Draft model returned '+response.status);
  const data=await response.json();
  const body=data.choices?.[0]?.message?.content;
  if(typeof body!=='string'||body.length<500)throw new Error('Draft text missing');
  return body;
}
for(const topic of topics){
 if(made>=limit)break;
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(topic.slug)||slugs.has(topic.slug)||fs.existsSync(path.join(dir,topic.slug+'.json')))continue;
 let generated=null;
 try{if(!topic.body)generated=await expand(topic);}catch(err){console.warn('Skipped AI draft '+topic.slug+': '+err.message);}
 const body=topic.body||generated;
 if(!body || body.length<450)continue;
 const curated=Boolean(topic.body && topic.editorial_approved && topic.source_notes);
 const entry={
   brand:'rawedge',slug:topic.slug,title:topic.title,summary:topic.summary,
   body,source_notes:topic.source_notes,status:curated?'approved':'draft',
   editorial_approved:curated,publish_at:topic.publish_at||due,
   created_at:now.toISOString(),generator:generated?'AI draft pending editorial review':'curated source notes'
 };
 fs.writeFileSync(path.join(dir,topic.slug+'.json'),JSON.stringify(entry,null,2)+'\n');
 const caption='THE CLAIMS ARE LOUD. THE FACTS MATTER.\n\n'+topic.summary+'\n\nRead the guide: https://www.rawedgecasinoreviews.com/articles/'+topic.slug+'.html\n\nIndependent research. 18+ and check local rules. #RawEdge #CasinoEducation';
 const reel=['HOOK (0–3s): '+topic.social_hook,'EXPLAIN (3–15s): '+topic.summary,'CTA (15–22s): Learn the facts on RawEdge. No bought rankings.','Video/audio assets required before social publishing.'];
 fs.writeFileSync(path.join(social,topic.slug+'.json'),JSON.stringify({brand:'rawedge',status:'draft',provider_status:'not_connected_to_automation',article_slug:topic.slug,caption,reel_script:reel,needs_video_for_reel:true},null,2)+'\n');
 made++;
}
console.log(JSON.stringify({generated_drafts:made,remaining_topics:topics.length-published.length}));
