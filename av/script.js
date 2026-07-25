(() => {
  const avatars=[...document.querySelectorAll('.avatar')];
  const viewer=document.getElementById('viewer');
  const backdrop=viewer.querySelector('.viewer__backdrop');
  const label=document.getElementById('viewerLabel');
  const card=document.getElementById('openCard');
  const img=card.querySelector('.open-img');
  const canvas=card.querySelector('.open-canvas');
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const names={1:'01 — Alpha-aware bend',2:'02 — Plano transparente',3:'03 — Tilt sin bend',4:'04 — FLIP + bend breve'};
  let active=null, closing=false, bendRaf=0;

  // Hover: same behavior as the accepted version.
  avatars.forEach(avatar=>{
    const magnetic=avatar.querySelector('.avatar__magnetic');
    const tilt=avatar.querySelector('.avatar__tilt');
    let raf=0;
    const target={mx:0,my:0,rx:0,ry:0,scale:1};
    const current={mx:0,my:0,rx:0,ry:0,scale:1};
    function tick(){
      const k=.18;
      Object.keys(current).forEach(key=>current[key]+=(target[key]-current[key])*k);
      magnetic.style.transform=`translate3d(${current.mx}px,${current.my}px,0)`;
      tilt.style.transform=`rotateX(${current.rx}deg) rotateY(${current.ry}deg) scale(${current.scale})`;
      const delta=Math.max(...Object.keys(current).map(key=>Math.abs(target[key]-current[key])));
      raf=delta>.001?requestAnimationFrame(tick):0;
    }
    const animate=()=>{if(!raf)raf=requestAnimationFrame(tick)};
    function move(e){
      if(reduced||viewer.classList.contains('is-visible'))return;
      const r=avatar.getBoundingClientRect();
      const nx=Math.max(-1,Math.min(1,(e.clientX-(r.left+r.width/2))/(r.width/2)));
      const ny=Math.max(-1,Math.min(1,(e.clientY-(r.top+r.height/2))/(r.height/2)));
      const dist=Math.min(1,Math.hypot(nx,ny));
      const falloff=Math.pow(1-dist*.35,2);
      target.mx=nx*9*falloff;target.my=ny*9*falloff;
      target.rx=-ny*14;target.ry=nx*14;target.scale=1.085;
      avatar.classList.add('is-hovering');animate();
    }
    function leave(){Object.assign(target,{mx:0,my:0,rx:0,ry:0,scale:1});avatar.classList.remove('is-hovering');animate()}
    avatar.addEventListener('pointerenter',move);avatar.addEventListener('pointermove',move);avatar.addEventListener('pointerleave',leave);avatar.addEventListener('pointercancel',leave);
    avatar.addEventListener('click',()=>openOption(Number(avatar.dataset.option),avatar));
  });

  function resetCard(){
    cancelAnimationFrame(bendRaf);bendRaf=0;
    card.className='open-card';card.removeAttribute('style');canvas.removeAttribute('style');
    card.classList.remove('is-bending');ctx.clearRect(0,0,canvas.width,canvas.height);
  }

  function openOption(option,source){
    if(active||closing)return;
    active={option,source};label.textContent=names[option];resetCard();
    viewer.classList.add('is-visible');viewer.setAttribute('aria-hidden','false');
    if(option===4) openFlip(source); else openStandard(option);
  }

  function openStandard(option){
    card.classList.add('standard-start');
    requestAnimationFrame(()=>{
      card.classList.add('standard-open');
      if(option===1) runBend({mode:'alpha',strength:28,duration:300,sign:1,inset:0});
      if(option===2) runBend({mode:'plane',strength:28,duration:300,sign:1,inset:.08});
    });
  }

  function openFlip(source){
    const sr=source.getBoundingClientRect();
    const stage=card.parentElement.getBoundingClientRect();
    const sx=sr.width/stage.width, sy=sr.height/stage.height;
    const dx=(sr.left+sr.width/2)-(stage.left+stage.width/2);
    const dy=(sr.top+sr.height/2)-(stage.top+stage.height/2);
    card.classList.add('flip');
    card.style.transform=`translate3d(${dx}px,${dy}px,0) scale(${sx},${sy}) rotateX(0deg) rotateY(0deg)`;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      card.style.transform='translate3d(0,0,0) scale(1) rotateX(0deg) rotateY(0deg)';
      animateFlipTilt();
      setTimeout(()=>runBend({mode:'alpha',strength:22,duration:145,sign:1,inset:.04}),90);
    }));
  }

  function animateFlipTilt(){
    const anim=card.animate([
      {transform:card.style.transform,offset:0},
      {transform:'translate3d(0,0,70px) scale(.72) rotateX(22deg) rotateY(-14deg)',offset:.4},
      {transform:'translate3d(0,0,0) scale(1) rotateX(0) rotateY(0)',offset:1}
    ],{duration:620,easing:'linear',fill:'none'});
    anim.onfinish=()=>{};
  }

  function close(){
    if(!active||closing)return;closing=true;
    const {option,source}=active;
    if(option===4){
      const sr=source.getBoundingClientRect();const stage=card.parentElement.getBoundingClientRect();
      const sx=sr.width/stage.width,sy=sr.height/stage.height;
      const dx=(sr.left+sr.width/2)-(stage.left+stage.width/2);const dy=(sr.top+sr.height/2)-(stage.top+stage.height/2);
      card.style.transition=`transform 420ms cubic-bezier(.22,1,.36,1),opacity 120ms linear 300ms`;
      card.style.transform=`translate3d(${dx}px,${dy}px,0) scale(${sx},${sy}) rotateX(-9.9deg) rotateY(6.3deg)`;
      setTimeout(finishClose,430);
    }else{
      card.classList.remove('standard-open');card.classList.add('standard-close');
      if(option===1)runBend({mode:'alpha',strength:28,duration:220,sign:-.6,inset:0});
      if(option===2)runBend({mode:'plane',strength:28,duration:220,sign:-.6,inset:.08});
      setTimeout(finishClose,430);
    }
  }
  function finishClose(){viewer.classList.remove('is-visible');viewer.setAttribute('aria-hidden','true');resetCard();active=null;closing=false}
  backdrop.addEventListener('click',close);card.addEventListener('click',close);document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});

  // Organic bend renderer. Option 1 samples outside the source as transparent.
  // Option 2 first places the image inside a transparent plane, making clamping harmless.
  const NZ=64,nzR=new Float32Array(NZ*NZ),nzG=new Float32Array(NZ*NZ);
  {let s=11;for(let i=0;i<NZ*NZ;i++){s=(s*1664525+1013904223)>>>0;nzR[i]=s/2147483648-1;s=(s*1664525+1013904223)>>>0;nzG[i]=s/2147483648-1}}
  function grid(g,x,y){const xi=Math.floor(x),yi=Math.floor(y);let fx=x-xi,fy=y-yi;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);const x0=((xi%NZ)+NZ)%NZ,x1=(x0+1)%NZ,y0=((yi%NZ)+NZ)%NZ,y1=(y0+1)%NZ;const top=g[y0*NZ+x0]+(g[y0*NZ+x1]-g[y0*NZ+x0])*fx,bot=g[y1*NZ+x0]+(g[y1*NZ+x1]-g[y0*NZ+x0])*fx;return top+(bot-top)*fy}
  function noise(g,x,y){return(grid(g,x/110,y/70)+.5*grid(g,x/55+37.7,y/35+11.3))/1.5}
  function runBend({mode,strength,duration,sign,inset}){
    if(reduced||!img.complete)return;
    cancelAnimationFrame(bendRaf);
    const dpr=Math.min(devicePixelRatio||1,2),cw=card.offsetWidth,ch=card.offsetHeight;
    const sw=Math.round(cw*dpr),sh=Math.round(ch*dpr),pad=Math.ceil(Math.abs(strength)*.32)+5,pd=Math.round(pad*dpr);
    canvas.style.left=`-${pad}px`;canvas.style.top=`-${pad}px`;canvas.style.width=`${cw+pad*2}px`;canvas.style.height=`${ch+pad*2}px`;canvas.width=sw+pd*2;canvas.height=sh+pd*2;
    const sc=document.createElement('canvas');sc.width=sw;sc.height=sh;const sx=sc.getContext('2d',{willReadFrequently:true});
    const insetPx=Math.round(sw*inset);sx.clearRect(0,0,sw,sh);sx.drawImage(img,insetPx,insetPx,sw-insetPx*2,sh-insetPx*2);
    const src=sx.getImageData(0,0,sw,sh).data,out=ctx.createImageData(canvas.width,canvas.height),dst=out.data;
    const LAT=8,lw=Math.ceil(canvas.width/LAT)+2,lh=Math.ceil(canvas.height/LAT)+2,fxf=new Float32Array(lw*lh),fyf=new Float32Array(lw*lh);
    for(let ly=0;ly<lh;ly++){const py=(ly*LAT-pd)/dpr;for(let lx=0;lx<lw;lx++){const px=(lx*LAT-pd)/dpr,q=(2*px-cw)/(1.4*cw),i=ly*lw+lx;fxf[i]=.0016+.09*noise(nzR,px,py);fyf[i]=.4116*(1-q*q)-.41+.09*noise(nzG,px,py)}}
    card.classList.add('is-bending');const t0=performance.now();
    function sample(x,y,channel){
      if(mode==='alpha'&&(x<0||y<0||x>sw-1||y>sh-1))return 0;
      x=Math.max(0,Math.min(sw-1,x));y=Math.max(0,Math.min(sh-1,y));
      const x0=Math.min(sw-2,Math.floor(x)),y0=Math.min(sh-2,Math.floor(y)),u=x-x0,v=y-y0;
      const i=(y0*sw+x0)*4;return src[i+channel]*(1-u)*(1-v)+src[i+4+channel]*u*(1-v)+src[i+sw*4+channel]*(1-u)*v+src[i+sw*4+4+channel]*u*v;
    }
    function frame(now){
      const p=Math.min((now-t0)/duration,1),e=1-Math.pow(1-p,3),env=Math.sin(Math.PI*e),sdev=strength*sign*env*dpr,W=canvas.width,H=canvas.height,inv=1/LAT;let di=0;
      for(let y=0;y<H;y++){const gy=y*inv,y0=gy|0,fy=gy-y0,r0=y0*lw,r1=r0+lw;for(let x=0;x<W;x++,di+=4){const gx=x*inv,x0=gx|0,fx=gx-x0,a=r0+x0,b=r1+x0;const FX=(fxf[a]+(fxf[a+1]-fxf[a])*fx)*(1-fy)+(fxf[b]+(fxf[b+1]-fxf[b])*fx)*fy;const FY=(fyf[a]+(fyf[a+1]-fyf[a])*fx)*(1-fy)+(fyf[b]+(fyf[b+1]-fyf[b])*fx)*fy;const px=x-pd+sdev*FX,py=y-pd+sdev*FY;dst[di]=sample(px,py,0);dst[di+1]=sample(px,py,1);dst[di+2]=sample(px,py,2);dst[di+3]=sample(px,py,3)}}
      ctx.putImageData(out,0,0);
      if(p<1)bendRaf=requestAnimationFrame(frame);else{card.classList.remove('is-bending');bendRaf=0}
    }
    bendRaf=requestAnimationFrame(frame);
  }
})();
