(() => {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.hero, .page-hero').forEach(hero => {
    const canvas = document.createElement('canvas');
    canvas.className = 'brand-particles'; canvas.setAttribute('aria-hidden', 'true'); hero.prepend(canvas);
    const ctx = canvas.getContext('2d'); if (!ctx) { canvas.remove(); return; }
    let width = 0, height = 0, points = [], frame = 0, previous = 0, visible = true;
    const mouse = {x:-1000,y:-1000};
    const isMobile = () => window.innerWidth <= 768;
    function paint(delta = 0) {
      ctx.clearRect(0,0,width,height);
      for (const p of points) {
        p.x += p.vx * delta; p.y += p.vy * delta;
        if (delta && !isMobile()) {
          const dx = mouse.x-p.x, dy = mouse.y-p.y, distance = Math.hypot(dx,dy);
          if (distance < 120) { const force = (120-distance)/120*.01*delta; p.x -= dx*force; p.y -= dy*force; }
        }
        if (p.x < 0 || p.x > width) { p.vx *= -1; p.x = Math.max(0,Math.min(width,p.x)); }
        if (p.y < 0 || p.y > height) { p.vy *= -1; p.y = Math.max(0,Math.min(height,p.y)); }
        ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
        ctx.fillStyle = p.gold ? `rgba(255,215,0,${p.opacity})` : `rgba(68,111,242,${p.opacity*.65})`; ctx.fill();
      }
      for (let i=0;i<points.length;i++) for (let j=i+1;j<points.length;j++) {
        const a=points[i],b=points[j],distance=Math.hypot(a.x-b.x,a.y-b.y);
        if (distance>=140) continue;
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
        ctx.strokeStyle=`rgba(255,215,0,${(1-distance/140)*.1})`;ctx.lineWidth=.6;ctx.stroke();
      }
    }
    function animate(time) {
      frame=requestAnimationFrame(animate);if(time-previous<32)return;
      const delta=previous?Math.min((time-previous)/16.67,3):1;previous=time;paint(delta);
    }
    function sync() {
      if(frame)cancelAnimationFrame(frame);frame=0;previous=0;
      if(!reducedMotion.matches&&visible&&!document.hidden&&!document.querySelector('dialog[open]'))frame=requestAnimationFrame(animate);else paint();
    }
    function resize() {
      const nextWidth=Math.round(hero.clientWidth),nextHeight=Math.round(hero.clientHeight);
      if(nextWidth===width&&nextHeight===height)return;width=nextWidth;height=nextHeight;
      const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
      const count=Math.min(isMobile()?32:80,Math.max(18,Math.floor(width*height/(isMobile()?10000:12000))));
      points=Array.from({length:count},()=>({x:Math.random()*width,y:Math.random()*height,size:Math.random()*2+.6,vx:(Math.random()-.5)*.4,vy:(Math.random()-.5)*.4,opacity:Math.random()*.45+.15,gold:Math.random()>.3}));paint();sync();
    }
    hero.addEventListener('pointermove',event=>{if(event.pointerType!=='mouse')return;const rect=hero.getBoundingClientRect();mouse.x=event.clientX-rect.left;mouse.y=event.clientY-rect.top;},{passive:true});
    hero.addEventListener('pointerleave',()=>{mouse.x=mouse.y=-1000;});
    new ResizeObserver(resize).observe(hero);
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();}).observe(hero);
    document.addEventListener('visibilitychange',sync);reducedMotion.addEventListener('change',sync);
    const dialogs=new MutationObserver(sync);document.querySelectorAll('dialog').forEach(d=>dialogs.observe(d,{attributes:true,attributeFilter:['open']}));resize();
  });
  document.querySelectorAll('[data-evidence-gallery]').forEach(gallery=>{
    const track=gallery.querySelector('.evidence-track'),previous=gallery.querySelector('[data-evidence-prev]'),next=gallery.querySelector('[data-evidence-next]');
    const update=()=>{previous.disabled=track.scrollLeft<4;next.disabled=track.scrollLeft+track.clientWidth>=track.scrollWidth-4;};
    const move=direction=>{const card=track.querySelector('.evidence-card'),gap=parseFloat(getComputedStyle(track).gap)||20;track.scrollBy({left:direction*(card.getBoundingClientRect().width+gap),behavior:reducedMotion.matches?'instant':'smooth'});};
    previous.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));track.addEventListener('scroll',update,{passive:true});new ResizeObserver(update).observe(track);update();
  });
  const dialog=document.querySelector('#proof-lightbox');if(!dialog)return;let origin;
  document.querySelectorAll('[data-proof-image]').forEach(trigger=>trigger.addEventListener('click',()=>{
    origin=trigger;const img=dialog.querySelector('img');img.src=trigger.dataset.proofImage;img.alt=trigger.dataset.proofAlt;dialog.querySelector('p').textContent=trigger.dataset.proofCaption;dialog.showModal();document.body.classList.add('proof-open');
  }));
  dialog.querySelector('[data-proof-close]').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();});
  dialog.addEventListener('close',()=>{document.body.classList.remove('proof-open');origin?.focus({preventScroll:true});});
})();
