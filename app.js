'use strict';
(() => {
  const C = window.WEBINAR_CONFIG;
  const dialog = document.getElementById('registration-dialog');
  const form = document.getElementById('registration-form');
  const status = document.getElementById('form-status');
  const submit = document.getElementById('submit-registration');
  const defaultSubmit = submit.innerHTML;
  const inputs = {
    name: document.getElementById('first-name'),
    email: document.getElementById('email'),
    phone: document.getElementById('phone')
  };
  let opener;
  const eventDate = C.startsAt ? new Date(C.startsAt) : null;
  const validDate = eventDate && Number.isFinite(eventDate.getTime());

  if (validDate) {
    const eventDay = new Intl.DateTimeFormat('sr-Latn-RS', {
      timeZone: C.timeZone, day: 'numeric', month: 'long'
    }).format(eventDate);
    const eventTime = new Intl.DateTimeFormat('sr-Latn-RS', {
      timeZone: C.timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).format(eventDate);
    const dateLabel = `${eventDay} u ${eventTime}`;
    document.querySelectorAll('[data-event-date]').forEach(el => el.textContent = dateLabel);
    const counters = [...document.querySelectorAll('[data-countdown]')].map(el => ({
      el, days: el.querySelector('[data-days]'), hours: el.querySelector('[data-hours]'),
      minutes: el.querySelector('[data-minutes]'), seconds: el.querySelector('[data-seconds]')
    }));
    const labels = document.querySelectorAll('[data-countdown-label]');
    const tick = () => {
      const ms = eventDate.getTime() - Date.now();
      const total = Math.max(0, Math.ceil(ms / 1000));
      const remaining = {
        days: Math.floor(total / 86400), hours: Math.floor(total / 3600) % 24,
        minutes: Math.floor(total / 60) % 60, seconds: total % 60
      };
      counters.forEach(counter => {
        Object.entries(remaining).forEach(([unit, value]) => {
          counter[unit].textContent = String(value).padStart(2, '0');
        });
        counter.el.setAttribute('aria-label', ms > 0
          ? `Do webinara: ${remaining.days} dana, ${remaining.hours} sati, ${remaining.minutes} minuta i ${remaining.seconds} sekundi.`
          : 'Webinar je počeo.');
      });
      labels.forEach(el => el.textContent = ms > 0 ? 'Počinjemo za' : 'Webinar je počeo');
    };
    tick(); setInterval(tick, 1000);
  }
  if (C.privacyPolicyUrl) {
    const link = document.getElementById('privacy-link');
    link.href = C.privacyPolicyUrl; link.hidden = false;
  }

  const openForm = event => {
    opener = event.currentTarget;
    status.hidden = true;
    dialog.showModal();
    document.body.classList.add('modal-open');
    inputs.name.focus({ preventScroll: true });
  };
  document.querySelectorAll('[data-register]').forEach(button => button.addEventListener('click', openForm));
  document.getElementById('close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    if (opener) opener.focus({ preventScroll: true });
  });
  let pointerOnBackdrop = false;
  dialog.addEventListener('pointerdown', event => {
    const r = dialog.getBoundingClientRect();
    pointerOnBackdrop = event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom;
  });
  dialog.addEventListener('click', event => {
    const r = dialog.getBoundingClientRect();
    const outside = event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom;
    if (pointerOnBackdrop && outside) dialog.close();
  });
  const error = (key, message) => {
    const el = inputs[key];
    document.getElementById(`${key}-error`).textContent = message;
    if (message) el.setAttribute('aria-invalid', 'true');
    else el.removeAttribute('aria-invalid');
  };
  Object.entries(inputs).forEach(([key, el]) => el.addEventListener('input', () => {
    error(key, ''); status.hidden = true;
  }));
  const showStatus = message => { status.textContent = message; status.hidden = false; };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    status.hidden = true;
    const first = inputs.name.value.trim();
    const email = inputs.email.value.trim();
    const phone = inputs.phone.value.trim();
    const phoneDigits = phone.replace(/\D/g, '');
    const errors = {
      name: first.length >= 2 ? '' : 'Upiši svoje ime.',
      email: email && inputs.email.validity.valid && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'Upiši ispravnu email adresu.',
      phone: /^[+()\d\s.-]+$/.test(phone) && phoneDigits.length >= 7 && phoneDigits.length <= 15 ? '' : 'Upiši ispravan broj telefona sa pozivnim brojem.'
    };
    Object.entries(errors).forEach(([key, message]) => error(key, message));
    const firstError = Object.keys(errors).find(key => errors[key]);
    if (firstError) { inputs[firstError].focus(); return; }
    const AE = C.aevent || {};
    if (!AE.tenant || !AE.wtl || !AE.webinarId || !validDate || !C.redirectUrl) {
      showStatus('Ovo je pregled prijavne forme. Podaci nisu poslati i prijava nije zabeležena.');
      return;
    }
    if (eventDate.getTime() <= Date.now()) {
      showStatus('Prijave za ovaj termin su završene.');
      return;
    }
    submit.disabled = true; submit.textContent = 'Šaljemo tvoju prijavu…';
    if (C.trackingEnabled && window.fbq) window.fbq('track', 'Lead');
    // Store only the first name and booked webinar time, for the confirmation page.
    try { sessionStorage.setItem('reg', JSON.stringify({first, session_start_iso: eventDate.toISOString()})); } catch (_) {}
    // AEvent's response is opaque (no-cors), so wait at most 5 s, then continue to the thank-you page.
    await Promise.race([
      aeventRegister(AE, first, email, phone),
      new Promise(resolve => setTimeout(resolve, 5000))
    ]);
    window.location.assign(new URL(C.redirectUrl, location.href).toString());
  });

  /* AEvent accepts the phone as digits only, with the country code and no "+":
     +381 60 123 4567 / 00381 60... / 060 123 4567 -> 381601234567 */
  function aeventPhone(phone, countryCode) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (/^\s*\+/.test(phone)) return digits;
    if (digits.startsWith('00')) return digits.slice(2);
    if (digits.startsWith('0') && countryCode) return countryCode + digits.slice(1);
    return digits;
  }

  /* 1) GET campaign data + token (without the token AEvent stalls the registrant at the CAPTCHA step),
     2) POST the registration. The optin domain must be whitelisted in AEvent.
     Success is visible only in AEvent > campaign > Registrants. */
  async function aeventRegister(AE, name, email, phone) {
    const base = `https://${AE.tenant}.aevent.online`;
    let tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (_) {}
    let token = '';
    let webinarId = String(AE.webinarId).replace(/\D/g, '');
    try {
      const r = await fetch(`${base}/getdata?wtl=${encodeURIComponent(AE.wtl)}&page=registration&type=json`);
      const d = await r.json();
      token = (d && d.token) || '';
      const scheduled = d && d.upcomingWebinars && d.upcomingWebinars[0] && d.upcomingWebinars[0].webinarID;
      if (scheduled) webinarId = String(scheduled).replace(/\D/g, '');
    } catch (_) {}
    const body = new URLSearchParams();
    if (token) body.append('token', token);
    body.append('wtl', AE.wtl);
    body.append('webinarid', webinarId);
    body.append('name', name);
    body.append('email', email);
    body.append('phone', aeventPhone(phone, AE.defaultCountryCode));
    if (tz) body.append('timezone', tz);
    body.append('location', location.href);
    body.append('lp', location.href.split('?')[0]);
    try {
      await fetch(`${base}/registration`, {
        method: 'POST', body, mode: 'no-cors', referrerPolicy: 'no-referrer-when-downgrade'
      });
    } catch (_) {}
  }

  if (C.trackingEnabled && /^\d+$/.test(C.metaPixelId)) {
    const fbq = window.fbq = window.fbq || function() { fbq.queue.push(arguments); };
    fbq.queue = fbq.queue || []; fbq.loaded = true; fbq.version = '2.0';
    const script = document.createElement('script'); script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js'; document.head.appendChild(script);
    fbq('init', C.metaPixelId); fbq('track', 'PageView');
  }
})();
