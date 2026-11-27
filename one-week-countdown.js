/* Offline Dice shared one-week shutdown countdown. */
(() => {
  'use strict';
  // Shared fixed deadline for the one-week countdown (UTC).
  const DEADLINE = Date.parse('2026-11-28T14:44:47Z');
  const OFFLINE_URL = '/service-offline.html';
  const FINAL_SECONDS = 5;   // last seconds: timer grows, pulses and beeps
  const END_HOLD_MS = 1500;  // keep "00" + end tone visible before leaving the page
  if (location.pathname.replace(/\/+$/, '') === OFFLINE_URL) return;

  const pad = n => String(n).padStart(2, '0');
  let finalShown = false;
  let redirectTimer = 0;
  let lastBeep = -1;
  let audioCtx = null;

  const goOffline = () => { location.replace(OFFLINE_URL); };

  /* ---------- sound (Web Audio, no audio files needed) ---------- */
  function audio() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
      return audioCtx;
    } catch (_) { return null; }
  }
  // Browsers only allow sound after the visitor has clicked / tapped / pressed a key once.
  const UNLOCK_EVENTS = ['pointerdown', 'touchend', 'keydown', 'click'];
  function unlock() {
    const ctx = audio();
    if (ctx && ctx.state === 'running') UNLOCK_EVENTS.forEach(e => window.removeEventListener(e, unlock, true));
  }
  UNLOCK_EVENTS.forEach(e => window.addEventListener(e, unlock, true));

  function beep(n) {
    const ctx = audio();
    if (!ctx || ctx.state !== 'running') return;
    const isEnd = n === 0;
    const freq = isEnd ? 1320 : 600 + (FINAL_SECONDS - n) * 80; // 5..1 = rising pitch, 0 = high end tone
    const dur = isEnd ? 0.9 : 0.18;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  /* ---------- rendering ---------- */
  function setText(unit, value) {
    const el = document.querySelector(`#od-week-countdown [data-od-count="${unit}"]`);
    if (el && el.textContent !== value) el.textContent = value;
  }

  function enterFinal() {
    if (finalShown) return;
    finalShown = true;
    const bar = document.getElementById('od-week-countdown');
    if (!bar) return;
    bar.classList.add('od-final');
    const card = bar.querySelector('.od-week-card');
    if (card) {
      const w = card.offsetWidth || 1; // offsetWidth ignores transforms
      const scale = Math.max(1, Math.min(2.4, (window.innerWidth - 48) / w));
      bar.style.setProperty('--od-final-scale', scale.toFixed(3));
    }
  }

  function pulse() {
    const el = document.querySelector('#od-week-countdown [data-od-count="seconds"]');
    if (!el || !el.animate) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.animate(
      [{ transform: 'scale(1.55)', color: '#ffffff', textShadow: '0 0 26px #ff3048' },
       { transform: 'scale(1)' }],
      { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' }
    );
  }

  function render(ms) {
    const s = Math.ceil(ms / 1000); // whole seconds left (counts 5,4,3,2,1,0)
    setText('days', pad(Math.floor(s / 86400)));
    setText('hours', pad(Math.floor(s % 86400 / 3600)));
    setText('minutes', pad(Math.floor(s % 3600 / 60)));
    setText('seconds', pad(s % 60));
    if (s <= FINAL_SECONDS) {
      enterFinal();
      if (s !== lastBeep) {
        lastBeep = s;
        pulse();
        beep(s);
      }
    }
  }

  const expired = () => {
    if (Date.now() < DEADLINE) return false;
    if (finalShown) {
      // The visitor watched the last seconds: show 00, play the end tone, then leave.
      if (!redirectTimer) {
        render(0);
        redirectTimer = window.setTimeout(goOffline, END_HOLD_MS);
      }
    } else {
      goOffline();
    }
    return true;
  };
  if (expired()) return;

  function update() {
    if (expired()) return;
    render(Math.max(0, DEADLINE - Date.now()));
  }
  function mount() {
    if (expired()) return;
    let bar = document.getElementById('od-week-countdown');
    if (!bar) {
      bar = document.createElement('aside');
      bar.id = 'od-week-countdown';
      bar.setAttribute('role', 'timer');
      bar.setAttribute('aria-label', 'This website will go offline in');
      bar.innerHTML = '<div class="od-week-card"><span class="od-week-heading">THIS WEBSITE WILL GO OFFLINE IN</span><div class="od-week-clock"><strong data-od-count="days">07</strong><i>:</i><strong data-od-count="hours">00</strong><i>:</i><strong data-od-count="minutes">00</strong><i>:</i><strong data-od-count="seconds">00</strong></div></div>';
      document.body.appendChild(bar);
    }
    update();
    // 100 ms so the beeps in the last seconds line up with the displayed number
    if (!window.__odCountdownTimer) window.__odCountdownTimer = window.setInterval(update, 100);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { if (expired()) return; update(); } });
  window.addEventListener('pageshow', () => { if (!expired()) update(); });
  window.setInterval(expired, 1500);
})();
