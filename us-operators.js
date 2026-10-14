/* US-regulated operator research listings; no unverified affiliate links. */
(async function(){
 const select=document.getElementById('us-state');
 const output=document.getElementById('us-operators');
 if(!select||!output)return;
 let data;
 try {const response=await fetch('us-operators.json',{cache:'no-cache'});if(!response.ok)throw Error('Database unavailable');data=await response.json()}
 catch {output.textContent='Operator database temporarily unavailable. Use the regulator links above.';return}
 const heading=document.createElement('h2');heading.textContent='Regulated online casino research';
 const intro=document.createElement('p');intro.className='us-lead';intro.textContent='Operator listings are based on published regulator information. They are not affiliate offers, tested payouts, or guaranteed real-time eligibility.';
 const grid=document.createElement('div');grid.className='us-grid';
 output.append(heading,intro,grid);
 function render(){
  const state=select.value;grid.replaceChildren();
  if(!state){const p=document.createElement('p');p.textContent='Select a state to view available research listings.';grid.append(p);return}
  const status=data.states[state]?.status||'not_confirmed';
  if(status!=='regulated_live'){
   const p=document.createElement('p');
   p.textContent=status==='authorized_not_launched'?'Maine has authorized online casino gaming but no regulated real-money casino launch has been confirmed.':status==='poker_only'?'Nevada regulates online poker; do not confuse that with approval for full online casino gaming.':'No regulated real-money online casino market is confirmed in this database for this state. This does not determine sweepstakes legality.';
   grid.append(p);return
  }
  const list=data.operators.filter(o=>o.available_states.includes(state));
  if(!list.length){const p=document.createElement('p');p.textContent='No operators are recorded for this state yet. Check the official regulator.';grid.append(p);return}
  for(const o of list){
   const card=document.createElement('article');card.className='us-card';
   const h=document.createElement('h3');h.textContent=o.name;
   const badge=document.createElement('span');badge.className='us-badge';badge.textContent='Regulator-listed · not RawEdge tested';
   const p=document.createElement('p');p.textContent='No verified RawEdge payout test or affiliate offer is currently recorded.';
   const a=document.createElement('a');a.href=data.states[state].source_url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Verify with state regulator ↗';
   card.append(h,badge,p,a);grid.append(card)
  }
 }
 select.addEventListener('change',render);render();
})();
