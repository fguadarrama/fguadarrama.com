(() => {
  const root = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const Sounds = window.FGSounds || { play(){}, prime(){}, setEnabled(){}, get enabled(){ return false; } };

  const storageGet = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
  const storageSet = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  const storageRemove = (key) => { try { localStorage.removeItem(key); } catch {} };

  const langKey = 'fg-language-v3';
  const themeKey = 'fg-theme-v1';
  const soundKey = 'fg-sounds-v1';
  const paletteKey = 'fg-debug-palette-v3';
  const typeKey = 'fg-debug-type-v1';
  const annotationsKey = 'fg-debug-annotations-v1';

  /* ---------- palette + theme ---------- */
  const paletteDefaults = { bg:'#fdfdfc', text:'#22223b', accent:'#4f7f83' };
  let currentPalette = (() => {
    try {
      const saved = JSON.parse(storageGet(paletteKey) || 'null');
      return saved && saved.bg && saved.text && saved.accent ? saved : {...paletteDefaults};
    } catch { return {...paletteDefaults}; }
  })();
  let currentTheme = storageGet(themeKey) === 'dark' ? 'dark' : 'light';

  const actualThemeColor = () => currentTheme === 'dark' ? currentPalette.text : currentPalette.bg;

  const renderPalette = () => {
    root.style.setProperty('--bg', currentTheme === 'dark' ? currentPalette.text : currentPalette.bg);
    root.style.setProperty('--text', currentTheme === 'dark' ? currentPalette.bg : currentPalette.text);
    root.style.setProperty('--accent', currentPalette.accent);
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
    if (!control || control.closest('.segmented-control')) return;
    Sounds.play('tap');
  }, {capture:true});
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') Sounds.prime();
  }, {capture:true});

  if (finePointer.matches) {
    const hoverSelector = '.radial-trigger,.radial-item,.site-name,.segmented-control button,.contact-actions a,.contact-actions button,.modal-close,.eye-button,.submit-button';
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
    document.querySelectorAll('.radial-item').forEach((item) => {
      const label = lang === 'es' ? item.dataset.labelEs : item.dataset.labelEn;
      if (label) item.setAttribute('aria-label', label);
    });
    document.getElementById('radialTrigger')?.setAttribute('aria-label', lang === 'es' ? 'Abrir navegación' : 'Open navigation');
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
  const settingsTrigger = document.getElementById('radialSettings');
  let settingsOpen = false;

  const openSettings = () => {
    if (!settingsPopover || settingsOpen) return;
    settingsOpen = true;
    settingsPopover.classList.add('is-open');
    settingsPopover.setAttribute('aria-hidden', 'false');
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
    if (restoreFocus) document.getElementById('radialTrigger')?.focus({preventScroll:true});
  };

  document.querySelectorAll('[data-theme-choice]').forEach((button) => {
    button.addEventListener('click', () => {
      const changed = applyTheme(button.dataset.themeChoice);
      if (changed) Sounds.play('state');
    });
  });
  document.querySelectorAll('[data-language-choice]').forEach((button) => {
    button.addEventListener('click', () => {
      const changed = applyLanguage(button.dataset.languageChoice);
      if (changed) Sounds.play('state');
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
    });
  });

  document.addEventListener('pointerdown', (event) => {
    if (!settingsOpen) return;
    if (settingsPopover.contains(event.target) || settingsTrigger?.contains(event.target)) return;
    closeSettings();
  });

  /* ---------- radial menu ---------- */
  const radial = document.querySelector('.radial-menu');
  const trigger = document.getElementById('radialTrigger');
  const allRadialItems = Array.from(document.querySelectorAll('.radial-item'));
  const itemsWrap = document.getElementById('radialItems');
  const scrim = document.getElementById('menuScrim');
  let currentView = root.dataset.view || 'home';

  const visibleRadialItems = () => allRadialItems.filter((item) => !item.hidden);

  const updateRadialVisibility = () => {
    allRadialItems.forEach((item) => {
      const target = item.dataset.viewTarget;
      if (target) item.hidden = target === currentView;
    });
  };

  const placeRadialItems = () => {
    const styles = getComputedStyle(root);
    const radius = parseFloat(styles.getPropertyValue('--radial-radius')) || 112;
    const items = visibleRadialItems();
    const count = items.length;
    items.forEach((item, index) => {
      const t = count === 1 ? 0 : index / (count - 1);
      const angle = Math.PI - (Math.PI / 2) * t;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      item.style.setProperty('--tx', `${x.toFixed(2)}px`);
      item.style.setProperty('--ty', `${y.toFixed(2)}px`);
      item.style.setProperty('--delay', `${index * 34}ms`);
      item.style.setProperty('--close-delay', `${(count - 1 - index) * 18}ms`);
    });
  };

  updateRadialVisibility();
  placeRadialItems();
  window.addEventListener('resize', placeRadialItems, {passive:true});

  let menuOpen = false;
  let closeTimer = null;

  const openMenu = () => {
    if (menuOpen) return;
    closeSettings();
    window.clearTimeout(closeTimer);
    updateRadialVisibility();
    placeRadialItems();
    menuOpen = true;
    radial.classList.remove('is-closing');
    radial.classList.add('is-open');
    body.classList.add('menu-open');
    trigger.setAttribute('aria-expanded', 'true');
    trigger.setAttribute('aria-label', root.lang === 'es' ? 'Cerrar navegación' : 'Close navigation');
    itemsWrap.setAttribute('aria-hidden', 'false');
    const first = visibleRadialItems()[0];
    window.setTimeout(() => first?.focus({preventScroll:true}), reduceMotion.matches ? 1 : 70);
  };

  const closeMenu = ({restoreFocus=false} = {}) => {
    if (!menuOpen) return;
    menuOpen = false;
    radial.classList.add('is-closing');
    radial.classList.remove('is-open');
    body.classList.remove('menu-open');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', root.lang === 'es' ? 'Abrir navegación' : 'Open navigation');
    itemsWrap.setAttribute('aria-hidden', 'true');
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      radial.classList.remove('is-closing');
      if (restoreFocus) trigger.focus({preventScroll:true});
    }, reduceMotion.matches ? 1 : 210);
  };

  trigger?.addEventListener('click', () => menuOpen ? closeMenu() : openMenu());
  scrim?.addEventListener('click', () => closeMenu({restoreFocus:true}));

  settingsTrigger?.addEventListener('click', () => {
    closeMenu();
    window.setTimeout(openSettings, reduceMotion.matches ? 1 : 105);
  });

  allRadialItems.forEach((item) => {
    item.addEventListener('keydown', (event) => {
      if (!menuOpen) return;
      if (event.key === 'Escape' || event.key === 'Tab') {
        event.preventDefault();
        closeMenu({restoreFocus:true});
        return;
      }
      const nextKey = event.key === 'ArrowDown' || event.key === 'ArrowRight';
      const prevKey = event.key === 'ArrowUp' || event.key === 'ArrowLeft';
      if (!nextKey && !prevKey) return;
      event.preventDefault();
      const items = visibleRadialItems();
      const index = items.indexOf(item);
      const nextIndex = (index + (nextKey ? 1 : -1) + items.length) % items.length;
      items[nextIndex]?.focus({preventScroll:true});
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (menuOpen) {
      event.preventDefault();
      closeMenu({restoreFocus:true});
    } else if (settingsOpen) {
      event.preventDefault();
      closeSettings({restoreFocus:true});
    }
  });

  /* ---------- view transitions + browser history ---------- */
  let switching = false;
  const getView = (name) => document.getElementById(`view-${name}`);

  const setAnimationIndices = () => {
    document.querySelectorAll('.hero-copy').forEach((copy) => {
      copy.querySelectorAll('p').forEach((paragraph, index) => paragraph.style.setProperty('--p-index', index));
      copy.querySelectorAll('.annotation-decoration').forEach((decoration, index) => decoration.style.setProperty('--annotation-index', index));
    });
    document.querySelectorAll('.content-view').forEach((view) => {
      view.querySelectorAll('.record,.contact-actions>*').forEach((item, index) => item.style.setProperty('--item-index', Math.min(index, 7)));
    });
  };

  const commitView = (nextName) => {
    const current = getView(currentView);
    const next = getView(nextName);
    if (!next || nextName === currentView) return false;

    switching = true;
    current?.classList.add('is-leaving');

    const swap = () => {
      if (current) {
        current.hidden = true;
        current.classList.remove('is-current','is-leaving');
      }
      next.hidden = false;
      next.scrollTop = 0;
      next.classList.add('is-entering');
      currentView = nextName;
      root.dataset.view = nextName;
      updateRadialVisibility();
      placeRadialItems();
      setAnimationIndices();

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          next.classList.add('is-entering-active','is-current');
          window.setTimeout(() => {
            next.classList.remove('is-entering','is-entering-active');
            switching = false;
          }, reduceMotion.matches ? 1 : 340);
        });
      });
    };

    window.setTimeout(swap, reduceMotion.matches ? 1 : 145);
    return true;
  };

  const switchView = (nextName, {historyMode='push'} = {}) => {
    if (!getView(nextName) || nextName === currentView || switching) return;
    closeMenu();
    closeSettings();
    if (!commitView(nextName)) return;
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
    button.addEventListener('click', () => closeDialog(button.closest('dialog')));
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
  const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const contactError = (text, focusTarget) => {
    formStatus.textContent = text;
    Sounds.play('error');
    focusTarget?.focus?.();
  };

  messageTrigger?.addEventListener('click', () => {
    formOpenedAt = Date.now();
    formStatus.textContent = '';
    openDialog(messageDialog);
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
      const response = await fetch('https://formspree.io/f/maqpznrg',{method:'POST',headers:{Accept:'application/json'},body:payload});
      if (!response.ok) throw new Error('send');
      formStatus.textContent = cstr().sent;
      Sounds.play('success');
      contactForm.reset();
      window.setTimeout(() => closeDialog(messageDialog), 950);
    } catch {
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
        cvPassword.select();
        cvSubmit.disabled = false;
        return;
      }
      Sounds.play('success');
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
      cvSubmit.disabled = false;
    }
  });

  /* ---------- annotation renderer ---------- */
  const heroCopies = {en:document.querySelector('.hero-copy.lang-en'),es:document.querySelector('.hero-copy.lang-es')};
  const heroTextSources = {
    en:Array.from(heroCopies.en?.querySelectorAll('p') || []).map((p) => p.textContent),
    es:Array.from(heroCopies.es?.querySelectorAll('p') || []).map((p) => p.textContent)
  };
  const annotationDefaults = {
    en:{wavy:'one level upstream',circle:'Mexico’s poorest state',highlight:'high-value care',double:'inferior care'},
    es:{wavy:'un nivel más arriba',circle:'el estado más pobre de México',highlight:'atención de alto valor',double:'atención inferior'}
  };
  let annotationConfig = (() => {
    try {
      const saved = JSON.parse(storageGet(annotationsKey) || 'null');
      return saved?.en && saved?.es ? saved : structuredClone(annotationDefaults);
    } catch { return structuredClone(annotationDefaults); }
  })();

  const annotationSvg = {
    wavy:'<svg class="annotation-decoration" viewBox="0 0 140 14" fill="none" preserveAspectRatio="none" aria-hidden="true"><path d="M2,6 Q5.5,3 9,6 T17,6 T25,6 T33,6 T41,6 T49,6 T57,6 T65,6 T73,6 T81,6 T89,6 T97,6 T105,6 T113,6 T121,6 T129,6 T137,6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none" filter="url(#hd-rough-soft)"/></svg>',
    circle:'<svg class="annotation-decoration" viewBox="0 0 220 64" fill="none" preserveAspectRatio="none" aria-hidden="true"><path d="M40,40 C20,23 53,7 102,5 C153,3 207,11 211,29 C215,47 167,60 109,60 C59,60 15,53 19,35 C21,27 27,22 37,20" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none" filter="url(#hd-rough)"/><path d="M43,37 C28,25 58,9 105,7 C151,6 199,14 206,29 C212,45 167,57 110,58" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none" opacity=".55" filter="url(#hd-rough-soft)"/></svg>',
    highlight:'<svg class="annotation-decoration" viewBox="0 0 170 26" preserveAspectRatio="none" aria-hidden="true"><path d="M4,17 C2,11 5,7 12,6 C45,2 95,2 138,4 C152,5 164,7 166,13 C167,18 163,21 155,22 C112,24 60,24 16,22 C8,21.5 4,20 4,17 Z" fill="currentColor" filter="url(#hd-rough-soft)"/></svg>',
    double:'<svg class="annotation-decoration" viewBox="0 0 140 16" fill="none" preserveAspectRatio="none" aria-hidden="true"><path d="M3,5 C40,2 100,2 137,4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none" filter="url(#hd-rough-soft)"/><path d="M5,12 C42,9 98,10 135,11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none" opacity=".75" filter="url(#hd-rough-soft)"/></svg>'
  };

  const makeAnnotation = (style,text) => {
    const wrapper = document.createElement('span');
    wrapper.className = `annotated annotated-${style}`;
    const label = document.createElement('span');
    label.className = 'annotation-text';
    label.textContent = text;
    wrapper.appendChild(label);
    const template = document.createElement('template');
    template.innerHTML = annotationSvg[style];
    wrapper.appendChild(template.content.firstElementChild);
    return wrapper;
  };

  const renderHeroAnnotations = (lang) => {
    const copy = heroCopies[lang];
    const texts = heroTextSources[lang];
    if (!copy || !texts?.length) return {};
    const config = annotationConfig[lang] || {};
    const found = {wavy:false,circle:false,highlight:false,double:false};

    Array.from(copy.querySelectorAll('p')).forEach((paragraph,index) => {
      const text = texts[index] || '';
      const candidates = [];
      for (const style of ['wavy','circle','highlight','double']) {
        const phrase = String(config[style] || '').trim();
        if (!phrase) continue;
        const start = text.toLocaleLowerCase(lang).indexOf(phrase.toLocaleLowerCase(lang));
        if (start >= 0) candidates.push({style,phrase,start,end:start+phrase.length});
      }
      candidates.sort((a,b) => a.start - b.start || b.phrase.length - a.phrase.length);
      const chosen = [];
      for (const item of candidates) {
        if (chosen.some((existing) => item.start < existing.end && item.end > existing.start)) continue;
        chosen.push(item);
        found[item.style] = true;
      }
      chosen.sort((a,b) => a.start-b.start);

      paragraph.replaceChildren();
      let cursor = 0;
      for (const item of chosen) {
        if (item.start > cursor) paragraph.appendChild(document.createTextNode(text.slice(cursor,item.start)));
        paragraph.appendChild(makeAnnotation(item.style,text.slice(item.start,item.end)));
        cursor = item.end;
      }
      if (cursor < text.length) paragraph.appendChild(document.createTextNode(text.slice(cursor)));
    });
    setAnimationIndices();
    return found;
  };

  renderHeroAnnotations('en');
  renderHeroAnnotations('es');

  /* ---------- debug panel ---------- */
  const debugPanel = document.getElementById('debugPanel');
  const debugMode = new URLSearchParams(location.search).get('debug') === '1';
  const palettePickers = Array.from(document.querySelectorAll('[data-palette-picker]'));
  const paletteHex = Array.from(document.querySelectorAll('[data-palette-hex]'));
  const annotationInputs = Array.from(document.querySelectorAll('[data-annotation-style]'));
  const typeInputs = Array.from(document.querySelectorAll('[data-type-var]'));
  const debugReset = document.getElementById('debugReset');
  const debugCopy = document.getElementById('debugCopy');
  const debugCollapse = document.getElementById('debugCollapse');
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
    if (!sample) return {};
    const style = getComputedStyle(sample);
    const fontSize = parseFloat(style.fontSize) || 50;
    const lineHeightPx = parseFloat(style.lineHeight);
    const second = heroCopies.en?.querySelectorAll('p')[1];
    const paragraphGapPx = second ? parseFloat(getComputedStyle(second).marginTop) : fontSize*.52;
    return {
      '--hero-weight':parseFloat(style.fontWeight) || 580,
      '--hero-size':fontSize,
      '--hero-line-height':Number.isFinite(lineHeightPx) ? lineHeightPx/fontSize : .99,
      '--hero-letter-spacing':style.letterSpacing === 'normal' ? 0 : (parseFloat(style.letterSpacing) || 0)/fontSize,
      '--hero-word-spacing':style.wordSpacing === 'normal' ? 0 : (parseFloat(style.wordSpacing) || 0)/fontSize,
      '--hero-paragraph-gap':paragraphGapPx/fontSize,
      '--hero-max-width':parseFloat(style.maxWidth) || 1100
    };
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
  };

  const syncAnnotationInputs = () => {
    const config = annotationConfig[root.lang] || {};
    const found = renderHeroAnnotations(root.lang);
    annotationInputs.forEach((input) => {
      input.value = config[input.dataset.annotationStyle] || '';
      input.classList.toggle('is-invalid', Boolean(input.value.trim()) && !found[input.dataset.annotationStyle]);
    });
  };

  onLanguageChanged = () => {
    if (debugMode) syncAnnotationInputs();
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
    syncAnnotationInputs();

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

    annotationInputs.forEach((input) => {
      input.addEventListener('input', () => {
        const style = input.dataset.annotationStyle;
        annotationConfig[root.lang][style] = input.value;
        storageSet(annotationsKey,JSON.stringify(annotationConfig));
        const found = renderHeroAnnotations(root.lang);
        input.classList.toggle('is-invalid', Boolean(input.value.trim()) && !found[style]);
      });
    });

    typeInputs.forEach((input) => {
      input.addEventListener('input', () => {
        if (input.value === '') return;
        typeConfig[input.dataset.typeVar] = Number(input.value);
        applyTypeConfig(typeConfig);
      });
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
      currentPalette = {...paletteDefaults};
      renderPalette();
      typeConfig = {};
      typeInputs.forEach((input) => root.style.removeProperty(input.dataset.typeVar));
      annotationConfig = structuredClone(annotationDefaults);
      renderHeroAnnotations('en');
      renderHeroAnnotations('es');
      syncPaletteControls();
      const defaults = computedTypography();
      typeInputs.forEach((input) => input.value = defaults[input.dataset.typeVar] ?? '');
      syncAnnotationInputs();
      Sounds.play('state');
    });

    debugCopy?.addEventListener('click', async () => {
      const typeLines = typeInputs.map((input) => {
        const value = typeConfig[input.dataset.typeVar] ?? input.value;
        return `  ${input.dataset.typeVar}: ${value}${input.dataset.unit || ''};`;
      }).join('\n');
      const css = `:root {\n  --bg: ${currentPalette.bg};\n  --text: ${currentPalette.text};\n  --accent: ${currentPalette.accent};\n${typeLines}\n}\n\n/* ${root.lang.toUpperCase()} annotations\n${Object.entries(annotationConfig[root.lang]).map(([style,phrase]) => `  ${style}: ${phrase || '(off)'}`).join('\n')}\n*/`;
      try {
        await navigator.clipboard.writeText(css);
        debugCopy.textContent = 'Copied';
        window.setTimeout(() => debugCopy.textContent = 'Copy CSS',900);
      } catch {}
    });
  }

  setAnimationIndices();
  root.dataset.ready = 'true';
})();
