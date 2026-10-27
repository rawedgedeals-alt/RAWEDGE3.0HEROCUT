function subscribe(e){e.preventDefault();const f=e.target;const btn=f.querySelector("button");btn.textContent="Subscribed ✓";btn.disabled=true;f.querySelector("input").value="";}function filterCards(tag,button){document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));button.classList.add("active");document.querySelectorAll(".rank-card").forEach(card=>{card.style.display=tag==="all"||card.dataset.tags.split(" ").includes(tag)?"grid":"none"});}document.querySelector(".menu")?.addEventListener("click",()=>{const nav=document.querySelector(".header nav");if(!nav)return;nav.style.display=nav.style.display==="flex"?"none":"flex";nav.style.position="absolute";nav.style.top="78px";nav.style.left="0";nav.style.right="0";nav.style.padding="20px";nav.style.background="#070b0f";nav.style.flexDirection="column";});

/* Render reviewed casino data when available; retain static cards if unavailable. */
(async function loadCasinoCards(){
  const grid=document.querySelector(".casino-grid");
  if(!grid)return;
  try{
    const response=await fetch("casinos.json",{cache:"no-cache"});
    if(!response.ok)throw new Error("Casino data unavailable");
    const data=await response.json();
    if(!Array.isArray(data.casinos)||!data.casinos.length)return;
    const fragment=document.createDocumentFragment();
    const safeUrl=url=>{try{const parsed=new URL(url);return parsed.protocol==="https:"?parsed.href:null}catch{return null}};
    for(const item of [...data.casinos].sort((a,b)=>(a.listing_order??999)-(b.listing_order??999))){
      if(!item.name||!Number.isInteger(item.listing_order))continue;
      const article=document.createElement("article");
      article.className="casino-card";
      const add=(tag,className,value,parent=article)=>{
        const node=document.createElement(tag);
        if(className)node.className=className;
        node.textContent=value;
        parent.append(node);
        return node;
      };
      add("div","rank","—");
      add("div","casino-logo","◆");
      add("h3","",item.name);
      add("p","muted",item.category||"Casino");
      const rating=add("div","rating","");
      add("b","","—",rating);
      add("span","","RESEARCH LIST · NOT SCORED",rating);
      const chips=add("div","chips","");
      for(const tag of (Array.isArray(item.tags)?item.tags:[]).slice(0,2))add("span","",tag,chips);
      const url=safeUrl(item.affiliate_url);
      if(url){
        const link=add("a","btn small ghost","Visit operator (affiliate) →");
        link.href=url;link.target="_blank";link.rel="nofollow sponsored noopener noreferrer";
      }
      fragment.append(article);
    }
    if(fragment.childElementCount)grid.replaceChildren(fragment);
  }catch(error){console.warn("Showing static casino cards:",error)}
})();
