/* RawEdge sponsored casino showcase loader.
  Editorial pages remain independent. Ads render only when a sponsorship is explicitly active,
  date-bounded, and a verified advertisement creative and destination are present.
  This file is intentionally free of analytics beacons and invented advertiser claims. */
(async function(){
 const box=document.querySelector('[data-showcase-id]'); if(!box) return;
 const slug=box.getAttribute('data-showcase-id');
 const label=box.querySelector('.re-showcase-label');
 const title=box.querySelector('.re-showcase-title');
 const text=box.querySelector('.re-showcase-text');
 const action=box.querySelector('.re-showcase-cta');
 const disclosure=box.querySelector('.re-showcase-disclosure');
 const img=box.querySelector('.re-showcase-creative');
 try{
  const response=await fetch('./showcase-sponsors.json',{cache:'no-store'});
  if(!response.ok)return;
  const data=await response.json(),s=data&&data[slug];
  if(!s||s.active!==true||!s.start||!s.end||!s.headline||!s.destination||!s.creative)return;
  const now=new Date(),start=new Date(s.start+'T00:00:00Z'),end=new Date(s.end+'T23:59:59Z');
  if(!(start<=now&&now<=end))return;
  const url=new URL(s.destination),creative=new URL(s.creative,location.href);
  if(url.protocol!=='https:'||creative.origin!==location.origin)return;
  if(!/^(?:png|jpg|jpeg|webp)$/i.test(creative.pathname.split('.').pop()))return;
  box.dataset.sponsored='true';label.textContent='PAID ADVERTISEMENT · PREMIUM CASINO SHOWCASE';
  title.textContent=s.headline;text.textContent=s.description||'See the operator’s current terms and eligibility before registering.';
  action.href=url.href;action.textContent=s.cta||'VISIT ADVERTISER →';
  action.target='_blank';action.rel='sponsored nofollow noopener noreferrer';action.hidden=false;
  img.src=creative.href;img.alt=s.creative_alt||'Casino advertising artwork';
  disclosure.textContent='PAID ADVERTISEMENT — This casino purchased promotional space. RawEdge’s independent review and editorial ranking are not for sale. Availability and eligibility vary by location.';
 }catch(_e){/* an absent/invalid campaign should never look like a paid endorsement */}
})();