(() => {
  const root = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const Sounds = window.FGSounds || { play(){}, togglePortraitTransition(){}, prime(){}, setEnabled(){}, get enabled(){ return false; } };
  const Haptics = { trigger(input,options){ try { window.FGHaptics?.trigger(input,options); } catch {} } };

  const storageGet = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
  const storageSet = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  const storageRemove = (key) => { try { localStorage.removeItem(key); } catch {} };

  const langKey = 'fg-language-v3';
  const themeKey = 'fg-theme-v2';
  const soundKey = 'fg-sounds-v1';
  const paletteKey = 'fg-debug-palette-v6';
  const typeKey = 'fg-debug-type-v6';
  const annotationsKey = 'fg-debug-annotations-v2';

  /* ---------- palette + theme ---------- */
  const paletteDefaults = { bg:'#fdfdfc', text:'#22223b', accent:'#4577b5' };
  const darkPalette = { bg:'#2c292f', text:'#fdfdfc', accent:'#a0b9d9' };
  let currentPalette = (() => {
    try {
      const saved = JSON.parse(storageGet(paletteKey) || 'null');
      return saved && saved.bg && saved.text && saved.accent ? saved : {...paletteDefaults};
    } catch { return {...paletteDefaults}; }
  })();
  let currentTheme = storageGet(themeKey) === 'dark' ? 'dark' : 'light';

  const activePalette = () => currentTheme === 'dark' ? darkPalette : currentPalette;
  const actualThemeColor = () => activePalette().bg;

  const renderPalette = () => {
    const active = activePalette();
    root.style.setProperty('--bg', active.bg);
    root.style.setProperty('--text', active.text);
    root.style.setProperty('--accent', active.accent);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', actualThemeColor());
  };

  const applyPalette = (next, persist = true) => {
    currentPalette = {...currentPalette, ...next};
    renderPalette();
    if (persist) storageSet(paletteKey, JSON.stringify(currentPalette));
  };

  const updateThemeControls = () => {
    document.querySelectorAll('[data-theme-choice]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === currentTheme));
    });
  };

  const applyTheme = (theme, persist = true, animate = true) => {
    const next = theme === 'dark' ? 'dark' : 'light';
    if (next === currentTheme && root.dataset.theme === next) {
      updateThemeControls();
      return false;
    }
    currentTheme = next;
    root.dataset.theme = next;
    if (animate && !reduceMotion.matches) {
      root.dataset.themeTransitioning = 'true';
      window.setTimeout(() => delete root.dataset.themeTransitioning, 260);
    }
    renderPalette();
    updateThemeControls();
    if (persist) storageSet(themeKey, next);
    return true;
  };

  root.dataset.theme = currentTheme;
  renderPalette();
  updateThemeControls();

  /* ---------- interface sounds ---------- */
  let soundsEnabled = storageGet(soundKey) !== 'off';
  Sounds.setEnabled(soundsEnabled);

  const updateSoundControls = () => {
    document.querySelectorAll('[data-sound-choice]').forEach((button) => {
      button.setAttribute('aria-pressed', String((button.dataset.soundChoice === 'on') === soundsEnabled));
    });
  };
  updateSoundControls();

  document.addEventListener('pointerdown', (event) => {
    Sounds.prime();
    if (event.button !== 0) return;
    const control = event.target.closest?.('button:not(:disabled),a[href]');
    if (!control || control.closest('.segmented-control') || control.closest('.portrait-name,.portrait-cue-hit,.portrait-close')) return;
    Sounds.play('tap');
  }, {capture:true});
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') Sounds.prime();
  }, {capture:true});

  if (finePointer.matches) {
    const hoverSelector = '.t-goo-main,.t-goo-item,.section-home,.segmented-control button,.contact-actions a,.contact-actions button,.modal-close,.eye-button,.submit-button';
    document.addEventListener('pointerover', (event) => {
      const target = event.target.closest?.(hoverSelector);
      if (!target || target.contains(event.relatedTarget)) return;
      Sounds.play('hover');
    });
  }

  /* ---------- language ---------- */
  let onLanguageChanged = () => {};

  const getBrowserLanguage = () => {
    const langs = Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language || 'en'];
    return langs.some((value) => String(value).toLowerCase().startsWith('es')) ? 'es' : 'en';
  };

  const updateLanguageControls = () => {
    document.querySelectorAll('[data-language-choice]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.languageChoice === root.lang));
    });
  };

  const applyLanguage = (language, persist = true) => {
    const lang = language === 'es' ? 'es' : 'en';
    const changed = root.lang !== lang;
    root.lang = lang;
    document.querySelectorAll('[data-en][data-es]').forEach((node) => {
      node.textContent = lang === 'es' ? node.dataset.es : node.dataset.en;
    });
    document.querySelectorAll('[data-label-en][data-label-es]').forEach((item) => {
      const label = lang === 'es' ? item.dataset.labelEs : item.dataset.labelEn;
      if (label) item.setAttribute('aria-label', label);
    });
    document.getElementById('gooeyMain')?.setAttribute('aria-label', lang === 'es' ? 'Abrir menú' : 'Open menu');
    document.querySelectorAll('.section-home').forEach((button) => button.setAttribute('aria-label', lang === 'es' ? 'Volver al inicio' : 'Back to home'));
    document.getElementById('settingsPopover')?.setAttribute('aria-label', lang === 'es' ? 'Ajustes del sitio' : 'Site settings');
    document.querySelector('[data-theme-choice]')?.parentElement?.setAttribute('aria-label', lang === 'es' ? 'Tema' : 'Theme');
    document.querySelector('[data-language-choice]')?.parentElement?.setAttribute('aria-label', lang === 'es' ? 'Idioma' : 'Language');
    document.querySelector('[data-sound-choice]')?.parentElement?.setAttribute('aria-label', lang === 'es' ? 'Sonidos de interfaz' : 'Interface sounds');
    updateLanguageControls();
    document.querySelector('meta[name="description"]')?.setAttribute(
      'content',
      lang === 'es'
        ? 'Francisco Guadarrama, MD — atención oncológica equitativa, sistemas de salud más sólidos y decisiones clínicas de alto valor.'
        : 'Francisco Guadarrama, MD — advancing equitable cancer care through oncology access, stronger health systems, and high-value clinical decisions.'
    );
    if (persist) storageSet(langKey, lang);
    onLanguageChanged(lang);
    return changed;
  };

  const savedLang = storageGet(langKey);
  applyLanguage(savedLang === 'es' || savedLang === 'en' ? savedLang : getBrowserLanguage(), false);

  /* ---------- settings popover ---------- */
  const settingsPopover = document.getElementById('settingsPopover');
  const settingsTrigger = document.getElementById('gooeySettings');
  let settingsOpen = false;

  const openSettings = () => {
    if (!settingsPopover || settingsOpen) return;
    settingsOpen = true;
    settingsPopover.classList.add('is-open');
    settingsPopover.setAttribute('aria-hidden', 'false');
    Haptics.trigger('medium');
    settingsTrigger?.setAttribute('aria-expanded', 'true');
    const active = settingsPopover.querySelector('[aria-pressed="true"]');
    window.setTimeout(() => active?.focus({preventScroll:true}), reduceMotion.matches ? 1 : 80);
  };

  const closeSettings = ({restoreFocus=false} = {}) => {
    if (!settingsPopover || !settingsOpen) return;
    settingsOpen = false;
    settingsPopover.classList.remove('is-open');
    settingsPopover.setAttribute('aria-hidden', 'true');
    settingsTrigger?.setAttribute('aria-expanded', 'false');
    if (restoreFocus) document.getElementById('gooeyMain')?.focus({preventScroll:true});
  };

  document.querySelectorAll('[data-theme-choice]').forEach((button) => {
    button.addEventListener('click', () => {
      const changed = applyTheme(button.dataset.themeChoice);
      if (changed) { Sounds.play('state'); Haptics.trigger('selection'); }
    });
  });
  document.querySelectorAll('[data-language-choice]').forEach((button) => {
    button.addEventListener('click', () => {
      const changed = applyLanguage(button.dataset.languageChoice);
      if (changed) { Sounds.play('state'); Haptics.trigger('selection'); }
    });
  });
  document.querySelectorAll('[data-sound-choice]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = button.dataset.soundChoice === 'on';
      if (next === soundsEnabled) return;
      if (!next) Sounds.play('tap');
      soundsEnabled = next;
      storageSet(soundKey, next ? 'on' : 'off');
      Sounds.setEnabled(next);
      updateSoundControls();
      if (next) Sounds.play('state');
      Haptics.trigger('selection');
    });
  });

  document.addEventListener('pointerdown', (event) => {
    if (!settingsOpen) return;
    if (settingsPopover.contains(event.target) || settingsTrigger?.contains(event.target)) return;
    closeSettings();
  });

  /* ---------- Transitions.dev Gooey plus menu ---------- */
  const gooAnchor = document.getElementById('gooeyMenu');
  const gooMain = document.getElementById('gooeyMain');
  const gooItems = Array.from(document.querySelectorAll('.t-goo-item'));
  const gooBlur = document.getElementById('tGooBlur');
  const gooMatrix = document.getElementById('tGooMatrix');
  let currentView = root.dataset.view || 'home';
  let menuOpen = false;
  let anticipationTimer = null;

  const readNum = (name,fallback) => {
    const raw = getComputedStyle(root).getPropertyValue(name).trim();
    if (!raw) return fallback;
    if (raw.endsWith('ms')) return parseFloat(raw);
    if (raw.endsWith('s') && !raw.endsWith('ms')) return parseFloat(raw)*1000;
    const n = parseFloat(raw); return Number.isFinite(n) ? n : fallback;
  };
  const applyGooKnobs = () => {
    const blur = readNum('--goo-blur',6);
    const slope = readNum('--goo-contrast',18);
    const intercept = -((slope*7)/18);
    gooBlur?.setAttribute('stdDeviation',String(blur));
    gooMatrix?.setAttribute('values',`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${slope} ${intercept}`);
  };
  const updateRadialVisibility = () => {};
  const placeRadialItems = () => {};
  const setMenuOpen = (next,{restoreFocus=false}={}) => {
    if (!gooAnchor || !gooMain || menuOpen === next) return;
    menuOpen = next; applyGooKnobs();
    gooAnchor.dataset.open = next ? 'true' : 'false';
    gooMain.setAttribute('aria-expanded',String(next));
    gooMain.setAttribute('aria-label',root.lang === 'es' ? (next?'Cerrar menú':'Abrir menú') : (next?'Close menu':'Open menu'));
    window.clearTimeout(anticipationTimer);
    if (!next) {
      gooAnchor.classList.add('is-anticipating');
      anticipationTimer = window.setTimeout(()=>gooAnchor.classList.remove('is-anticipating'),readNum('--goo-anticip-dur',700)+50);
      if (restoreFocus) window.setTimeout(()=>gooMain.focus({preventScroll:true}),reduceMotion.matches?1:80);
    } else gooAnchor.classList.remove('is-anticipating');
    gooItems.forEach((item)=>item.tabIndex=next?0:-1);
  };
  const openMenu = () => { closeSettings(); setMenuOpen(true); };
  const closeMenu = (options={}) => setMenuOpen(false,options);
  // Safari can lose/delay the synthetic click for a fixed control that sits
  // outside a zero-height header. Handle touch/pen on pointerup, then ignore
  // the follow-up synthetic click. Mouse and keyboard continue to use click.
  let lastGooPointerActivation = -Infinity;
  const activateGooMain = (event) => {
    event?.stopPropagation();
    const opening = !menuOpen;
    opening ? openMenu() : closeMenu();
    Haptics.trigger(opening ? 'medium' : 'light');
  };
  gooMain?.addEventListener('pointerup',(event)=>{
    if (event.isPrimary === false || event.pointerType === 'mouse') return;
    event.preventDefault();
    event.stopPropagation();
    lastGooPointerActivation = performance.now();
    activateGooMain(event);
  },{passive:false});
  gooMain?.addEventListener('click',(event)=>{
    if (performance.now() - lastGooPointerActivation < 700) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    activateGooMain(event);
  });
  document.addEventListener('click',(event)=>{if(menuOpen && gooAnchor && !gooAnchor.contains(event.target)) closeMenu();});
  settingsTrigger?.addEventListener('click',()=>{closeMenu();window.setTimeout(openSettings,reduceMotion.matches?1:105);});
  gooItems.forEach((item)=>item.addEventListener('keydown',(event)=>{
    if(!menuOpen) return;
    if(event.key==='Escape'){event.preventDefault();closeMenu({restoreFocus:true});return;}
    const nextKey=event.key==='ArrowDown'||event.key==='ArrowRight';
    const prevKey=event.key==='ArrowUp'||event.key==='ArrowLeft';
    if(!nextKey&&!prevKey)return;
    event.preventDefault(); const i=gooItems.indexOf(item); gooItems[(i+(nextKey?1:-1)+gooItems.length)%gooItems.length]?.focus({preventScroll:true});
  }));
  document.addEventListener('keydown',(event)=>{
    if(event.key!=='Escape')return;
    if(menuOpen){event.preventDefault();closeMenu({restoreFocus:true});}
    else if(settingsOpen){event.preventDefault();closeSettings({restoreFocus:true});}
  });

  /* ---------- view transitions + browser history ---------- */
  let switching = false;
  const getView = (name) => document.getElementById(`view-${name}`);

  const setAnimationIndices = () => {
    document.querySelectorAll('.hero-copy').forEach((copy) => {
      copy.querySelectorAll('p').forEach((paragraph, index) => {
        paragraph.classList.add('t-stagger-line');
        paragraph.style.setProperty('--stagger-index', Math.min(index, 5));
      });
      copy.querySelectorAll('.annotation-decoration').forEach((decoration, index) => decoration.style.setProperty('--annotation-index', index));
    });
    document.querySelectorAll('.content-view').forEach((view) => {
      const lines = [
        view.querySelector('.content-heading h2'),
        ...view.querySelectorAll('.record,.contact-actions>*')
      ].filter(Boolean);
      lines.forEach((item, index) => {
        item.classList.add('t-stagger-line');
        item.style.setProperty('--stagger-index', Math.min(index, 5));
      });
    });
  };

  let enterCleanupTimer = 0;
  const finishRevealClasses = (view) => {
    if (!view) return;
    view.classList.remove('is-entering','is-entering-active');
  };

  const commitView = (nextName) => {
    const current = getView(currentView);
    const next = getView(nextName);
    if (!next || nextName === currentView) return false;

    switching = true;
    window.clearTimeout(enterCleanupTimer);
    finishRevealClasses(current);
    current?.classList.add('is-leaving');

    const swap = () => {
      if (current) {
        current.hidden = true;
        current.classList.remove('is-current','is-leaving');
      }
      next.hidden = false;
      next.scrollTop = 0;
      next.classList.remove('is-leaving','is-entering-active');
      next.classList.add('is-entering');
      currentView = nextName;
      root.dataset.view = nextName;
      updateRadialVisibility();
      placeRadialItems();
      setAnimationIndices();

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          next.classList.add('is-entering-active','is-current');
          if (reduceMotion.matches) {
            finishRevealClasses(next);
            switching = false;
            return;
          }
          /* Interaction is released before the visual reveal finishes;
             cleanup happens after the last capped stagger (500 + 5×40ms). */
          window.setTimeout(() => { switching = false; }, 260);
          enterCleanupTimer = window.setTimeout(() => finishRevealClasses(next), 740);
        });
      });
    };

    window.setTimeout(swap, reduceMotion.matches ? 1 : 200);
    return true;
  };

  const switchView = (nextName, {historyMode='push'} = {}) => {
    if (!getView(nextName) || nextName === currentView || switching) return;
    closeMenu();
    closeSettings();
    if (!commitView(nextName)) return;
    Haptics.trigger('selection');
    if (historyMode === 'push') {
      try { history.pushState({view:nextName}, ''); } catch {}
    }
  };

  document.querySelectorAll('[data-view-target]').forEach((control) => {
    control.addEventListener('click', () => switchView(control.dataset.viewTarget));
  });

  try { history.replaceState({view:currentView}, ''); } catch {}
  window.addEventListener('popstate', (event) => {
    const next = event.state?.view || 'home';
    if (next !== currentView && getView(next)) switchView(next, {historyMode:'none'});
  });

  /* ---------- dialog helpers ---------- */
  const messageDialog = document.getElementById('messageDialog');
  const messageTrigger = document.getElementById('messageTrigger');
  const cvDialog = document.getElementById('cvDialog');
  const cvTrigger = document.getElementById('cvDownloadLink');

  const openDialog = (dialog) => {
    if (!dialog || dialog.open) return;
    closeSettings();
    dialog.showModal();
  };
  const closeDialog = (dialog) => { if (dialog?.open) dialog.close(); };

  document.querySelectorAll('[data-close-dialog]').forEach((button) => {
    button.addEventListener('click', () => {
      closeDialog(button.closest('dialog'));
      Haptics.trigger('light');
    });
  });

  [messageDialog,cvDialog].forEach((dialog) => {
    dialog?.addEventListener('click', (event) => {
      const rect = dialog.getBoundingClientRect();
      const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
      if (outside) closeDialog(dialog);
    });
  });

  /* ---------- contact ---------- */
  const contactForm = document.getElementById('contactForm');
  const msg = document.getElementById('field-msg');
  const name = document.getElementById('field-name');
  const email = document.getElementById('field-email');
  const robot = document.getElementById('not-robot');
  const honeypot = document.getElementById('contact-honeypot');
  const formStatus = document.getElementById('formStatus');
  const submitMessage = document.getElementById('submitMessage');
  let formOpenedAt = 0;

  const contactStrings = {
    en:{fields:'Please fill in all fields.',email:'Please enter a valid e-mail address.',robot:'Please confirm you are not a robot.',trap:'Please review your message before sending.',send:'Error sending. Please try again.',sent:"Message sent · Thank you, I'll reply soon."},
    es:{fields:'Por favor completa todos los campos.',email:'Por favor ingresa una dirección de correo electrónico válida.',robot:'Por favor confirma que no eres un robot.',trap:'Por favor revisa tu mensaje antes de enviar.',send:'Error al enviar. Intenta de nuevo.',sent:'Mensaje enviado · Gracias, te responderé pronto.'}
  };
  const cstr = () => contactStrings[root.lang === 'es' ? 'es' : 'en'];
  const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && email?.checkValidity?.() !== false;
  const contactError = (text, focusTarget) => {
    formStatus.textContent = text;
    Sounds.play('error');
    Haptics.trigger('error');
    focusTarget?.focus?.();
  };

  messageTrigger?.addEventListener('click', () => {
    formOpenedAt = Date.now();
    formStatus.textContent = '';
    openDialog(messageDialog);
    Haptics.trigger('medium');
    window.setTimeout(() => msg?.focus({preventScroll:true}), 70);
  });

  contactForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    formStatus.textContent = '';
    if (!msg.value.trim() || !name.value.trim() || !email.value.trim()) return contactError(cstr().fields);
    if (!validEmail(email.value.trim())) return contactError(cstr().email,email);
    if (!robot.checked) return contactError(cstr().robot,robot);
    if (honeypot.value || Date.now() - formOpenedAt < 3000) return contactError(cstr().trap);

    submitMessage.disabled = true;
    try {
      const payload = new FormData();
      payload.append('name',name.value.trim());
      payload.append('email',email.value.trim());
      payload.append('message',msg.value.trim());
      payload.append('_gotcha','');
      const response = await fetch(contactForm.action,{method:'POST',headers:{Accept:'application/json'},body:payload,mode:'cors'});
      let result = null;
      try { result = await response.json(); } catch {}
      if (!response.ok) {
        const serverText = Array.isArray(result?.errors) ? result.errors.map((item)=>item?.message).filter(Boolean).join(' ') : '';
        const emailRejected = response.status === 422 && /email/i.test(serverText || '');
        if (emailRejected) return contactError(cstr().email,email);
        throw new Error(serverText || `HTTP ${response.status}`);
      }
      formStatus.textContent = cstr().sent;
      Sounds.play('success');
      Haptics.trigger('success');
      contactForm.reset();
      window.setTimeout(() => closeDialog(messageDialog), 950);
    } catch (error) {
      console.warn('Contact form submission failed:',error);
      contactError(cstr().send);
    } finally {
      submitMessage.disabled = false;
    }
  });

  /* ---------- protected CV ---------- */
  const cvForm = document.getElementById('cvForm');
  const cvPassword = document.getElementById('cvPassword');
  const cvSubmit = document.getElementById('cvSubmit');
  const cvStatus = document.getElementById('cvStatus');
  const passwordShell = document.getElementById('passwordShell');
  const eyeButton = document.getElementById('eyeButton');
  const eyePupil = document.querySelector('.eye-pupil');

  const EXPECTED_HASH = '8e0c43cbcfdcf1123f0362790a86cbfa9654e3528f9ce22e4f2924b1c679ad8d';
  const encodedTargets = {
    en:{salt:73,bytes:[33,46,31,12,254,164,128,239,183,133,134,101,113,71,69,58,56,7,26,162,254,193,210,255,128,129,112,113,81,69,104,29,7,29,200,202,242,200,253,215,155,119,127,22,5,116,97,70,9,238,253]},
    es:{salt:131,bytes:[235,224,209,198,180,226,198,213,109,123,88,95,43,1,3,240,242,201,212,232,180,135,148,37,122,95,78,43,43,3,174,215,208,196,134,128,184,142,59,45,65,73,33,108,95,178,167,140,195,160,179]}
  };

  const decodeTarget = (lang) => {
    const target = encodedTargets[lang === 'es' ? 'es' : 'en'];
    return target.bytes.map((byte,index) => String.fromCharCode(byte ^ ((index*17 + target.salt) & 255))).join('');
  };
  const sha256 = async (value) => {
    const bytes = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest('SHA-256',bytes);
    return Array.from(new Uint8Array(hash),(b) => b.toString(16).padStart(2,'0')).join('');
  };

  const resetCv = () => {
    cvPassword.value = '';
    cvPassword.type = 'password';
    cvSubmit.disabled = true;
    cvStatus.textContent = '';
    passwordShell.classList.remove('is-error');
    eyeButton.setAttribute('aria-pressed','false');
    eyeButton.setAttribute('aria-label',root.lang === 'es' ? 'Mostrar contraseña' : 'Show password');
    if (eyePupil) eyePupil.style.transform = 'translate(0px,0px)';
  };

  cvTrigger?.addEventListener('click', () => {
    resetCv();
    openDialog(cvDialog);
    Haptics.trigger('medium');
    window.setTimeout(() => cvPassword.focus({preventScroll:true}),70);
  });
  cvPassword?.addEventListener('input', () => {
    cvSubmit.disabled = cvPassword.value.length === 0;
    cvStatus.textContent = '';
    passwordShell.classList.remove('is-error');
  });
  eyeButton?.addEventListener('click', () => {
    const visible = cvPassword.type === 'password';
    cvPassword.type = visible ? 'text' : 'password';
    eyeButton.setAttribute('aria-pressed',String(visible));
    eyeButton.setAttribute('aria-label',visible ? (root.lang === 'es' ? 'Ocultar contraseña' : 'Hide password') : (root.lang === 'es' ? 'Mostrar contraseña' : 'Show password'));
    cvPassword.focus({preventScroll:true});
  });
  eyeButton?.addEventListener('pointermove', (event) => {
    if (eyeButton.getAttribute('aria-pressed') === 'true' || !eyePupil) return;
    const rect = eyeButton.getBoundingClientRect();
    const dx = ((event.clientX - (rect.left + rect.width/2)) / (rect.width/2)) * 2.7;
    const dy = ((event.clientY - (rect.top + rect.height/2)) / (rect.height/2)) * 2.1;
    eyePupil.style.transform = `translate(${Math.max(-2.7,Math.min(2.7,dx))}px,${Math.max(-2.1,Math.min(2.1,dy))}px)`;
  });
  eyeButton?.addEventListener('pointerleave', () => { if (eyePupil) eyePupil.style.transform = 'translate(0px,0px)'; });

  cvForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!cvPassword.value) return;
    cvSubmit.disabled = true;
    cvStatus.textContent = '';
    try {
      const valid = await sha256(cvPassword.value);
      if (valid !== EXPECTED_HASH) {
        passwordShell.classList.remove('is-error');
        void passwordShell.offsetWidth;
        passwordShell.classList.add('is-error');
        cvStatus.textContent = root.lang === 'es' ? 'Contraseña incorrecta.' : 'Incorrect password.';
        Sounds.play('error');
        Haptics.trigger('error');
        cvPassword.select();
        cvSubmit.disabled = false;
        return;
      }
      Sounds.play('success');
      Haptics.trigger('success');
      const link = document.createElement('a');
      link.href = decodeTarget(root.lang);
      link.download = '';
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      closeDialog(cvDialog);
      resetCv();
    } catch {
      cvStatus.textContent = root.lang === 'es' ? 'No fue posible validar la contraseña.' : 'The password could not be validated.';
      Sounds.play('error');
      Haptics.trigger('error');
      cvSubmit.disabled = false;
    }
  });

  /* ---------- word-by-word intro tuner + annotation renderer ---------- */
  const debugPanel = document.getElementById('debugPanel');
  const debugMode = false;

  const tunerKey = 'fg-debug-tuner-v7';
  const heroCopies = {
    en:document.querySelector('.hero-copy.lang-en'),
    es:document.querySelector('.hero-copy.lang-es')
  };
  const heroTextSources = {
    en:Array.from(heroCopies.en?.querySelectorAll('p') || []).map((p) => p.textContent),
    es:Array.from(heroCopies.es?.querySelectorAll('p') || []).map((p) => p.textContent)
  };

  const annotationDefaults = {
    en:{wavy:'one level upstream',circle:'Mexico’s poorest state',highlight:'high-value care',double:'inferior care'},
    es:{wavy:'atención de alto valor a pesar de las limitaciones',highlight:'clínica en las montañas del estado más pobre de México',underline:'Me niego a aceptar una atención médica inferior como una consecuencia inevitable de la escasez.'}
  };

  const tunedDefaults = {"en":{"weights":{"0:6":350,"0:7":350,"0:8":350,"0:27":350,"0:28":350,"0:29":350,"0:30":350,"0:31":350,"0:32":350,"0:33":350,"0:34":350,"0:35":350,"0:36":350,"1:7":350,"1:8":350,"1:9":350,"1:10":350,"1:11":350,"1:12":350,"1:15":350,"1:16":350,"1:17":350,"1:18":350,"2:0":300,"2:1":300,"2:2":300,"2:3":300,"2:4":300,"2:5":300,"2:6":300,"2:7":300,"2:8":300,"2:9":300,"2:10":300,"2:11":300,"0:9":240,"0:10":240,"0:11":240,"0:12":240,"0:13":240,"0:14":240,"0:15":240,"0:16":240,"0:17":240,"0:18":240,"0:19":240,"0:20":240,"0:21":240,"0:22":240,"0:23":240,"0:24":240,"0:25":240,"0:26":240,"0:3":240,"0:4":240,"0:5":350,"1:0":240,"1:1":240,"1:2":240,"1:3":240,"1:4":240,"1:5":240,"1:6":240,"1:13":240,"1:14":240,"1:19":240,"1:20":240,"1:21":240,"1:22":240,"1:23":240,"1:24":240,"1:25":240,"1:26":240,"1:27":240,"1:28":240,"1:29":240,"1:30":240,"1:31":240,"1:32":240,"1:33":240,"1:34":240,"1:35":240,"1:36":240,"1:37":240,"0:0":240,"0:1":240,"0:2":350},"annotations":[{"p":1,"start":33,"end":37,"style":"wavy","color":null},{"p":2,"start":0,"end":11,"style":"double","color":"#ea1b5c","darkColor":"#ff96ac"},{"p":0,"start":27,"end":36,"style":"wavy","color":null},{"p":0,"start":2,"end":2,"style":"highlight","color":"#ffe14d"},{"p":1,"start":7,"end":12,"style":"highlight","color":"#ffe14d"},{"p":1,"start":15,"end":18,"style":"highlight","color":"#ffe14d"},{"p":0,"start":5,"end":8,"style":"wavy","color":null}]},"es":{"weights":{"0:0":240,"0:1":240,"0:2":350,"0:3":240,"0:4":240,"0:5":240,"0:6":240,"0:7":350,"0:8":350,"0:9":350,"0:10":350,"0:11":350,"0:12":240,"0:13":240,"0:14":240,"0:15":240,"0:16":240,"0:17":240,"0:18":240,"0:19":240,"0:20":240,"0:21":240,"0:22":240,"0:23":240,"0:24":240,"0:25":240,"0:26":240,"0:27":240,"0:28":350,"0:29":350,"0:30":350,"0:31":350,"0:32":350,"0:33":350,"0:34":350,"0:35":350,"0:36":350,"0:37":350,"0:38":350,"0:39":350,"0:40":350,"1:0":240,"1:1":240,"1:2":240,"1:3":240,"1:4":240,"1:5":240,"1:6":240,"1:7":350,"1:8":350,"1:9":350,"1:10":350,"1:11":350,"1:12":350,"1:13":350,"1:14":350,"1:15":350,"1:16":350,"1:17":240,"1:18":240,"1:19":350,"1:20":350,"1:21":350,"1:22":350,"1:23":240,"1:24":240,"1:25":240,"1:26":240,"1:27":240,"1:28":240,"1:29":240,"1:30":240,"1:31":240,"1:32":240,"1:33":240,"1:34":240,"1:35":240,"1:36":240,"1:37":240,"1:38":240,"1:39":240,"1:40":240,"1:41":240,"1:42":240,"1:43":240,"1:44":240,"1:45":240,"1:46":240,"1:47":240,"1:48":240,"1:49":240,"1:50":240,"1:51":240,"1:52":240,"1:53":240,"2:0":300,"2:1":300,"2:2":300,"2:3":300,"2:4":300,"2:5":300,"2:6":300,"2:7":300,"2:8":300,"2:9":300,"2:10":300,"2:11":300,"2:12":300,"2:13":300,"2:14":300},"annotations":[{"p":1,"start":45,"end":53,"style":"wavy","color":null},{"p":2,"start":0,"end":14,"style":"underline","color":"#ea1b5c","darkColor":"#ff96ac"},{"p":0,"start":28,"end":40,"style":"wavy","color":null},{"p":0,"start":7,"end":11,"style":"wavy","color":null},{"p":0,"start":2,"end":2,"style":"highlight","color":"#ffe14d"},{"p":1,"start":7,"end":16,"style":"highlight","color":"#ffe14d"},{"p":1,"start":19,"end":22,"style":"highlight","color":"#ffe14d"}]}};
  const cloneTunedDefaults = () => JSON.parse(JSON.stringify(tunedDefaults));

  const annotationSvg = {
    wavy:'<svg class="annotation-decoration" viewBox="0 0 140 14" fill="none" preserveAspectRatio="none" aria-hidden="true"><path d="M2,6 Q5.5,3 9,6 T17,6 T25,6 T33,6 T41,6 T49,6 T57,6 T65,6 T73,6 T81,6 T89,6 T97,6 T105,6 T113,6 T121,6 T129,6 T137,6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none" filter="url(#hd-rough-soft)"/></svg>',
    underline:'<svg class="annotation-decoration" viewBox="0 0 140 10" fill="none" preserveAspectRatio="none" aria-hidden="true"><path d="M3,6 C40,3 100,3 137,5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none" filter="url(#hd-rough-soft)"/></svg>',
    double:'<svg class="annotation-decoration" viewBox="0 0 140 18" fill="none" preserveAspectRatio="none" aria-hidden="true"><path d="M3,4.5 C40,2 100,2 137,4" stroke="currentColor" stroke-width="2.15" stroke-linecap="round" fill="none"/><path d="M5,14 C42,11 98,12 135,13" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" fill="none" opacity=".78"/></svg>',
    dotted:'<span class="annotation-decoration annotation-dots" aria-hidden="true"></span>',
    circle:'<svg class="annotation-decoration" viewBox="0 0 220 64" fill="none" preserveAspectRatio="none" aria-hidden="true"><path d="M40,40 C20,23 53,7 102,5 C153,3 207,11 211,29 C215,47 167,60 109,60 C59,60 15,53 19,35 C21,27 27,22 37,20" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none" filter="url(#hd-rough)"/><path d="M43,37 C28,25 58,9 105,7 C151,6 199,14 206,29 C212,45 167,57 110,58" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none" opacity=".55" filter="url(#hd-rough-soft)"/></svg>',
    highlight:'<svg class="annotation-decoration" viewBox="0 0 170 26" preserveAspectRatio="none" aria-hidden="true"><path d="M4,17 C2,11 5,7 12,6 C45,2 95,2 138,4 C152,5 164,7 166,13 C167,18 163,21 155,22 C112,24 60,24 16,22 C8,21.5 4,20 4,17 Z" fill="currentColor" filter="url(#hd-rough-soft)"/></svg>',
    arrow:'<svg class="annotation-decoration" viewBox="0 0 150 18" fill="none" preserveAspectRatio="none" aria-hidden="true"><path d="M3,7 C45,3 105,4 140,8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none" filter="url(#hd-rough-soft)"/><path d="M132,3 L142,8 L131,13" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none" filter="url(#hd-rough-soft)"/></svg>',
    bracket:'<svg class="annotation-decoration" viewBox="0 0 160 60" fill="none" preserveAspectRatio="none" aria-hidden="true"><path d="M18,6 C9,7 6,12 6,30 C6,48 9,53 18,54" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none" filter="url(#hd-rough)"/><path d="M142,6 C151,7 154,12 154,30 C154,48 151,53 142,54" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none" filter="url(#hd-rough)"/></svg>',
    box:'<svg class="annotation-decoration" viewBox="0 0 200 64" fill="none" preserveAspectRatio="none" aria-hidden="true"><path d="M12,10 C60,6 140,6 188,10 C193,26 193,40 188,54 C140,58 60,58 12,54 C7,40 7,26 12,10 Z" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none" filter="url(#hd-rough)"/></svg>',
    strikethrough:'<svg class="annotation-decoration" viewBox="0 0 140 10" fill="none" preserveAspectRatio="none" aria-hidden="true"><path d="M3,5 C40,7 100,3 137,5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none" filter="url(#hd-rough-soft)"/></svg>',
    crossout:'<svg class="annotation-decoration" viewBox="0 0 140 40" fill="none" preserveAspectRatio="none" aria-hidden="true"><path d="M4,32 C40,10 96,30 136,8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none" filter="url(#hd-rough)"/><path d="M6,10 C44,30 92,12 134,30" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" opacity=".7" filter="url(#hd-rough-soft)"/></svg>'
  };

  const tokenizeParagraph = (text) => {
    const tokens = [];
    let wordIndex = 0;
    let cursor = 0;
    for (const match of text.matchAll(/\s+|[^\s]+/gu)) {
      const value = match[0];
      const start = match.index ?? cursor;
      const end = start + value.length;
      if (/^\s+$/u.test(value)) tokens.push({type:'space',text:value,start,end});
      else tokens.push({type:'word',text:value,start,end,wordIndex:wordIndex++});
      cursor = end;
    }
    return tokens;
  };

  const phraseWordRange = (lang, paragraphIndex, phrase) => {
    const text = heroTextSources[lang]?.[paragraphIndex] || '';
    const needle = String(phrase || '').trim();
    if (!needle) return null;
    const start = text.toLocaleLowerCase(lang).indexOf(needle.toLocaleLowerCase(lang));
    if (start < 0) return null;
    const end = start + needle.length;
    const words = tokenizeParagraph(text).filter((token) => token.type === 'word' && token.end > start && token.start < end);
    if (!words.length) return null;
    return {p:paragraphIndex,start:words[0].wordIndex,end:words.at(-1).wordIndex};
  };

  const defaultLanguageTuning = (lang, phraseConfig = annotationDefaults[lang]) => {
    const annotations = [];
    for (const [style,phrase] of Object.entries(phraseConfig || {})) {
      for (let pIndex = 0; pIndex < (heroTextSources[lang]?.length || 0); pIndex++) {
        const range = phraseWordRange(lang,pIndex,phrase);
        if (!range) continue;
        annotations.push({...range,style,color:null});
        break;
      }
    }
    return {weights:{},annotations};
  };

  const loadLegacyAnnotations = () => {
    try {
      const saved = JSON.parse(storageGet(annotationsKey) || 'null');
      return saved?.en && saved?.es ? saved : annotationDefaults;
    } catch { return annotationDefaults; }
  };

  const freshTunerState = () => cloneTunedDefaults();

  let tunerState = (() => {
    try {
      const saved = JSON.parse(storageGet(tunerKey) || 'null');
      if (saved?.en?.weights && Array.isArray(saved?.en?.annotations) && saved?.es?.weights && Array.isArray(saved?.es?.annotations)) return saved;
    } catch {}
    return freshTunerState();
  })();

  let selectedWords = new Set();
  let selectionAnchor = null;

  const localWordKey = (pIndex,wordIndex) => `${pIndex}:${wordIndex}`;
  const fullWordKey = (lang,pIndex,wordIndex) => `${lang}:${pIndex}:${wordIndex}`;

  const makePortraitCue = (lang) => {
    const hit = document.createElement('button');
    hit.type = 'button';
    hit.className = 'portrait-cue-hit';
    hit.setAttribute('aria-controls','portraitToast');
    hit.setAttribute('aria-expanded','false');
    hit.setAttribute('aria-label',lang === 'es' ? 'Mostrar retrato de Francisco' : 'Show Francisco’s portrait');

    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('class','portrait-cue');
    svg.setAttribute('viewBox','0 0 256 256');
    svg.setAttribute('fill','currentColor');
    svg.setAttribute('aria-hidden','true');
    svg.setAttribute('focusable','false');
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d','M205.66,85.66a8,8,0,0,1-11.32,0L160,51.31V128A104.11,104.11,0,0,1,56,232a8,8,0,0,1,0-16,88.1,88.1,0,0,0,88-88V51.31L109.66,85.66A8,8,0,0,1,98.34,74.34l48-48a8,8,0,0,1,11.32,0l48,48A8,8,0,0,1,205.66,85.66Z');
    svg.appendChild(path);
    hit.appendChild(svg);
    return hit;
  };

  const makeWord = (lang,pIndex,token,order) => {
    const isPortraitName = token.text.replace(/[.,;:!?¿¡]+$/u,'').toLocaleLowerCase(lang) === 'francisco';
    const span = document.createElement(isPortraitName ? 'button' : 'span');
    const fullKey = fullWordKey(lang,pIndex,token.wordIndex);
    span.className = isPortraitName ? 'tune-word portrait-name' : 'tune-word';
    span.dataset.tuneKey = fullKey;
    span.dataset.tuneParagraph = String(pIndex);
    span.dataset.tuneWord = String(token.wordIndex);
    span.dataset.tuneOrder = String(order);
    span.textContent = token.text;
    if (isPortraitName) {
      span.type = 'button';
      span.style.fontWeight = '630';
      span.setAttribute('aria-controls','portraitToast');
      span.setAttribute('aria-expanded','false');
      span.setAttribute('aria-label',lang === 'es' ? 'Mostrar retrato de Francisco' : 'Show Francisco’s portrait');
      const group = document.createElement('span');
      group.className = 'portrait-trigger-group';
      group.append(span,makePortraitCue(lang));
      span.classList.toggle('is-selected', selectedWords.has(fullKey));
      return group;
    }
    const weight = tunerState[lang]?.weights?.[localWordKey(pIndex,token.wordIndex)];
    if (weight !== undefined) span.style.fontWeight = String(weight);
    span.classList.toggle('is-selected', selectedWords.has(fullKey));
    return span;
  };

  let annotationLayoutFrame = 0;

  const makeAnnotationFragment = (annotation,index) => {
    const fragment = document.createElement('span');
    fragment.className = `annotation-fragment annotation-${annotation.style}`;
    const lightColor = annotation.color || 'var(--accent)';
    const darkColor = annotation.darkColor || lightColor;
    fragment.style.setProperty('--annotation-color-light',lightColor);
    fragment.style.setProperty('--annotation-color-dark',darkColor);
    const template = document.createElement('template');
    template.innerHTML = annotationSvg[annotation.style] || annotationSvg.underline;
    const decoration = template.content.firstElementChild;
    decoration?.style.setProperty('--annotation-index',String(index));
    fragment.appendChild(decoration);
    return fragment;
  };

  const layoutHeroAnnotations = (lang) => {
    const copy = heroCopies[lang];
    if (!copy || copy.getClientRects().length === 0) return;
    const paragraphs = Array.from(copy.querySelectorAll('p'));
    paragraphs.forEach((paragraph,pIndex) => {
      paragraph.querySelectorAll(':scope > .annotation-layer').forEach((layer)=>layer.remove());
      const annotations = (tunerState[lang]?.annotations || []).filter((a)=>a.p===pIndex && annotationSvg[a.style] && Number.isInteger(a.start) && Number.isInteger(a.end) && a.start<=a.end);
      if (!annotations.length) return;
      const paragraphRect=paragraph.getBoundingClientRect(); if(!paragraphRect.width||!paragraphRect.height)return;
      const layer=document.createElement('span');layer.className='annotation-layer';layer.setAttribute('aria-hidden','true');paragraph.appendChild(layer);
      let annotationIndex=0;
      annotations.forEach((annotation)=>{
        const words=[];for(let wi=annotation.start;wi<=annotation.end;wi++){const word=paragraph.querySelector(`.tune-word[data-tune-word="${wi}"]`);if(word)words.push(word)}
        if(!words.length)return;
        const groups=[];
        words.forEach((word)=>{const rect=word.getBoundingClientRect();if(!rect.width||!rect.height)return;const last=groups.at(-1);if(!last||Math.abs(rect.top-last.top)>2.5)groups.push({top:rect.top,bottom:rect.bottom,left:rect.left,right:rect.right});else{last.bottom=Math.max(last.bottom,rect.bottom);last.left=Math.min(last.left,rect.left);last.right=Math.max(last.right,rect.right)}});
        groups.forEach((group)=>{const fragment=makeAnnotationFragment(annotation,annotationIndex++);fragment.style.left=`${group.left-paragraphRect.left}px`;fragment.style.top=`${group.top-paragraphRect.top}px`;fragment.style.width=`${Math.max(1,group.right-group.left)}px`;fragment.style.height=`${Math.max(1,group.bottom-group.top)}px`;layer.appendChild(fragment)});
      });
    });
  };
  const scheduleAnnotationLayout = () => {
    window.cancelAnimationFrame(annotationLayoutFrame);
    annotationLayoutFrame=window.requestAnimationFrame(()=>{layoutHeroAnnotations(root.lang);setAnimationIndices();});
  };
  const renderHero = (lang) => {
    const copy=heroCopies[lang],texts=heroTextSources[lang]; if(!copy||!texts?.length)return;
    const paragraphs=Array.from(copy.querySelectorAll('p'));let globalOrder=0;
    paragraphs.forEach((paragraph,pIndex)=>{const tokens=tokenizeParagraph(texts[pIndex]||'');paragraph.replaceChildren();for(const token of tokens){if(token.type==='space')paragraph.appendChild(document.createTextNode(token.text));else{paragraph.appendChild(makeWord(lang,pIndex,token,globalOrder));globalOrder+=1}}});
    if(lang===root.lang)scheduleAnnotationLayout();
  };
  const renderAllHeroes = () => {renderHero('en');renderHero('es');scheduleAnnotationLayout();};
  renderAllHeroes();
  window.addEventListener('resize',scheduleAnnotationLayout,{passive:true});


  /* ---------- inline portrait: toast open + Transitions.dev tilt + smoky dissolve close ---------- */
  const portraitStage = document.getElementById('portraitStage');
  const portraitToast = document.getElementById('portraitToast');
  const portraitTilt = portraitToast?.querySelector('.t-tilt');
  const portraitCard = document.getElementById('portraitCard');
  const portraitClose = document.getElementById('portraitClose');
  const portraitSmokyCanvas = document.getElementById('portraitSmokyCanvas');
  let portraitOpen = false;

  const syncPortraitTriggers = () => {
    document.querySelectorAll('.portrait-name,.portrait-cue-hit').forEach((trigger) => {
      trigger.setAttribute('aria-expanded',String(portraitOpen));
      trigger.setAttribute('aria-label',root.lang === 'es'
        ? (portraitOpen ? 'Ocultar retrato de Francisco' : 'Mostrar retrato de Francisco')
        : (portraitOpen ? 'Hide Francisco’s portrait' : 'Show Francisco’s portrait'));
    });
    const portraitImage = portraitToast?.querySelector('.portrait-image');
    if (portraitImage) portraitImage.alt = root.lang === 'es' ? 'Retrato de Francisco Guadarrama' : 'Portrait of Francisco Guadarrama';
    portraitClose?.setAttribute('aria-label',root.lang === 'es' ? 'Cerrar retrato' : 'Close portrait');
  };

  const resetPortraitTilt = () => {
    if (portraitTilt) portraitTilt.classList.remove('is-hover');
    if (portraitCard) {
      portraitCard.classList.remove('is-tilting');
      portraitCard.style.setProperty('--tilt-rx','0deg');
      portraitCard.style.setProperty('--tilt-ry','0deg');
    }
  };

  let portraitClosing = false;
  let portraitInteractiveAfter = 0;
  let portraitGuardTimer = 0;
  const portraitCloseAllowed = () => performance.now() >= portraitInteractiveAfter;

  const setPortraitOpen = (open) => {
    const wasOpen = portraitOpen;
    portraitOpen = Boolean(open);
    if (portraitOpen) portraitClosing = false;
    if (portraitOpen && portraitCard) portraitCard.style.visibility = '';
    portraitToast?.classList.toggle('is-open',portraitOpen);
    portraitStage?.setAttribute('aria-hidden',String(!portraitOpen));
    syncPortraitTriggers();
    if (!portraitOpen) {
      resetPortraitTilt();
      portraitToast?.classList.remove('is-opening-guard');
      if (portraitGuardTimer) window.clearTimeout(portraitGuardTimer);
      portraitGuardTimer = 0;
      portraitInteractiveAfter = 0;
    }
    if (portraitOpen && !wasOpen) {
      // Safari can dispatch a delayed synthetic click after the activating tap.
      // Keep the newly-mounted portrait temporarily non-interactive so that
      // follow-up event cannot immediately hit the image and close it again.
      portraitInteractiveAfter = performance.now() + 420;
      portraitToast?.classList.add('is-opening-guard');
      if (portraitGuardTimer) window.clearTimeout(portraitGuardTimer);
      portraitGuardTimer = window.setTimeout(() => {
        portraitToast?.classList.remove('is-opening-guard');
        portraitGuardTimer = 0;
      },420);
      Sounds.togglePortraitTransition();
      Haptics.trigger('medium');
    }
  };

  let portraitDissolveController = null;
  const closePortraitWithDissolve = (force = false) => {
    if (!force && !portraitCloseAllowed()) return;
    if (!portraitOpen || portraitClosing || !portraitStage || !portraitCard || !portraitSmokyCanvas) return;
    portraitClosing = true;
    Sounds.togglePortraitTransition();
    Haptics.trigger('light');
    resetPortraitTilt();
    if (!portraitDissolveController && typeof window.createSmokyDissolve === 'function') {
      portraitDissolveController = window.createSmokyDissolve({
        stage:portraitStage,
        card:portraitCard,
        canvas:portraitSmokyCanvas,
        respawn:false,
        onComplete:() => { portraitClosing = false; setPortraitOpen(false); },
      });
    }
    if (portraitDissolveController) {
      const previousTransition = portraitCard.style.transition;
      portraitCard.style.transition = 'none';
      resetPortraitTilt();
      void portraitCard.offsetWidth;
      portraitDissolveController.dissolve();
      portraitCard.style.transition = previousTransition;
    } else { portraitClosing = false; setPortraitOpen(false); }
  };

  document.addEventListener('click',(event) => {
    const trigger = event.target.closest?.('.portrait-name,.portrait-cue-hit');
    if (trigger) {
      event.preventDefault();
      if (portraitOpen) closePortraitWithDissolve();
      else setPortraitOpen(true);
      return;
    }
    if (!portraitOpen || !portraitCloseAllowed()) return;
    if (!event.target.closest?.('#portraitToast')) closePortraitWithDissolve();
  });

  document.addEventListener('keydown',(event) => {
    if (event.key === 'Escape' && portraitOpen) closePortraitWithDissolve();
  });

  portraitClose?.addEventListener('click',(event) => {
    event.preventDefault();
    event.stopPropagation();
    closePortraitWithDissolve(true);
  });

  portraitCard?.addEventListener('click',(event) => {
    if (event.target.closest?.('#portraitClose') || !portraitCloseAllowed()) return;
    event.preventDefault();
    event.stopPropagation();
    closePortraitWithDissolve();
  });

  portraitTilt?.addEventListener('pointermove',(event) => {
    if (!portraitTilt || !portraitCard || reduceMotion.matches) return;
    const r = portraitTilt.getBoundingClientRect();
    const px = Math.min(1,Math.max(0,(event.clientX-r.left)/r.width));
    const py = Math.min(1,Math.max(0,(event.clientY-r.top)/r.height));
    portraitTilt.classList.add('is-hover');
    portraitCard.classList.add('is-tilting');
    portraitCard.style.setProperty('--tilt-ry',((px-.5)*32).toFixed(2)+'deg');
    portraitCard.style.setProperty('--tilt-rx',((.5-py)*32).toFixed(2)+'deg');
    portraitCard.style.setProperty('--tilt-gx',(px*100).toFixed(1)+'%');
    portraitCard.style.setProperty('--tilt-gy',(py*100).toFixed(1)+'%');
  });

  portraitTilt?.addEventListener('pointerleave',resetPortraitTilt);
  syncPortraitTriggers();

  /* ---------- debug panel ---------- */
  const palettePickers = Array.from(document.querySelectorAll('[data-palette-picker]'));
  const paletteHex = Array.from(document.querySelectorAll('[data-palette-hex]'));
  const typeInputs = Array.from(document.querySelectorAll('[data-type-var]'));
  const debugReset = document.getElementById('debugReset');
  const debugCopy = document.getElementById('debugCopy');
  const debugCollapse = document.getElementById('debugCollapse');
  const tunerSelectionPreview = document.getElementById('tunerSelectionPreview');
  const tunerWeightRange = document.getElementById('tunerWeightRange');
  const tunerWeightNumber = document.getElementById('tunerWeightNumber');
  const tunerBaseWeight = document.getElementById('tunerBaseWeight');
  const tunerAnnotationStyle = document.getElementById('tunerAnnotationStyle');
  const tunerAnnotationColorPicker = document.getElementById('tunerAnnotationColorPicker');
  const tunerAnnotationColorHex = document.getElementById('tunerAnnotationColorHex');
  const tunerApplyAnnotation = document.getElementById('tunerApplyAnnotation');
  const tunerRemoveAnnotation = document.getElementById('tunerRemoveAnnotation');
  const tunerClearSelection = document.getElementById('tunerClearSelection');
  const tunerResetLanguage = document.getElementById('tunerResetLanguage');
  let typeConfig = (() => { try { return JSON.parse(storageGet(typeKey) || 'null') || {}; } catch { return {}; } })();

  const isHex = (value) => /^#[0-9a-f]{6}$/i.test(value);
  const normalizeHex = (value) => {
    const trimmed = String(value || '').trim();
    const withHash = /^[0-9a-f]{6}$/i.test(trimmed) ? `#${trimmed}` : trimmed;
    return isHex(withHash) ? withHash.toLowerCase() : null;
  };

  const syncPaletteControls = () => {
    palettePickers.forEach((input) => { input.value = currentPalette[input.dataset.palettePicker]; });
    paletteHex.forEach((input) => { input.value = currentPalette[input.dataset.paletteHex]; input.classList.remove('is-invalid'); });
  };

  const computedTypography = () => {
    const sample = heroCopies.en?.querySelector('p');
    const result = {};
    if (sample) {
      const style=getComputedStyle(sample);const fontSize=parseFloat(style.fontSize)||27;const lineHeightPx=parseFloat(style.lineHeight);const second=heroCopies.en?.querySelectorAll('p')[1];const paragraphGapPx=second?parseFloat(getComputedStyle(second).marginTop):fontSize*.55;
      result['--hero-weight']=parseFloat(style.fontWeight)||230;result['--hero-size']=fontSize;result['--hero-line-height']=Number.isFinite(lineHeightPx)?lineHeightPx/fontSize:1;result['--hero-letter-spacing']=style.letterSpacing==='normal'?0:(parseFloat(style.letterSpacing)||0)/fontSize;result['--hero-word-spacing']=style.wordSpacing==='normal'?0:(parseFloat(style.wordSpacing)||0)/fontSize;result['--hero-paragraph-gap']=paragraphGapPx/fontSize;result['--hero-max-width']=parseFloat(getComputedStyle(root).getPropertyValue('--hero-max-width'))||860;
    }
    const rootStyle=getComputedStyle(root);
    typeInputs.forEach((input)=>{const key=input.dataset.typeVar;if(result[key]!==undefined)return;const value=parseFloat(rootStyle.getPropertyValue(key).trim());if(Number.isFinite(value))result[key]=value;});
    return result;
  };

  const applyTypeConfig = (config, persist = true) => {
    typeConfig = {...config};
    typeInputs.forEach((input) => {
      const key = input.dataset.typeVar;
      const unit = input.dataset.unit || '';
      if (config[key] === undefined || config[key] === null || config[key] === '') return;
      root.style.setProperty(key, `${config[key]}${unit}`);
      input.value = config[key];
    });
    if (persist) storageSet(typeKey,JSON.stringify(typeConfig));
    scheduleAnnotationLayout();
  };

  const persistTuner = () => storageSet(tunerKey,JSON.stringify(tunerState));

  const currentHeroWords = () => Array.from(heroCopies[root.lang]?.querySelectorAll('.tune-word') || []);
  const selectedElements = () => currentHeroWords().filter((word) => selectedWords.has(word.dataset.tuneKey));

  const baseHeroWeight = () => {
    const paragraph = heroCopies[root.lang]?.querySelector('p');
    return Math.round(parseFloat(paragraph ? getComputedStyle(paragraph).fontWeight : '') || 580);
  };

  const syncSelectedClasses = () => {
    document.querySelectorAll('.tune-word').forEach((word) => word.classList.toggle('is-selected',selectedWords.has(word.dataset.tuneKey)));
  };

  const selectedRange = () => {
    const words = selectedElements().map((word) => ({
      p:Number(word.dataset.tuneParagraph),
      w:Number(word.dataset.tuneWord),
      order:Number(word.dataset.tuneOrder),
      text:word.textContent || ''
    })).sort((a,b) => a.order-b.order);
    if (!words.length) return null;
    if (words.some((word) => word.p !== words[0].p)) return null;
    const indexes = words.map((word) => word.w).sort((a,b) => a-b);
    for (let i=1;i<indexes.length;i++) if (indexes[i] !== indexes[i-1]+1) return null;
    return {p:words[0].p,start:indexes[0],end:indexes.at(-1),words};
  };

  const annotationOverlap = (annotation,range) => annotation.p === range.p && annotation.start <= range.end && annotation.end >= range.start;

  const exactAnnotation = (range) => range ? (tunerState[root.lang]?.annotations || []).find((a) => a.p === range.p && a.start === range.start && a.end === range.end) : null;

  const setAnnotationColorControls = (value) => {
    const normalized = normalizeHex(value) || currentPalette.accent;
    if (tunerAnnotationColorPicker) tunerAnnotationColorPicker.value = normalized;
    if (tunerAnnotationColorHex) {
      tunerAnnotationColorHex.value = normalized;
      tunerAnnotationColorHex.classList.remove('is-invalid');
    }
  };

  const syncTunerControls = () => {
    if (!debugMode) return;
    const selected = selectedElements();
    const range = selectedRange();
    const baseline = baseHeroWeight();
    if (tunerSelectionPreview) {
      if (!selected.length) tunerSelectionPreview.textContent = root.lang === 'es' ? 'Haz clic en una palabra de la introducción' : 'Click a word in the introduction';
      else {
        const text = selected.sort((a,b) => Number(a.dataset.tuneOrder)-Number(b.dataset.tuneOrder)).map((word) => word.textContent).join(' ');
        tunerSelectionPreview.textContent = selected.length > 8 ? `${text.slice(0,72)}… · ${selected.length} words` : text;
      }
    }

    const values = selected.map((word) => {
      const p = Number(word.dataset.tuneParagraph), w = Number(word.dataset.tuneWord);
      return Number(tunerState[root.lang]?.weights?.[localWordKey(p,w)] ?? baseline);
    });
    const sameWeight = values.length && values.every((value) => value === values[0]);
    const shownWeight = sameWeight ? values[0] : baseline;
    if (tunerWeightRange) { tunerWeightRange.value = String(shownWeight); tunerWeightRange.disabled = !selected.length; }
    if (tunerWeightNumber) {
      tunerWeightNumber.disabled = !selected.length;
      tunerWeightNumber.value = sameWeight ? String(values[0]) : (selected.length ? '' : String(baseline));
      tunerWeightNumber.placeholder = selected.length && !sameWeight ? 'mixed' : '';
    }
    if (tunerBaseWeight) tunerBaseWeight.disabled = !selected.length;

    const exact = exactAnnotation(range);
    if (exact && tunerAnnotationStyle) tunerAnnotationStyle.value = exact.style;
    if (exact) setAnnotationColorControls(exact.color || currentPalette.accent);
    if (tunerApplyAnnotation) tunerApplyAnnotation.disabled = !range;
    if (tunerRemoveAnnotation) tunerRemoveAnnotation.disabled = !range || !(tunerState[root.lang]?.annotations || []).some((a) => annotationOverlap(a,range));
    if (tunerClearSelection) tunerClearSelection.disabled = !selected.length;
  };

  const clearWordSelection = () => {
    selectedWords.clear();
    selectionAnchor = null;
    syncSelectedClasses();
    syncTunerControls();
  };

  const applyWeightToSelection = (value) => {
    const selected = selectedElements();
    if (!selected.length) return;
    const weight = Math.min(900,Math.max(100,Math.round(Number(value) || baseHeroWeight())));
    const baseline = baseHeroWeight();
    for (const word of selected) {
      const key = localWordKey(Number(word.dataset.tuneParagraph),Number(word.dataset.tuneWord));
      if (weight === baseline) delete tunerState[root.lang].weights[key];
      else tunerState[root.lang].weights[key] = weight;
    }
    persistTuner();
    renderHero(root.lang);
    syncTunerControls();
  };

  const removeWeightFromSelection = () => {
    const selected = selectedElements();
    if (!selected.length) return;
    for (const word of selected) delete tunerState[root.lang].weights[localWordKey(Number(word.dataset.tuneParagraph),Number(word.dataset.tuneWord))];
    persistTuner();
    renderHero(root.lang);
    syncTunerControls();
  };

  onLanguageChanged = (lang) => {
    clearWordSelection();
    renderHero(lang);
    syncPortraitTriggers();
    if (eyeButton) {
      const visible = eyeButton.getAttribute('aria-pressed') === 'true';
      eyeButton.setAttribute('aria-label',visible ? (root.lang === 'es' ? 'Ocultar contraseña' : 'Hide password') : (root.lang === 'es' ? 'Mostrar contraseña' : 'Show password'));
    }
  };

  if (Object.keys(typeConfig).length) applyTypeConfig(typeConfig,false);

  if (debugMode) {
    debugPanel.hidden = false;
    syncPaletteControls();
    const baseline = computedTypography();
    typeInputs.forEach((input) => {
      const key = input.dataset.typeVar;
      input.value = typeConfig[key] ?? baseline[key] ?? '';
    });
    setAnnotationColorControls(currentPalette.accent);
    syncTunerControls();

    document.addEventListener('click', (event) => {
      const word = event.target.closest?.('.tune-word');
      if (!word || !word.closest('.hero-copy') || currentView !== 'home' || word.classList.contains('portrait-name')) return;
      event.preventDefault();
      const key = word.dataset.tuneKey;
      const order = Number(word.dataset.tuneOrder);
      if (event.shiftKey && selectionAnchor) {
        const anchor = currentHeroWords().find((candidate) => candidate.dataset.tuneKey === selectionAnchor);
        if (anchor) {
          const a = Number(anchor.dataset.tuneOrder);
          const lo = Math.min(a,order), hi = Math.max(a,order);
          if (!event.metaKey && !event.ctrlKey) selectedWords.clear();
          currentHeroWords().forEach((candidate) => {
            const candidateOrder = Number(candidate.dataset.tuneOrder);
            if (candidateOrder >= lo && candidateOrder <= hi) selectedWords.add(candidate.dataset.tuneKey);
          });
        }
      } else if (event.metaKey || event.ctrlKey) {
        if (selectedWords.has(key)) selectedWords.delete(key); else selectedWords.add(key);
        selectionAnchor = key;
      } else {
        selectedWords.clear();
        selectedWords.add(key);
        selectionAnchor = key;
      }
      syncSelectedClasses();
      syncTunerControls();
      Sounds.play('tap');
    });

    palettePickers.forEach((input) => {
      input.addEventListener('input', () => {
        const key = input.dataset.palettePicker;
        applyPalette({[key]:input.value.toLowerCase()});
        syncPaletteControls();
      });
    });
    paletteHex.forEach((input) => {
      input.addEventListener('input', () => {
        const normalized = normalizeHex(input.value);
        input.classList.toggle('is-invalid', !normalized);
        if (!normalized) return;
        applyPalette({[input.dataset.paletteHex]:normalized});
        syncPaletteControls();
      });
      input.addEventListener('blur', () => {
        if (!normalizeHex(input.value)) syncPaletteControls();
      });
    });

    typeInputs.forEach((input) => {
      input.addEventListener('input', () => {
        if (input.value === '') return;
        typeConfig[input.dataset.typeVar] = Number(input.value);
        applyTypeConfig(typeConfig);
        syncTunerControls();
      });
    });

    tunerWeightRange?.addEventListener('input', () => {
      if (tunerWeightNumber) tunerWeightNumber.value = tunerWeightRange.value;
      applyWeightToSelection(tunerWeightRange.value);
    });
    tunerWeightNumber?.addEventListener('input', () => {
      if (tunerWeightNumber.value === '') return;
      const value = Math.min(900,Math.max(100,Number(tunerWeightNumber.value)));
      if (tunerWeightRange) tunerWeightRange.value = String(value);
      applyWeightToSelection(value);
    });
    tunerBaseWeight?.addEventListener('click', () => {
      removeWeightFromSelection();
      Sounds.play('state');
    });

    tunerAnnotationColorPicker?.addEventListener('input', () => setAnnotationColorControls(tunerAnnotationColorPicker.value));
    tunerAnnotationColorHex?.addEventListener('input', () => {
      const normalized = normalizeHex(tunerAnnotationColorHex.value);
      tunerAnnotationColorHex.classList.toggle('is-invalid',!normalized);
      if (normalized && tunerAnnotationColorPicker) tunerAnnotationColorPicker.value = normalized;
    });
    tunerAnnotationColorHex?.addEventListener('blur', () => {
      if (!normalizeHex(tunerAnnotationColorHex.value)) setAnnotationColorControls(tunerAnnotationColorPicker?.value || currentPalette.accent);
    });

    tunerApplyAnnotation?.addEventListener('click', () => {
      const range = selectedRange();
      const color = normalizeHex(tunerAnnotationColorHex?.value) || tunerAnnotationColorPicker?.value || currentPalette.accent;
      const style = tunerAnnotationStyle?.value || 'highlight';
      if (!range || !annotationSvg[style]) { Sounds.play('error'); return; }
      tunerState[root.lang].annotations = (tunerState[root.lang].annotations || []).filter((annotation) => !annotationOverlap(annotation,range));
      const semanticColor = color.toLowerCase() === currentPalette.accent.toLowerCase() ? null : color;
      const nextAnnotation = {p:range.p,start:range.start,end:range.end,style,color:semanticColor};
      if (semanticColor === '#ea1b5c') nextAnnotation.darkColor = '#ff96ac';
      tunerState[root.lang].annotations.push(nextAnnotation);
      persistTuner();
      renderHero(root.lang);
      syncTunerControls();
      Sounds.play('state');
    });

    tunerRemoveAnnotation?.addEventListener('click', () => {
      const range = selectedRange();
      if (!range) return;
      const before = tunerState[root.lang].annotations.length;
      tunerState[root.lang].annotations = tunerState[root.lang].annotations.filter((annotation) => !annotationOverlap(annotation,range));
      if (tunerState[root.lang].annotations.length === before) return;
      persistTuner();
      renderHero(root.lang);
      syncTunerControls();
      Sounds.play('state');
    });

    tunerClearSelection?.addEventListener('click', clearWordSelection);
    tunerResetLanguage?.addEventListener('click', () => {
      tunerState[root.lang] = JSON.parse(JSON.stringify(tunedDefaults[root.lang]));
      persistTuner();
      clearWordSelection();
      renderHero(root.lang);
      syncTunerControls();
      Sounds.play('state');
    });

    debugCollapse?.addEventListener('click', () => {
      const collapsed = debugPanel.classList.toggle('is-collapsed');
      debugCollapse.textContent = collapsed ? '+' : '−';
      debugCollapse.setAttribute('aria-expanded',String(!collapsed));
      debugCollapse.setAttribute('aria-label',collapsed ? 'Expand debug panel' : 'Collapse debug panel');
    });

    debugReset?.addEventListener('click', () => {
      storageRemove(paletteKey);
      storageRemove(typeKey);
      storageRemove(annotationsKey);
      storageRemove(tunerKey);
      currentPalette = {...paletteDefaults};
      renderPalette();
      typeConfig = {};
      typeInputs.forEach((input) => root.style.removeProperty(input.dataset.typeVar));
      tunerState = cloneTunedDefaults();
      clearWordSelection();
      renderAllHeroes();
      syncPaletteControls();
      const defaults = computedTypography();
      typeInputs.forEach((input) => input.value = defaults[input.dataset.typeVar] ?? '');
      setAnnotationColorControls(currentPalette.accent);
      syncTunerControls();
      Sounds.play('state');
    });

    debugCopy?.addEventListener('click', async () => {
      const typography = {};
      typeInputs.forEach((input) => {
        typography[input.dataset.typeVar] = typeConfig[input.dataset.typeVar] ?? Number(input.value);
      });
      const payload = {
        palette:currentPalette,
        theme:currentTheme,
        typography,
        intro:heroTextSources,
        tuning:tunerState
      };
      try {
        await navigator.clipboard.writeText(JSON.stringify(payload,null,2));
        debugCopy.textContent = 'Copied';
        window.setTimeout(() => debugCopy.textContent = 'Copy tuning',900);
      } catch {}
    });
  }

  setAnimationIndices();
  const initialView = getView(currentView);
  if (initialView && !reduceMotion.matches) {
    initialView.classList.add('is-entering');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        initialView.classList.add('is-entering-active');
        enterCleanupTimer = window.setTimeout(() => finishRevealClasses(initialView), 740);
      });
    });
  }
  root.dataset.ready = 'true';
})();
