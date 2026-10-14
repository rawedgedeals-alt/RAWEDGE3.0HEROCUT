(async function(){
const categories=document.querySelector('#bonus-categories'),offers=document.querySelector('#bonus-offers'),partners=document.querySelector('#bonus-partners');
function element(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n}
function card(title,description,label){const a=element('article','hunter-card');a.append(element('div','hunter-label',label),element('h3','',title),element('p','',description));return a}
function safe(url){try{const u=new URL(url);return u.protocol==='https:'?u.href:null}catch{return null}}
try{
 const [r,c]=await Promise.all([fetch('bonus-offers.json',{cache:'no-cache'}),fetch('casinos.json',{cache:'no-cache'})]);if(!r.ok||!c.ok)throw Error('Unavailable');
 const data=await r.json(),casino=await c.json();
 categories.replaceChildren();
 for(const x of data.categories||[])categories.append(card(x.name,x.description,'CATEGORY · AWAITING VERIFIED OFFERS'));
 offers.replaceChildren();
 const verified=(data.offers||[]).filter(o=>o.verified_at&&o.source_url&&o.eligible_states&&o.bonus_terms&&o.operator_id);
 if(!verified.length)offers.append(element('p','','No independently verified live promotions published yet. We will only display offers after checking the operator terms, eligible locations and expiry.'));
 for(const o of verified){const item=card(o.title,o.bonus_terms,'VERIFIED OFFER · '+o.verified_at);const a=element('a','','Review official terms →');const u=safe(o.source_url);if(u){a.href=u;a.target='_blank';a.rel='noopener noreferrer';item.append(a)}offers.append(item)}
 partners.replaceChildren();
 for(const x of casino.casinos||[]){const item=card(x.name,x.category||'Online casino','AFFILIATE PARTNER · PROMOTIONS UNVERIFIED');const u=safe(x.affiliate_url);if(u){const a=element('a','','Visit partner website →');a.href=u;a.target='_blank';a.rel='nofollow sponsored noopener noreferrer';item.append(a)}partners.append(item)}
}catch(e){categories.textContent='Bonus categories temporarily unavailable.';offers.textContent='Verified offer data unavailable.';partners.textContent='Partner listings unavailable.'}
})();