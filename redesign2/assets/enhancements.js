(() => {
  const root = document.documentElement;
  const Sounds = window.FGSounds || {playPortraitOpen(){},playPortraitClose(){}};
  const Haptics = { trigger(input,options){ try { window.FGHaptics?.trigger(input,options); } catch {} } };
  const toast = document.getElementById('portraitToast');
  const card = document.getElementById('portraitCard');
  const close = document.getElementById('portraitClose');
  let guardUntil = 0;
  let guardTimer = 0;

  /* Root-site icon geometry, applied before interaction. */
  const backIcon = '<svg class="back-arrow-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor" stroke="currentColor" stroke-width="6.4" stroke-linejoin="round" aria-hidden="true"><path d="M232,112a64.07,64.07,0,0,1-64,64H51.31l34.35,34.34a8,8,0,0,1-11.32,11.32l-48-48a8,8,0,0,1,0-11.32l48-48a8,8,0,0,1,11.32,11.32L51.31,160H168a48,48,0,0,0,0-96H80a8,8,0,0,1,0-16h88A64.07,64.07,0,0,1,232,112Z"></path></svg>';
  document.querySelectorAll('.section-home').forEach((button)=>{ button.innerHTML = backIcon; });
  if (close) close.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path></svg>';

  const makeCue = (name) => {
    const hit = document.createElement('button');
    hit.type = 'button';
    hit.className = 'portrait-cue-hit';
    hit.setAttribute('aria-controls','portraitToast');
    hit.setAttribute('aria-expanded',name.getAttribute('aria-expanded') || 'false');
    hit.setAttribute('aria-label',root.lang === 'es' ? 'Mostrar retrato de Francisco' : 'Show Francisco’s portrait');
    hit.innerHTML = '<svg class="portrait-cue" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false"><path d="M205.66,85.66a8,8,0,0,1-11.32,0L160,51.31V128A104.11,104.11,0,0,1,56,232a8,8,0,0,1,0-16,88.1,88.1,0,0,0,88-88V51.31L109.66,85.66A8,8,0,0,1,98.34,74.34l48-48a8,8,0,0,1,11.32,0l48,48A8,8,0,0,1,205.66,85.66Z"></path></svg>';
    hit.addEventListener('click',(event)=>{
      event.preventDefault();
      event.stopPropagation();
      name.click();
    });
    return hit;
  };

  const enhancePortraitNames = () => {
    document.querySelectorAll('.portrait-name').forEach((name) => {
      name.style.fontWeight = '630';
      if (name.parentElement?.classList.contains('portrait-trigger-group')) return;
      const group = document.createElement('span');
      group.className = 'portrait-trigger-group';
      name.parentNode?.insertBefore(group,name);
      group.append(name,makeCue(name));
    });
  };

  const syncCueState = () => {
    document.querySelectorAll('.portrait-trigger-group').forEach((group) => {
      const name = group.querySelector('.portrait-name');
      const cue = group.querySelector('.portrait-cue-hit');
      if (!name || !cue) return;
      cue.setAttribute('aria-expanded',name.getAttribute('aria-expanded') || 'false');
      cue.setAttribute('aria-label',root.lang === 'es'
        ? (name.getAttribute('aria-expanded') === 'true' ? 'Ocultar retrato de Francisco' : 'Mostrar retrato de Francisco')
        : (name.getAttribute('aria-expanded') === 'true' ? 'Hide Francisco’s portrait' : 'Show Francisco’s portrait'));
    });
  };

  enhancePortraitNames();
  syncCueState();

  const heroObserver = new MutationObserver(() => {
    enhancePortraitNames();
    syncCueState();
  });
  document.querySelectorAll('.hero-copy').forEach((copy)=>heroObserver.observe(copy,{childList:true,subtree:true}));

  /* Suppress Safari's delayed synthetic follow-up click for 420 ms after opening,
     without changing the known-good radial-menu event path. */
  let toastWasOpen = Boolean(toast?.classList.contains('is-open'));
  const toastObserver = toast ? new MutationObserver(() => {
    syncCueState();
    const isOpen = toast.classList.contains('is-open');
    if (isOpen && !toastWasOpen) {
      guardUntil = performance.now() + 420;
      toast.classList.add('is-opening-guard');
      window.clearTimeout(guardTimer);
      guardTimer = window.setTimeout(()=>toast.classList.remove('is-opening-guard'),420);
    }
    toastWasOpen = isOpen;
  }) : null;
  toastObserver?.observe(toast,{attributes:true,attributeFilter:['class']});

  document.addEventListener('click',(event)=>{
    if (performance.now() >= guardUntil) return;
    if (event.target.closest?.('.portrait-name,.portrait-cue-hit')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  },{capture:true});

  /* Root portrait transition sounds + haptics. Runs before /redesign's bubble handler. */
  document.addEventListener('click',(event)=>{
    const trigger = event.target.closest?.('.portrait-name');
    if (trigger) {
      const open = toast?.classList.contains('is-open');
      if (open) { Sounds.playPortraitClose?.(); Haptics.trigger('light'); }
      else { Sounds.playPortraitOpen?.(); Haptics.trigger('medium'); }
      return;
    }
    if (event.target.closest?.('#portraitClose')) {
      Sounds.playPortraitClose?.(); Haptics.trigger('light');
    }
  },{capture:true});

  /* Clicking the photograph closes it, as on the root site. */
  card?.addEventListener('click',(event)=>{
    if (event.target.closest?.('#portraitClose') || performance.now() < guardUntil) return;
    event.preventDefault();
    event.stopPropagation();
    close?.click();
  });

  /* Haptics added by the root version. They are side effects only and do not
     participate in the radial menu's state machine. */
  const gooMain = document.getElementById('gooeyMain');
  const gooAnchor = document.getElementById('gooeyMenu');
  gooMain?.addEventListener('click',()=>Haptics.trigger(gooAnchor?.dataset.open === 'true' ? 'medium' : 'light'));
  document.getElementById('gooeySettings')?.addEventListener('click',()=>Haptics.trigger('medium'));
  document.querySelectorAll('[data-theme-choice],[data-language-choice],[data-sound-choice],[data-view-target]').forEach((el)=>{
    if (el.id === 'gooeySettings') return;
    el.addEventListener('click',()=>Haptics.trigger('selection'));
  });
  document.querySelectorAll('[data-close-dialog]').forEach((el)=>el.addEventListener('click',()=>Haptics.trigger('light')));
  document.getElementById('messageTrigger')?.addEventListener('click',()=>Haptics.trigger('medium'));
  document.getElementById('cvDownloadLink')?.addEventListener('click',()=>Haptics.trigger('medium'));

  const observeStatus = (id) => {
    const node=document.getElementById(id); if(!node) return;
    let previous='';
    new MutationObserver(()=>{
      const text=(node.textContent||'').trim();
      if(!text || text===previous) return;
      previous=text;
      const success=/sent|enviado|thank|gracias/i.test(text);
      Haptics.trigger(success?'success':'error');
    }).observe(node,{childList:true,subtree:true,characterData:true});
  };
  observeStatus('formStatus');
  observeStatus('cvStatus');
})();
