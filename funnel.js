(() => {
  'use strict';
  const config = window.FUNNEL_CONFIG;
  if (!config) return;
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const page = document.body.dataset.page;
  const scripts = new Map();

  function httpsUrl(value) {
    try { const url = new URL(value); return url.protocol === 'https:' ? url : null; }
    catch { return null; }
  }

  function loadScript(src) {
    if (scripts.has(src)) return scripts.get(src);
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src; script.async = true;
      const timeout = setTimeout(() => reject(new Error('Loading timed out')), 15000);
      script.onload = () => { clearTimeout(timeout); resolve(); };
      script.onerror = () => { clearTimeout(timeout); reject(new Error('Loading failed')); };
      document.head.append(script);
    });
    scripts.set(src, promise);
    promise.catch(() => scripts.delete(src));
    return promise;
  }

  const focusOrigins = new WeakMap();
  function openDialog(dialog, trigger) {
    if (!dialog || dialog.open) return;
    focusOrigins.set(dialog, trigger || document.activeElement);
    dialog.showModal();
    document.body.classList.add('modal-open');
  }
  function closeDialog(dialog) { if (dialog?.open) dialog.close(); }
  $$('dialog').forEach(dialog => {
    $$('[data-close]', dialog).forEach(button => button.addEventListener('click', () => closeDialog(dialog)));
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeDialog(dialog);
    });
    dialog.addEventListener('close', () => {
      if (dialog.id === 'testimonial-dialog') $('.media-content', dialog).replaceChildren();
      if (!document.querySelector('dialog[open]')) document.body.classList.remove('modal-open');
      const origin = focusOrigins.get(dialog);
      if (origin?.isConnected) origin.focus({preventScroll: true});
    });
  });

  const privacy = httpsUrl(config.privacyPolicyUrl);
  if (privacy) $$('[data-privacy]').forEach(link => { link.href = privacy.href; link.hidden = false; link.target = '_blank'; link.rel = 'noopener noreferrer'; });

  // Calendar exports use the confirmed webinar date, never a call appointment.
  function initWebinarCalendar() {
    if (!$('[data-calendar]')) return;
    const event = config.webinar;
    const start = new Date(event.startsAt);
    if (!Number.isFinite(start.getTime())) return;
    const end = new Date(start.getTime() + event.calendarDurationMinutes * 60000);
    const compact = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const detail = 'Webinar sa Stefanom Šćirbanom. Informacije za pristup su u potvrdi prijave na mejlu.';
    const location = httpsUrl(event.joinUrl)?.href || 'Online — link u potvrdi prijave na mejlu';
    const google = new URL('https://calendar.google.com/calendar/render');
    google.search = new URLSearchParams({action:'TEMPLATE', text:event.title, dates:`${compact(start)}/${compact(end)}`, details:detail, location, ctz:event.timeZone}).toString();
    $('[data-calendar="google"]').href = google.href;
    const outlook = new URL('https://outlook.live.com/calendar/0/deeplink/compose');
    outlook.search = new URLSearchParams({path:'/calendar/action/compose', rru:'addevent', subject:event.title, startdt:start.toISOString(), enddt:end.toISOString(), body:detail, location}).toString();
    $('[data-calendar="outlook"]').href = outlook.href;
    $('[data-calendar="apple"]').addEventListener('click', eventClick => {
      eventClick.preventDefault();
      const escapeIcs = text => text.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
      // RFC 5545 folds at at most 75 UTF-8 octets, preserving Serbian characters.
      const fold = text => {
        const encoder = new TextEncoder(); let line = ''; let bytes = 0; const lines = [];
        for (const ch of text) { const n = encoder.encode(ch).length; if (bytes+n > 74) { lines.push(line); line=' '; bytes=1; } line+=ch; bytes+=n; }
        lines.push(line); return lines.join('\r\n');
      };
      const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Stefan Scirban//Webinar//SR','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',
        'UID:stefan-webinar-20261115@stefanscirban.com',`DTSTAMP:${compact(new Date())}`,`DTSTART:${compact(start)}`,`DTEND:${compact(end)}`,
        `SUMMARY:${escapeIcs(config.webinar.title)}`,`DESCRIPTION:${escapeIcs(detail)}`,`LOCATION:${escapeIcs(location)}`,
        'BEGIN:VALARM','TRIGGER:-PT30M','ACTION:DISPLAY','DESCRIPTION:Webinar počinje za 30 minuta','END:VALARM','END:VEVENT','END:VCALENDAR'].map(fold).join('\r\n')+'\r\n';
      const url = URL.createObjectURL(new Blob([ics],{type:'text/calendar;charset=utf-8'}));
      const link = document.createElement('a'); link.href=url; link.download='Stefan-webinar-15-11-2026.ics'; document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      $('#calendar-status').textContent = 'Otvori preuzeti .ics fajl i potvrdi dodavanje u kalendar.';
    });
  }
  initWebinarCalendar();

  // Real testimonials: load third-party players only after a visitor chooses one.
  $$('[data-testimonial]').forEach(button => button.addEventListener('click', () => {
    const url = httpsUrl(button.dataset.testimonial);
    if (!url || url.hostname !== 'player.vimeo.com') return;
    url.searchParams.set('autoplay', '1'); url.searchParams.set('dnt', '1');
    const dialog = $('#testimonial-dialog');
    $('#media-heading').textContent = `${button.dataset.person} — iskustvo sa Stefanovom edukacijom`;
    const iframe = document.createElement('iframe'); iframe.src = url.href; iframe.title = `Video testimonial: ${button.dataset.person}`;
    iframe.allow='autoplay; fullscreen; picture-in-picture'; iframe.allowFullscreen=true; iframe.referrerPolicy='strict-origin-when-cross-origin';
    $('.media-content', dialog).replaceChildren(iframe);
    openDialog(dialog, button);
  }));
  $$('[data-message-image]').forEach(button => button.addEventListener('click', () => {
    const dialog = $('#message-dialog'); const img = $('img', dialog);
    img.src = button.dataset.messageImage; img.alt = button.dataset.imageAlt;
    openDialog(dialog, button);
  }));

  let bookingRevealed = !config.videos.thankYou || page !== 'thank-you';
  function setBookingVisible(visible) {
    $$('[data-booking-section]').forEach(el => { el.hidden = !visible; });
    document.body.classList.toggle('has-sticky', visible && page !== 'ccp');
  }
  if (page === 'thank-you') setBookingVisible(bookingRevealed);
  function revealBooking() {
    if (page !== 'thank-you' || bookingRevealed) return;
    bookingRevealed = true; setBookingVisible(true);
  }
  function videoProgress(seconds, ended = false) {
    if (seconds >= config.thankYouBookingRevealSeconds || ended) revealBooking();
  }

  function parseVideo(value) {
    const url = httpsUrl(value);
    if (!url) return null;
    if (['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(url.hostname)) {
      const match = url.pathname.match(/^\/(?:video\/)?(\d+)(?:\/([a-zA-Z0-9]+))?\/?$/);
      if (!match) return null;
      const embed = new URL(`https://player.vimeo.com/video/${match[1]}`);
      const hash = url.searchParams.get('h') || match[2];
      if (hash) embed.searchParams.set('h', hash);
      embed.searchParams.set('dnt','1'); return {provider:'vimeo', url:embed.href, original:url.href};
    }
    if (['youtube.com','www.youtube.com','youtu.be','www.youtube-nocookie.com'].includes(url.hostname)) {
      const id = url.hostname === 'youtu.be' ? url.pathname.slice(1) : (url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1]);
      if (!/^[\w-]{11}$/.test(id || '')) return null;
      return {provider:'youtube', id, original:url.href};
    }
    if (/\.(mp4|webm)$/i.test(url.pathname)) return {provider:'file', url:url.href, original:url.href};
    return null;
  }

  let youtubeReady;
  function youtubeApi() {
    if (window.YT?.Player) return Promise.resolve();
    if (youtubeReady) return youtubeReady;
    youtubeReady = new Promise((resolve,reject) => {
      const timeout = setTimeout(() => reject(new Error('Video loading timed out')),15000);
      window.onYouTubeIframeAPIReady = () => { clearTimeout(timeout); resolve(); };
      loadScript('https://www.youtube.com/iframe_api').catch(reject);
    });
    return youtubeReady;
  }
  function videoFailure(container, source) {
    const message = document.createElement('div'); message.className='media-error';
    const text = document.createElement('p'); text.textContent='Video trenutno ne može da se učita.';
    const link = document.createElement('a'); link.href=source; link.target='_blank'; link.rel='noopener noreferrer'; link.textContent='Otvori video u novom prozoru';
    message.append(text, link); container.replaceChildren(message);
    // A third-party player outage must not permanently hide the call CTA.
    revealBooking();
  }
  let playerSequence = 0;
  async function mountVideo(container, value, track = false) {
    const parsed = parseVideo(value);
    if (!parsed) {
      if (value) { const status = $('[data-video-status]',container); if(status) status.textContent='Video trenutno nije dostupan'; revealBooking(); }
      return () => {};
    }
    const token = String(++playerSequence); container.dataset.playerToken=token;
    container.classList.add('has-video');
    let disposed=false, destroy=() => {};
    const current = () => !disposed && container.dataset.playerToken === token;
    const fail = () => { if (current()) videoFailure(container, parsed.original); };
    try {
      if (parsed.provider === 'file') {
        const video=document.createElement('video'); video.controls=true; video.playsInline=true; video.preload='metadata'; video.src=parsed.url;
        if (track) { video.addEventListener('timeupdate',()=>videoProgress(video.currentTime)); video.addEventListener('ended',()=>videoProgress(0,true)); }
        video.addEventListener('error', fail); container.replaceChildren(video);
        destroy=()=>{video.pause();video.removeAttribute('src');video.load();};
      } else if (parsed.provider === 'vimeo') {
        const iframe=document.createElement('iframe'); iframe.src=parsed.url; iframe.title=container.getAttribute('aria-label')||'Video'; iframe.allow='autoplay; fullscreen; picture-in-picture'; iframe.allowFullscreen=true;
        container.replaceChildren(iframe);
        await loadScript('https://player.vimeo.com/api/player.js');
        if (!current()) return () => {};
        const player=new window.Vimeo.Player(iframe);
        player.on('error',fail);
        if (track) { player.on('timeupdate',data=>videoProgress(data.seconds)); player.on('ended',()=>videoProgress(0,true)); }
        destroy=()=>{player.destroy().catch(()=>{});};
      } else {
        const holder=document.createElement('div'); holder.id=`main-player-${token}`; container.replaceChildren(holder);
        await youtubeApi(); if (!current()) return () => {};
        let poll;
        const player=new window.YT.Player(holder, {videoId:parsed.id, host:'https://www.youtube-nocookie.com', playerVars:{playsinline:1,rel:0,origin:location.origin},events:{
          onReady:()=>{ if(track) poll=setInterval(()=>{ if (current() && player.getPlayerState()===1) videoProgress(player.getCurrentTime()); },1000); },
          onStateChange:event=>{if(track&&event.data===0)videoProgress(0,true);}, onError:fail
        }});
        destroy=()=>{clearInterval(poll);player.destroy();};
      }
    } catch { fail(); }
    return () => {disposed=true;destroy();};
  }

  // Replay uses one absolute launch and expiry for everyone. Nothing resets on refresh.
  function initReplay() {
    const container=$('[data-main-video="replay"]'); if(!container) return;
    const start=Date.parse(config.replay.availableAt), end=Date.parse(config.replay.expiresAt);
    const valid=Number.isFinite(start)&&Number.isFinite(end)&&end>start;
    const source=config.videos.replay;
    let state='', cleanup=()=>{};
    const placeholder=container.innerHTML;
    const format=new Intl.DateTimeFormat('sr-Latn-RS',{timeZone:config.webinar.timeZone,day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});
    function write(selector,text){$$(selector).forEach(el=>{if(el.textContent!==text)el.textContent=text;});}
    function tick() {
      const now=Date.now();
      const next=!valid?'pending':now>=end?'expired':now<start?'scheduled':source?'active':'processing';
      if(next!==state){
        cleanup();cleanup=()=>{};container.dataset.playerToken='';container.classList.remove('has-video');container.innerHTML=placeholder;state=next;
        if(next==='active') {
          mountVideo(container,source).then(stop=>{if(state==='active')cleanup=stop;else stop();});
        } else {
          const status=$('[data-video-status]',container);
          if(next==='expired'){
            $('.video-copy h2',container).textContent='Dostupnost snimka je završena.';
            $('.video-copy>p',container).textContent='Ako želiš da pogledamo tvoju situaciju, i dalje možeš da zakažeš besplatnu analizu webshopa.';
            status.textContent='Snimak više nije dostupan';
          } else status.textContent=next==='processing'?'Snimak je u pripremi':'Snimak stiže nakon webinara';
        }
      }
      if(next==='active'||next==='processing'){
        const seconds=Math.max(0,Math.ceil((end-now)/1000));
        const pad=x=>String(x).padStart(2,'0');
        const d=Math.floor(seconds/86400),h=Math.floor(seconds%86400/3600),m=Math.floor(seconds%3600/60),s=seconds%60;
        const count=`${pad(d)}d : ${pad(h)}h : ${pad(m)}m : ${pad(s)}s`;
        write('[data-replay-status]',`Snimak dostupan do ${format.format(new Date(end))}.`);
        write('[data-replay-countdown]',count);write('[data-replay-mobile]',count);
        write('[data-replay-deadline]',`Pristup snimku se zatvara ${format.format(new Date(end))} (Beograd / Zagreb).`);
      } else if(next==='expired'){
        write('[data-replay-status]','Dostupnost snimka je završena.');write('[data-replay-countdown]','00d : 00h : 00m : 00s');write('[data-replay-mobile]','Snimak je istekao');
        write('[data-replay-deadline]','Snimak je istekao. Možeš da zakažeš besplatnu analizu webshopa.');
      } else if(next==='scheduled'){
        write('[data-replay-status]',`Snimak je dostupan od ${format.format(new Date(start))}.`);write('[data-replay-countdown]','REPLAY USKORO');write('[data-replay-mobile]','Replay uskoro');
        write('[data-replay-deadline]',`Snimak stiže ${format.format(new Date(start))} i dostupan je do ${format.format(new Date(end))}.`);
      }
    }
    tick(); const interval=setInterval(tick,1000);
    window.addEventListener('pagehide',()=>{clearInterval(interval);cleanup();},{once:true});
  }
  if (page==='replay') initReplay();
  else $$('[data-main-video]').forEach(container=>mountVideo(container,config.videos[container.dataset.mainVideo],page==='thank-you'));

  const form=$('#qualification-form');
  if(!form)return;
  const dialog=$('#qualification-dialog'), flow=$('#qualification-flow'), result=$('#qualification-result'), panel=$('#calendar-panel');
  const steps=$$('[data-step]',form); let step=0; let dqControl=null; let calendarReady=false;
  const fields=['product','budget','revenue','manager','problem','goal','readiness','webshop','instagram'];
  const data=()=>Object.fromEntries(fields.map(name=>[name,(form.elements.namedItem(name)?.value||'').trim()]));
  function showStep(index,focus=true){
    step=index;flow.hidden=false;result.hidden=true;panel.hidden=true;
    steps.forEach((el,i)=>{el.hidden=i!==step;el.disabled=i!==step;});
    $('#step-number').textContent=String(step+1);$('#step-progress').style.width=`${(step+1)/3*100}%`;
    $('#qual-back').hidden=step===0;$('#qual-next-label').textContent=step===2?'Prikaži slobodne termine':'Nastavi';
    $('#qual-error').hidden=true;dialog.scrollTop=0;
    if(focus)$('#qual-title').focus({preventScroll:true});
  }
  function showResult(heading,description,note,isUnavailable=false){
    flow.hidden=true;panel.hidden=true;result.hidden=false;
    $('#result-heading').textContent=heading;$('#result-description').textContent=description;$('#result-note').textContent=note;
    $('#result-close').firstChild.textContent=isUnavailable?'Vrati se na stranicu':'Nastavi sa webinarom';
    $('#result-heading').focus({preventScroll:true});dialog.scrollTop=0;
  }
  function disqualify(reason,control){
    dqControl=control;
    const messages={
      product:'Ova analiza je namenjena vlasnicima webshopova koji već prodaju fizičke proizvode preko svog sajta. Webinar i dalje može da ti pomogne da bolje razumeš oglašavanje.',
      budget:'Ovaj program je napravljen za webshopove koji već ulažu najmanje 1.500 € mesečno u oglase, pa ti trenutno ne bi doneo punu vrednost. Za početak, iskoristi sadržaj webinara za svoj sledeći korak.',
      readiness:'Program podrazumeva primenu dogovorenih koraka i ulaganje vremena i novca tokom 16 nedelja. Dok istražuješ opcije, pogledaj webinar i proceni šta možeš da primeniš u svom webshopu.'
    };
    showResult('Hvala na iskrenosti.',messages[reason],'Tvoji odgovori nisu poslati. Tvoja prijava za webinar ostaje važeća.');
  }
  $$('[data-book]').forEach(button=>button.addEventListener('click',()=>{
    openDialog(dialog,button);
    if(!calendarReady && result.hidden) showStep(step);
  }));
  form.addEventListener('change',event=>{
    const target=event.target;
    target.setCustomValidity?.('');
    const option=target.tagName==='SELECT'?target.selectedOptions[0]:target;
    if(option?.dataset.dq)disqualify(option.dataset.dq,target);
  });
  form.addEventListener('input',event=>event.target.setCustomValidity?.(''));
  $('#qual-back').addEventListener('click',()=>showStep(Math.max(0,step-1)));
  $('#result-close').addEventListener('click',()=>closeDialog(dialog));
  $('#qual-revise').addEventListener('click',()=>{
    if(dqControl){if(dqControl.type==='radio')dqControl.checked=false;else dqControl.value='';dqControl=null;}
    showStep(step);
  });
  function validateStep(){
    const controls=$$('input,select,textarea',steps[step]);
    for(const field of controls){
      field.setCustomValidity('');
      if(field.type==='url'&&field.value.trim()&&!/^[a-z]+:\/\//i.test(field.value))field.value='https://'+field.value.trim();
      if(field.required&&field.type!=='radio'&&!field.value.trim())field.setCustomValidity('Popuni ovo polje.');
      if(field.name==='webshop'&&field.value){try{const url=new URL(field.value);if(!['http:','https:'].includes(url.protocol)||!url.hostname.includes('.'))field.setCustomValidity('Unesi važeći link webshopa.');}catch{field.setCustomValidity('Unesi važeći link webshopa.');}}
      if(!field.checkValidity()){
        $('#qual-error').textContent='Popuni obavezna polja da nastaviš.';$('#qual-error').hidden=false;field.reportValidity();return false;
      }
    }
    return true;
  }
  function getBookingSetup(){
    const url=httpsUrl(config.booking.calendlyUrl), map=config.booking.questionMap;
    if(!url||url.hostname!=='calendly.com'||url.pathname.split('/').filter(Boolean).length<2)return null;
    const questions=fields.map(key=>map[key]);
    if(questions.some(q=>!/^a(?:[1-9]|10)$/.test(q))||new Set(questions).size!==fields.length)return null;
    return {url,map};
  }
  async function showCalendar(answers){
    const setup=getBookingSetup();
    if(!setup){
      showResult('Termini trenutno nisu dostupni.','Kalendar za besplatnu analizu još nije otvoren. Poziv nije zakazan, a tvoji odgovori nisu poslati.','Vrati se na stranicu i nastavi sa sadržajem webinara.',true);return;
    }
    flow.hidden=true;result.hidden=true;panel.hidden=false;dialog.scrollTop=0;$('h2',panel).focus({preventScroll:true});
    const customAnswers=Object.fromEntries(fields.map(name=>[setup.map[name],answers[name]||'Nije navedeno']));
    const host=$('#calendar-embed');host.replaceChildren();
    const fallback=$('#calendar-fallback');fallback.hidden=true;
    const fallbackUrl=new URL(setup.url);Object.entries(customAnswers).forEach(([key,value])=>fallbackUrl.searchParams.set(key,value));
    fallback.href=fallbackUrl.href;
    const loadStatus=$('#calendar-load-status');loadStatus.textContent='Učitavanje slobodnih termina…';
    setup.url.searchParams.set('hide_gdpr_banner','0');setup.url.searchParams.set('primary_color','c4a300');
    try{
      await loadScript('https://assets.calendly.com/assets/external/widget.js');
      window.Calendly.initInlineWidget({url:setup.url.href,parentElement:host,prefill:{customAnswers},utm:{utmSource:'webinar',utmMedium:page,utmCampaign:'stefan-webinar-20261115'}});
      calendarReady=true;fallback.hidden=false;
      loadStatus.textContent='Ako se termini ne prikažu, otvori kalendar u novom prozoru.';
    }catch{
      loadStatus.textContent='Kalendar se nije učitao. Otvori ga u novom prozoru da izabereš termin.';fallback.hidden=false;
    }
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();if(!validateStep())return;
    const answers=data();
    if(answers.product!=='Fizički proizvod preko svog webshopa'){disqualify('product',form.elements.product);return;}
    if(answers.budget==='Manje od 1.500 €'){disqualify('budget',form.elements.budget);return;}
    if(step<2){showStep(step+1);return;}
    if(answers.readiness!=='Da'){disqualify('readiness',form.elements.readiness);return;}
    showCalendar(answers);
  });
  // A real completion message from our own calendar iframe triggers the CCP.
  // No fake local appointments, fabricated timeslots, or success on form submit.
  window.addEventListener('message',event=>{
    if(event.origin!=='https://calendly.com'||event.data?.event!=='calendly.event_scheduled')return;
    const iframe=$('#calendar-embed iframe');if(!iframe||event.source!==iframe.contentWindow||!calendarReady)return;
    const payload=event.data.payload;
    if(!payload?.event?.uri||!payload?.invitee?.uri)return;
    const next=new URL(config.booking.confirmationPath,location.origin);
    if(next.origin===location.origin)location.assign(next.href);
  });
})();
