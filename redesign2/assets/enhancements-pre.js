(() => {
  let suppressTap = false;
  document.addEventListener('pointerdown',(event)=>{
    suppressTap = Boolean(event.target.closest?.('.portrait-name,.portrait-cue-hit,.portrait-close'));
    window.setTimeout(()=>{ suppressTap = false; },0);
  },{capture:true});

  const sounds = window.FGSounds;
  if (!sounds || typeof sounds.play !== 'function') return;
  const originalPlay = sounds.play.bind(sounds);
  sounds.play = (name) => {
    if (name === 'tap' && suppressTap) return;
    originalPlay(name);
  };
})();
