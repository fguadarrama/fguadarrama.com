/*
  Procedural sound player adapted from m1ckc3s/procedural-sounds.
  MIT License, Copyright (c) 2026 Mick Cesanek.
  Recipes below are only the sounds explicitly selected by the site owner.
  See THIRD_PARTY_NOTICES.md.
*/
(() => {
  function playSound(patch, context) {
    if (!window.AudioContext && !window.webkitAudioContext) return;
    const ctx = context || playSound.ctx || (playSound.ctx = new (window.AudioContext || window.webkitAudioContext)());
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const S = 0.0001;
    const t0 = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = 0.65;
    master.connect(ctx.destination);

    function noiseBuffer(seconds, color) {
      const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      if (color === 'pink') {
        let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
        for (let i=0;i<len;i++) {
          const w = Math.random()*2-1;
          b0 = 0.99886*b0 + w*0.0555179;
          b1 = 0.99332*b1 + w*0.0750759;
          b2 = 0.969*b2 + w*0.153852;
          b3 = 0.8665*b3 + w*0.3104856;
          b4 = 0.55*b4 + w*0.5329522;
          b5 = -0.7616*b5 - w*0.016898;
          data[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11;
          b6 = w*0.115926;
        }
      } else if (color === 'brown') {
        let last = 0;
        for (let i=0;i<len;i++) {
          const w = Math.random()*2-1;
          last = (last + 0.02*w) / 1.02;
          data[i] = last*3.5;
        }
      } else {
        for (let i=0;i<len;i++) data[i] = Math.random()*2-1;
      }
      return buf;
    }

    function reverb(options) {
      const decay = options.decay == null ? 0.5 : options.decay;
      const mix = options.mix == null ? 0.3 : options.mix;
      const damping = options.damping == null ? 0 : options.damping;
      const input = ctx.createGain();
      const output = ctx.createGain();
      const dry = ctx.createGain();
      dry.gain.value = 1 - mix;
      input.connect(dry); dry.connect(output);
      const wet = ctx.createGain();
      wet.gain.value = mix;
      input.connect(wet);
      const wetOut = ctx.createGain();
      wetOut.connect(output);
      const len = Math.ceil(ctx.sampleRate * decay * (options.roomSize == null ? 1 : options.roomSize));
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch=0;ch<2;ch++) {
        const data = buf.getChannelData(ch);
        for (let i=0;i<len;i++) data[i] = (Math.random()*2-1) * Math.exp(-i/(len*0.28));
        if (damping > 0) {
          const c = Math.min(damping, 0.99);
          let prev = 0;
          for (let i=0;i<len;i++) {
            prev = data[i]*(1-c) + prev*c;
            data[i] = prev;
          }
        }
      }
      const conv = ctx.createConvolver();
      conv.buffer = buf;
      const pre = options.preDelay == null ? 0 : options.preDelay;
      if (pre > 0) {
        const pd = ctx.createDelay(Math.max(pre + 0.01, 1));
        pd.delayTime.value = pre;
        wet.connect(pd); pd.connect(conv);
      } else {
        wet.connect(conv);
      }
      conv.connect(wetOut);
      return {input, output};
    }

    function delayEffect(options) {
      const input = ctx.createGain();
      const output = ctx.createGain();
      input.connect(output);
      const delay = ctx.createDelay(1);
      delay.delayTime.value = options.delay;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = options.lowpass == null ? 4000 : options.lowpass;
      const fb = ctx.createGain();
      fb.gain.value = options.feedback;
      const wet = ctx.createGain();
      wet.gain.value = options.wet;
      input.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay);
      lp.connect(wet); wet.connect(output);
      return {input, output};
    }

    for (const layer of (patch.layers || [patch])) {
      const t = t0 + (layer.delay || 0);
      const gain = layer.gain == null ? 0.5 : layer.gain;
      const env = layer.envelope;
      const attack = env ? env.attack || 0 : 0;
      const decay = env ? env.decay : 0;
      const sustain = env ? env.sustain || 0 : 0;
      const release = env ? env.release || 0 : 0;
      const duration = env ? attack + decay + release : 0.5;

      const gainNode = ctx.createGain();
      if (!env) {
        gainNode.gain.setValueAtTime(gain, t);
        gainNode.gain.setTargetAtTime(S, t, 0.15);
      } else if (env.curve === 'ramp') {
        const peak = Math.max(gain, S);
        gainNode.gain.setValueAtTime(S, t);
        if (attack > 0) gainNode.gain.exponentialRampToValueAtTime(peak, t + attack);
        else gainNode.gain.setValueAtTime(peak, t);
        gainNode.gain.exponentialRampToValueAtTime(S, t + attack + decay);
      } else {
        gainNode.gain.setValueAtTime(S, t);
        if (attack > 0) gainNode.gain.linearRampToValueAtTime(gain, t + attack);
        else gainNode.gain.setValueAtTime(gain, t);
        if (sustain > 0) {
          gainNode.gain.setTargetAtTime(Math.max(sustain * gain, S), t + attack, decay / 3);
          if (release > 0) gainNode.gain.setTargetAtTime(S, t + attack + decay, release / 3);
        } else {
          gainNode.gain.setTargetAtTime(S, t + attack, decay / 3);
        }
      }

      let source;
      const s = layer.source;
      if (s.type === 'noise') {
        source = ctx.createBufferSource();
        source.buffer = noiseBuffer(duration + 0.1, s.color);
      } else {
        source = ctx.createOscillator();
        source.type = s.type;
        const f = s.frequency;
        if (typeof f === 'number') {
          source.frequency.setValueAtTime(f, t);
        } else {
          source.frequency.setValueAtTime(f.start, t);
          source.frequency.exponentialRampToValueAtTime(Math.max(f.end, 1), t + Math.min(f.time == null ? duration : f.time, duration));
        }
        if (s.detune) source.detune.value = s.detune;
      }
      source.start(t);
      source.stop(t + duration + 0.1);

      let node = source;
      const filters = !layer.filter ? [] : (Array.isArray(layer.filter) ? layer.filter : [layer.filter]);
      for (const filter of filters) {
        const bq = ctx.createBiquadFilter();
        bq.type = filter.type;
        bq.frequency.setValueAtTime(filter.frequency, t);
        bq.Q.value = filter.Q == null ? (filter.resonance == null ? 1 : filter.resonance) : filter.Q;
        node.connect(bq);
        node = bq;
      }
      node.connect(gainNode);

      let out = gainNode;
      for (const effect of (layer.effects || [])) {
        const built = effect.type === 'reverb' ? reverb(effect) : effect.type === 'delay' ? delayEffect(effect) : null;
        if (!built) continue;
        out.connect(built.input);
        out = built.output;
      }
      out.connect(master);
    }
  }

  const transitiontpqsh = {
    layers: [
      {
        source: { type: 'sine', frequency: 462.76758743560254 },
        envelope: { attack: 0.001, decay: 0.024966494668048036, sustain: 0, release: 0.004, curve: 'ramp' },
        gain: 0.224
      },
      {
        source: { type: 'sine', frequency: 519.4384134665165 },
        envelope: { attack: 0.001, decay: 0.06232769350904647, sustain: 0, release: 0.004, curve: 'ramp' },
        gain: 0.175,
        delay: 0.04566487630280263
      }
    ]
  };

  // Two-state portrait transition sound.
  // idle -> active uses the original patch; active -> idle uses the
  // procedural-sounds inverse convention supplied by the site owner.
  const STATIC_TRANSPOSE_RATIO = Math.pow(2, -3 / 12);

  function invertFrequency(freq) {
    if (typeof freq === 'number') return freq * STATIC_TRANSPOSE_RATIO;
    return { start: freq.end, end: freq.start };
  }

  function invertPatch(patch) {
    const clone = (value) =>
      typeof structuredClone === 'function'
        ? structuredClone(value)
        : JSON.parse(JSON.stringify(value));

    const layers = (patch.layers || [patch]).map(clone);
    const maxOnset = Math.max(...layers.map((layer) => layer.delay ?? 0));

    for (const layer of layers) {
      const mirrored = maxOnset - (layer.delay ?? 0);
      if (mirrored > 0) layer.delay = mirrored;
      else delete layer.delay;

      if (layer.source.type !== 'noise') {
        layer.source.frequency = invertFrequency(layer.source.frequency);
      }
    }

    return layers.length === 1 ? layers[0] : { layers };
  }

  const transitiontpqshInverse = invertPatch(transitiontpqsh);

  // Portrait transitions are deliberately explicit rather than state-toggled.
  // This prevents the audio direction from getting out of sync with the
  // portrait UI after guarded/deduplicated Safari click sequences.
  function playPortraitTransition(direction) {
    if (!enabled) return;
    try {
      playSound(direction === 'close' ? transitiontpqshInverse : transitiontpqsh);
    } catch {}
  }

  const recipes = {
    hover: {
      source:{type:'sine',frequency:{start:1506.3640368972165,end:1942.0289483185713}},
      envelope:{attack:0.002,decay:0.020750626168737744,sustain:0,release:0.004,curve:'ramp'},
      gain:0.11
    },
    tap: {
      source:{type:'sine',frequency:{start:400,end:200}},
      envelope:{attack:0,decay:0.048143939134802784,sustain:0,release:0.012,curve:'ramp'},
      gain:0.242
    },
    state: {
      layers:[
        {source:{type:'sine',frequency:475.2940772762051},envelope:{attack:0.002,decay:0.07242196105761449,sustain:0,release:0.011974452531090802,curve:'ramp'},gain:0.226,effects:[{type:'reverb',decay:0.3,damping:0.505,mix:0.14902013577574413}]},
        {source:{type:'sine',frequency:475.2940772762051},envelope:{attack:0.002,decay:0.09009522110389917,sustain:0,release:0.016732352992942668,curve:'ramp'},gain:0.243,delay:0.12652013476475887,effects:[{type:'reverb',decay:0.3,damping:0.505,mix:0.13663375667945202}]}
      ]
    },
    success: {
      layers:[
        {source:{type:'sine',frequency:390.208},envelope:{attack:0.002,decay:0.042,sustain:0,release:0,curve:'ramp'},gain:0.168},
        {source:{type:'sine',frequency:780.416},envelope:{attack:0.002,decay:0.046,sustain:0,release:0,curve:'ramp'},gain:0.154,delay:0.076},
        {source:{type:'sine',frequency:390.208},envelope:{attack:0.002,decay:0.048,sustain:0,release:0,curve:'ramp'},gain:0.134,delay:0.193},
        {source:{type:'sine',frequency:780.416},envelope:{attack:0.002,decay:0.191,sustain:0,release:0,curve:'ramp'},gain:0.134,delay:0.176}
      ]
    },
    error: {
      layers:[
        {source:{type:'noise',color:'white'},envelope:{attack:0.001018384097666117,decay:0.01,sustain:0,release:0.001,curve:'ramp'},gain:0.104,filter:{type:'bandpass',frequency:1911,Q:1.6}},
        {source:{type:'triangle',frequency:637.068},envelope:{attack:0.0008529671257160811,decay:0.028209112534630154,sustain:0,release:0.01,curve:'ramp'},gain:0.323,filter:{type:'lowpass',frequency:1911}},
        {source:{type:'noise',color:'white'},envelope:{attack:0.001876086784073693,decay:0.01,sustain:0,release:0.001,curve:'ramp'},gain:0.13,filter:{type:'bandpass',frequency:1911,Q:1.6},delay:0.101},
        {source:{type:'triangle',frequency:637.068},envelope:{attack:0.0011383168788817262,decay:0.046081931565451456,sustain:0,release:0.014,curve:'ramp'},gain:0.303,filter:{type:'lowpass',frequency:1911},delay:0.101}
      ]
    }
  };

  let enabled = true;
  let lastHoverAt = 0;

  window.FGSounds = {
    setEnabled(value){ enabled = Boolean(value); },
    playPortraitOpen(){ playPortraitTransition('open'); },
    playPortraitClose(){ playPortraitTransition('close'); },
    get enabled(){ return enabled; },
    prime(){
      if (!enabled) return;
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = playSound.ctx || (playSound.ctx = new Ctx());
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      } catch {}
    },
    play(name){
      if (!enabled || !recipes[name]) return;
      if (name === 'hover') {
        const now = performance.now();
        if (now - lastHoverAt < 55) return;
        lastHoverAt = now;
      }
      try { playSound(recipes[name]); } catch {}
    }
  };
})();
