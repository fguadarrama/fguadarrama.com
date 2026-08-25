(() => {
  const root = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const storageGet = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
  const storageSet = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  const storageRemove = (key) => { try { localStorage.removeItem(key); } catch {} };

  /* ---------- language ---------- */
  const languageToggle = document.getElementById('languageToggle');
  const langKey = 'fg-language-v2';

  const getBrowserLanguage = () => {
    const langs = Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language || 'en'];
    return langs.some((value) => String(value).toLowerCase().startsWith('es')) ? 'es' : 'en';
  };

  const applyLanguage = (language, persist = true) => {
    const lang = language === 'es' ? 'es' : 'en';
    root.lang = lang;
    document.querySelectorAll('[data-en][data-es]').forEach((node) => {
      node.textContent = lang === 'es' ? node.dataset.es : node.dataset.en;
    });
    document.querySelectorAll('.radial-item').forEach((item) => {
      const label = lang === 'es' ? item.dataset.labelEs : item.dataset.labelEn;
      if (label) item.setAttribute('aria-label', label);
    });
    if (languageToggle) {
      languageToggle.querySelector('span').textContent = lang === 'es' ? 'Es' : 'En';
      languageToggle.setAttribute('aria-label', lang === 'es' ? 'Cambiar a inglés' : 'Switch to Spanish');
    }
    document.querySelector('meta[name="description"]')?.setAttribute(
      'content',
      lang === 'es'
        ? 'Francisco Guadarrama, MD — atención oncológica equitativa, sistemas de salud más sólidos y decisiones clínicas de alto valor.'
        : 'Francisco Guadarrama, MD — advancing equitable cancer care through oncology access, stronger health systems, and high-value clinical decisions.'
    );
    if (persist) storageSet(langKey, lang);
  };

  const savedLang = storageGet(langKey);
  applyLanguage(savedLang === 'es' || savedLang === 'en' ? savedLang : getBrowserLanguage(), false);
  languageToggle?.addEventListener('click', () => {
    applyLanguage(root.lang === 'es' ? 'en' : 'es');
  });

  /* ---------- radial menu ---------- */
  const radial = document.querySelector('.radial-menu');
  const trigger = document.getElementById('radialTrigger');
  const radialItems = Array.from(document.querySelectorAll('.radial-item'));
  const itemsWrap = document.getElementById('radialItems');
  const scrim = document.getElementById('menuScrim');

  const placeRadialItems = () => {
    const styles = getComputedStyle(root);
    const radius = parseFloat(styles.getPropertyValue('--radial-radius')) || 112;
    const count = radialItems.length;
    radialItems.forEach((item, index) => {
      const t = count === 1 ? 0 : index / (count - 1);
      // Top-right corner: quarter circle from due left (180°) to due down (90°).
      const angle = Math.PI - (Math.PI / 2) * t;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      item.style.setProperty('--tx', `${x.toFixed(2)}px`);
      item.style.setProperty('--ty', `${y.toFixed(2)}px`);
      item.style.setProperty('--delay', `${index * 34}ms`);
      item.style.setProperty('--close-delay', `${(count - 1 - index) * 18}ms`);
    });
  };

  placeRadialItems();
  window.addEventListener('resize', placeRadialItems, { passive: true });

  let menuOpen = false;
  let closeTimer = null;

  const openMenu = () => {
    if (menuOpen) return;
    window.clearTimeout(closeTimer);
    menuOpen = true;
    radial.classList.remove('is-closing');
    radial.classList.add('is-open');
    body.classList.add('menu-open');
    trigger.setAttribute('aria-expanded', 'true');
    trigger.setAttribute('aria-label', root.lang === 'es' ? 'Cerrar navegación' : 'Close navigation');
    itemsWrap.setAttribute('aria-hidden', 'false');
    if (!reduceMotion.matches) {
      window.setTimeout(() => radialItems[0]?.focus({ preventScroll: true }), 70);
    } else {
      radialItems[0]?.focus({ preventScroll: true });
    }
  };

  const closeMenu = ({ restoreFocus = false } = {}) => {
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
      if (restoreFocus) trigger.focus({ preventScroll: true });
    }, reduceMotion.matches ? 1 : 210);
  };

  trigger?.addEventListener('click', () => menuOpen ? closeMenu() : openMenu());
  scrim?.addEventListener('click', () => closeMenu({ restoreFocus: true }));

  radialItems.forEach((item, index) => {
    item.addEventListener('keydown', (event) => {
      if (!menuOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu({ restoreFocus: true });
        return;
      }
      if (event.key === 'Tab') {
        event.preventDefault();
        closeMenu({ restoreFocus: true });
        return;
      }
      const nextKey = event.key === 'ArrowDown' || event.key === 'ArrowRight';
      const prevKey = event.key === 'ArrowUp' || event.key === 'ArrowLeft';
      if (!nextKey && !prevKey) return;
      event.preventDefault();
      const step = nextKey ? 1 : -1;
      const nextIndex = (index + step + radialItems.length) % radialItems.length;
      radialItems[nextIndex]?.focus({ preventScroll: true });
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuOpen) {
      event.preventDefault();
      closeMenu({ restoreFocus: true });
    }
  });

  /* ---------- view transitions ---------- */
  let currentView = 'home';
  let switching = false;

  const getView = (name) => document.getElementById(`view-${name}`);

  const commitView = (nextName) => {
    const current = getView(currentView);
    const next = getView(nextName);
    if (!next || nextName === currentView) return;

    switching = true;
    current?.classList.add('is-leaving');

    const swap = () => {
      if (current) {
        current.hidden = true;
        current.classList.remove('is-current', 'is-leaving');
      }
      next.hidden = false;
      next.scrollTop = 0;
      next.classList.add('is-entering');
      root.dataset.view = nextName;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          next.classList.add('is-entering-active', 'is-current');
          window.setTimeout(() => {
            next.classList.remove('is-entering', 'is-entering-active');
            switching = false;
          }, reduceMotion.matches ? 1 : 250);
        });
      });
      currentView = nextName;
    };

    window.setTimeout(swap, reduceMotion.matches ? 1 : 145);
  };

  const switchView = (nextName) => {
    if (!getView(nextName) || nextName === currentView || switching) return;
    closeMenu();
    commitView(nextName);
  };

  document.querySelectorAll('[data-view-target]').forEach((control) => {
    control.addEventListener('click', () => {
      switchView(control.dataset.viewTarget);
    });
  });

  /* ---------- dialog helpers ---------- */
  const messageDialog = document.getElementById('messageDialog');
  const messageTrigger = document.getElementById('messageTrigger');
  const cvDialog = document.getElementById('cvDialog');
  const cvTrigger = document.getElementById('cvDownloadLink');

  const openDialog = (dialog) => {
    if (!dialog || dialog.open) return;
    dialog.showModal();
  };
  const closeDialog = (dialog) => {
    if (dialog?.open) dialog.close();
  };

  document.querySelectorAll('[data-close-dialog]').forEach((button) => {
    button.addEventListener('click', () => closeDialog(button.closest('dialog')));
  });

  [messageDialog, cvDialog].forEach((dialog) => {
    dialog?.addEventListener('click', (event) => {
      const rect = dialog.getBoundingClientRect();
      const outside =
        event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom;
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
    en: {
      fields:'Please fill in all fields.',
      email:'Please enter a valid e-mail address.',
      robot:'Please confirm you are not a robot.',
      trap:'Please review your message before sending.',
      send:'Error sending. Please try again.',
      sent:"Message sent · Thank you, I'll reply soon."
    },
    es: {
      fields:'Por favor completa todos los campos.',
      email:'Por favor ingresa una dirección de correo electrónico válida.',
      robot:'Por favor confirma que no eres un robot.',
      trap:'Por favor revisa tu mensaje antes de enviar.',
      send:'Error al enviar. Intenta de nuevo.',
      sent:'Mensaje enviado · Gracias, te responderé pronto.'
    }
  };
  const cstr = () => contactStrings[root.lang === 'es' ? 'es' : 'en'];
  const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  messageTrigger?.addEventListener('click', () => {
    formOpenedAt = Date.now();
    formStatus.textContent = '';
    openDialog(messageDialog);
    window.setTimeout(() => msg?.focus({ preventScroll: true }), 70);
  });

  contactForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    formStatus.textContent = '';

    if (!msg.value.trim() || !name.value.trim() || !email.value.trim()) {
      formStatus.textContent = cstr().fields; return;
    }
    if (!validEmail(email.value.trim())) {
      formStatus.textContent = cstr().email; email.focus(); return;
    }
    if (!robot.checked) {
      formStatus.textContent = cstr().robot; robot.focus(); return;
    }
    if (honeypot.value || Date.now() - formOpenedAt < 3000) {
      formStatus.textContent = cstr().trap; return;
    }

    submitMessage.disabled = true;
    try {
      const payload = new FormData();
      payload.append('name', name.value.trim());
      payload.append('email', email.value.trim());
      payload.append('message', msg.value.trim());
      payload.append('_gotcha', '');

      const response = await fetch('https://formspree.io/f/maqpznrg', {
        method:'POST',
        headers:{'Accept':'application/json'},
        body:payload
      });
      if (!response.ok) throw new Error('send');
      formStatus.textContent = cstr().sent;
      contactForm.reset();
      window.setTimeout(() => closeDialog(messageDialog), 950);
    } catch {
      formStatus.textContent = cstr().send;
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
    return target.bytes.map((byte,index) =>
      String.fromCharCode(byte ^ ((index * 17 + target.salt) & 255))
    ).join('');
  };

  const sha256 = async (value) => {
    const bytes = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2,'0')).join('');
  };

  const resetCv = () => {
    cvPassword.value = '';
    cvPassword.type = 'password';
    cvSubmit.disabled = true;
    cvStatus.textContent = '';
    passwordShell.classList.remove('is-error');
    eyeButton.setAttribute('aria-pressed','false');
    eyeButton.setAttribute('aria-label', root.lang === 'es' ? 'Mostrar contraseña' : 'Show password');
    if (eyePupil) eyePupil.style.transform = 'translate(0px,0px)';
  };

  cvTrigger?.addEventListener('click', () => {
    resetCv();
    openDialog(cvDialog);
    window.setTimeout(() => cvPassword.focus({ preventScroll:true }), 70);
  });

  cvPassword?.addEventListener('input', () => {
    cvSubmit.disabled = cvPassword.value.length === 0;
    cvStatus.textContent = '';
    passwordShell.classList.remove('is-error');
  });

  eyeButton?.addEventListener('click', () => {
    const visible = cvPassword.type === 'password';
    cvPassword.type = visible ? 'text' : 'password';
    eyeButton.setAttribute('aria-pressed', String(visible));
    eyeButton.setAttribute(
      'aria-label',
      visible
        ? (root.lang === 'es' ? 'Ocultar contraseña' : 'Hide password')
        : (root.lang === 'es' ? 'Mostrar contraseña' : 'Show password')
    );
    cvPassword.focus({ preventScroll:true });
  });

  eyeButton?.addEventListener('pointermove', (event) => {
    if (eyeButton.getAttribute('aria-pressed') === 'true' || !eyePupil) return;
    const rect = eyeButton.getBoundingClientRect();
    const dx = ((event.clientX - (rect.left + rect.width/2)) / (rect.width/2)) * 2.7;
    const dy = ((event.clientY - (rect.top + rect.height/2)) / (rect.height/2)) * 2.1;
    eyePupil.style.transform = `translate(${Math.max(-2.7,Math.min(2.7,dx))}px,${Math.max(-2.1,Math.min(2.1,dy))}px)`;
  });
  eyeButton?.addEventListener('pointerleave', () => {
    if (eyePupil) eyePupil.style.transform = 'translate(0px,0px)';
  });

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
        cvPassword.select();
        cvSubmit.disabled = false;
        return;
      }
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
      cvSubmit.disabled = false;
    }
  });

  /* ---------- debug palette ---------- */
  const debugPanel = document.getElementById('debugPanel');
  const debugInputs = Array.from(document.querySelectorAll('[data-color-var]'));
  const debugReset = document.getElementById('debugReset');
  const debugCopy = document.getElementById('debugCopy');
  const paletteKey = 'fg-debug-palette-v2';
  const paletteDefaults = {'--bg':'#fdfdfc','--text':'#22223b','--accent':'#4f7f83'};

  const applyPalette = (palette, persist = true) => {
    debugInputs.forEach((input) => {
      const key = input.dataset.colorVar;
      const value = palette[key] || paletteDefaults[key];
      root.style.setProperty(key, value);
      input.value = value;
      input.nextElementSibling.textContent = value;
    });
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette['--bg'] || paletteDefaults['--bg']);
    if (persist) storageSet(paletteKey, JSON.stringify(palette));
  };

  if (new URLSearchParams(location.search).get('debug') === '1') {
    debugPanel.hidden = false;
    let saved = null;
    try { saved = JSON.parse(storageGet(paletteKey) || 'null'); } catch {}
    applyPalette(saved || paletteDefaults, false);

    debugInputs.forEach((input) => {
      input.addEventListener('input', () => {
        const palette = {};
        debugInputs.forEach((current) => palette[current.dataset.colorVar] = current.value.toLowerCase());
        applyPalette(palette);
      });
    });
    debugReset?.addEventListener('click', () => {
      storageRemove(paletteKey);
      applyPalette(paletteDefaults, false);
    });
    debugCopy?.addEventListener('click', async () => {
      const lines = debugInputs.map((input) => `  ${input.dataset.colorVar}: ${input.value.toLowerCase()};`).join('\n');
      const css = `:root {\n${lines}\n}`;
      try {
        await navigator.clipboard.writeText(css);
        debugCopy.textContent = 'Copied';
        window.setTimeout(() => debugCopy.textContent = 'Copy CSS', 900);
      } catch {}
    });
  }

  /* ---------- entry load ---------- */
  root.dataset.ready = 'true';
})();
