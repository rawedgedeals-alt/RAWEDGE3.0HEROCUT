/* RawEdge approved soundtrack player. Audio asset: RawEdge_The_Chase_V4_With_Whispers.wav (upload to site root). Playback requires a user tap. */
(()=>{
 const audio=new Audio('rawedge-the-chase-v4.wav');audio.loop=true;audio.preload='none';audio.volume=.65;
 const button=document.createElement('button');button.type='button';button.textContent='♫ PLAY RAWEDGE';button.setAttribute('aria-label','Play RawEdge soundtrack');button.style.cssText='position:fixed;right:16px;bottom:20px;z-index:9999;border:1px solid #37ffac;border-radius:40px;background:#071419;color:#76ffbe;padding:12px 17px;font:700 12px system-ui;letter-spacing:.08em;box-shadow:0 0 22px #00ed9a55;cursor:pointer';document.body.append(button);
 const label=()=>{button.textContent=audio.paused?'♫ PLAY RAWEDGE':'♫ SOUND ON';button.setAttribute('aria-label',audio.paused?'Play RawEdge soundtrack':'Pause RawEdge soundtrack')};
 button.addEventListener('click',async()=>{if(!audio.paused){audio.pause();label();return}try{await audio.play();label()}catch(e){button.textContent='♫ AUDIO COMING SOON';button.setAttribute('aria-label','Soundtrack file not yet available')}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){audio.pause();label()}});
 audio.addEventListener('ended',label);audio.addEventListener('error',()=>{button.textContent='♫ AUDIO COMING SOON'});
})();
