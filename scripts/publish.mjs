import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const queue = path.join(root, 'content/queue');
const publishedFile = path.join(root, 'content/published.json');
const articleDir = path.join(root, 'articles');
const domain = 'https://www.rawedgecasinoreviews.com';
const GA='<script async src="https://www.googletagmanager.com/gtag/js?id=G-FO4WYKNV6S"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","G-FO4WYKNV6S");</script><script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)}</script><script defer src="/_vercel/insights/script.js"></script>';
const escapeHtml = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const get = (p, fallback) => fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fallback;
const put = (p, content) => { fs.mkdirSync(path.dirname(p), {recursive:true}); fs.writeFileSync(p,content); };
const slugOK = s => typeof s==='string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length<=80;
function renderText(raw) {
  // Escape all supplied input; only a small Markdown subset is supported.
  const lines=raw.replace(/\r/g,'').split('\n'), parts=[];
  let paragraph=[], list=false;
  const flush=()=>{if(paragraph.length){parts.push('<p>'+escapeHtml(paragraph.join(' '))+'</p>');paragraph=[];}};
  for(const l of lines) {
    const s=l.trim(), h=/^(#{2,3})\s+(.+)$/.exec(s), bullet=/^[-*]\s+(.+)$/.exec(s);
    if(!s){flush();if(list){parts.push('</ul>');list=false;}continue;}
    if(h){flush();if(list){parts.push('</ul>');list=false;}parts.push('<h'+h[1].length+'>'+escapeHtml(h[2])+'</h'+h[1].length+'>');}
    else if(bullet){flush();if(!list){parts.push('<ul>');list=true;}parts.push('<li>'+escapeHtml(bullet[1])+'</li>');}
    else{if(list){parts.push('</ul>');list=false;}paragraph.push(s);}
  }
  flush();if(list)parts.push('</ul>');return parts.join('\n');
}
function articlePage(a) {
  const url=domain+'/articles/'+a.slug+'.html';
  const metadata={ '@context':'https://schema.org','@type':'Article', headline:a.title,description:a.summary,datePublished:a.published_at,mainEntityOfPage:url,publisher:{'@type':'Organization',name:'RawEdge Casino Reviews',url:domain}};
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    +'<meta name="robots" content="index,follow,max-image-preview:large">'
    +'<title>'+escapeHtml(a.title)+' | RawEdge Research</title>'
    +'<meta name="description" content="'+escapeHtml(a.summary)+'">'
    +'<link rel="canonical" href="'+url+'"><link rel="stylesheet" href="../style.css">'
    +'<meta property="og:title" content="'+escapeHtml(a.title)+'"><meta property="og:description" content="'+escapeHtml(a.summary)+'"><meta property="og:url" content="'+url+'">'
    +GA+'<script type="application/ld+json">'+JSON.stringify(metadata).replace(/</g,'\\u003c')+'</script>'
    +'<style>main{max-width:850px;margin:0 auto;padding:50px 20px 110px}article{line-height:1.75;color:#d2e2dd}article h1{color:white;font-size:clamp(35px,6vw,57px);line-height:1.12}article h2{color:#64ffb2;margin-top:42px}article h3{color:#a5ffd7;margin-top:30px}article p,article li{font-size:17px}.lead{font-size:21px;color:#eafff4;border-left:3px solid #20f59a;padding-left:19px}.article-meta{font-size:12px;color:#70e8b0;letter-spacing:.12em;font-weight:850}.next{margin-top:45px;border-radius:15px;padding:24px;border:1px solid #2bb57e;background:#0b211b}.next a{color:#74ffd1;text-decoration:underline;margin-right:16px}</style>'
    +'</head><body><div class="topbar"><span>RAWEDGE RESEARCH DESK</span><span>18+ only</span><span>No bought rankings</span></div>'
    +'<header class="header"><a class="brand" href="../index.html"><span class="logo">R</span><span>RAW<span>EDGE</span><small>CASINO REVIEWS</small></span></a><nav><a href="../index.html">Home</a><a href="../guides.html">Guides</a><a href="../insights.html">Latest</a></nav></header>'
    +'<main><article><div class="article-meta">EDUCATIONAL GUIDE · '+escapeHtml(a.published_at.slice(0,10))+'</div><h1>'+escapeHtml(a.title)+'</h1><p class="lead">'+escapeHtml(a.summary)+'</p>'
    +renderText(a.body)
    +'<section class="next"><b>Independent research, not a promise.</b><p>Rules, offers and eligibility can change. Verify current operator terms and local laws. No payment buys a positive RawEdge review.</p><a href="../insights.html">All insights</a><a href="../guides.html">Guides</a><a href="../responsible-gambling.html">Responsible play</a></section></article></main>'
    +'<footer>© 2026 RawEdge. 18+; 21+ where required.</footer></body></html>\n';
}
function indexPage(items) {
  const cards=items.map(a=>'<article class="casino-card"><span class="eyebrow">'+escapeHtml(a.published_at.slice(0,10))+' · GUIDE</span><h2>'+escapeHtml(a.title)+'</h2><p>'+escapeHtml(a.summary)+'</p><a class="btn small primary" href="articles/'+a.slug+'.html">READ ARTICLE →</a></article>').join('\n');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Latest Casino Education | RawEdge</title>'
    +'<meta name="description" content="Practical independent guides about casino bonus math, payouts, eligibility and player protections."><link rel="canonical" href="'+domain+'/insights.html"><link rel="stylesheet" href="style.css">'
    +GA+'<style>main{max-width:1180px;margin:auto;padding:40px 20px 100px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(275px,1fr));gap:18px}.cards h2{font-size:23px;line-height:1.25}.cards p{color:#c1d4cc;min-height:83px}</style></head><body>'
    +'<div class="topbar"><span>THE REVIEWS GAMBLERS WANT</span><span>RESEARCH · NOT PAID RANKINGS</span></div><header class="header"><a class="brand" href="index.html"><span class="logo">R</span><span>RAW<span>EDGE</span><small>CASINO REVIEWS</small></span></a><nav><a href="index.html">Home</a><a href="guides.html">Guides</a><a href="receipt-wall.html">Receipts</a></nav></header>'
    +'<main><section class="page-hero"><span class="eyebrow">THE RAWEDGE RESEARCH DESK</span><h1>THE FACTS.<br><em>WITHOUT THE SPIN.</em></h1><p>Independent education published from an editorially approved queue.</p></section>'
    +'<section class="cards">'+(cards||'<p>Our next researched guide is coming soon.</p>')+'</section></main><footer>© 2026 RawEdge · 18+ · <a href="responsible-gambling.html">Play responsibly</a></footer></body></html>\n';
}
const now = new Date(process.env.GROWTH_NOW || Date.now());
if(Number.isNaN(now.getTime())) throw new Error('Invalid GROWTH_NOW');
const manifest=get(publishedFile,[]);
if(!Array.isArray(manifest))throw new Error('Invalid published manifest');
const seen=new Set(manifest.map(a=>a.slug));
const limit=Math.max(0,Math.min(25,Number(process.env.MAX_POSTS_PER_RUN || '3')));
let count=0;
for(const name of fs.existsSync(queue)?fs.readdirSync(queue).filter(p=>p.endsWith('.json')).sort():[]) {
  const file=path.join(queue,name), a=get(file,null);
  if(!a||a.brand!=='rawedge'||a.status!=='approved'||!slugOK(a.slug)||seen.has(a.slug))continue;
  const due=new Date(a.publish_at);
  if(Number.isNaN(due.getTime())||due>now)continue;
  if(!a.editorial_approved || !a.source_notes || a.source_notes.length<15 || !a.title || a.title.length<20 || !a.summary || a.summary.length<55 || !a.body || a.body.length<450)continue;
  if(count>=limit)break;
  const item={slug:a.slug,title:a.title,summary:a.summary,body:a.body,published_at:now.toISOString()};
  put(path.join(articleDir,a.slug+'.html'),articlePage(item));
  manifest.push(item);
  seen.add(a.slug);count++;
  put(file, JSON.stringify({...a,status:'published',published_at:item.published_at},null,2)+'\n');
}
manifest.sort((a,b)=>b.published_at.localeCompare(a.published_at));
put(publishedFile,JSON.stringify(manifest,null,2)+'\n');
if(manifest.length)put(path.join(root,'insights.html'),indexPage(manifest));
const sitemap=path.join(root,'sitemap.xml');
if(fs.existsSync(sitemap)){
 let old=fs.readFileSync(sitemap,'utf8');
 const base=old.replace(/<\/urlset>\s*$/,'').replace(/\s*<url><loc>https:\/\/www\.rawedgecasinoreviews\.com\/insights\.html<\/loc>.*?<\/url>/gs,'').replace(/\s*<url><loc>https:\/\/www\.rawedgecasinoreviews\.com\/articles\/[^<]+<\/loc>.*?<\/url>/gs,'');
 if(base!==old && old.includes('</urlset>')){
   let add='\n  <url><loc>'+domain+'/insights.html</loc></url>';
   for(const item of manifest)add+='\n  <url><loc>'+domain+'/articles/'+item.slug+'.html</loc><lastmod>'+item.published_at.slice(0,10)+'</lastmod></url>';
   put(sitemap,base+add+'\n</urlset>\n');
 }
}
console.log(JSON.stringify({published:count,total:manifest.length,at:now.toISOString()}));
