/* Offline Dice shared one-week shutdown countdown. */
(() => {
  'use strict';
  // Shared fixed deadline for the one-week countdown (UTC).
  const DEADLINE = Date.parse('2026-11-27T14:44:47Z');
  const OFFLINE_URL = '/service-offline.html';
  if (location.pathname.replace(/\/+$/, '') === OFFLINE_URL) return;

  const expired = () => {
    if (Date.now() < DEADLINE) return false;
    location.replace(OFFLINE_URL);
    return true;
  };
  if (expired()) return;

  const pad = n => String(n).padStart(2, '0');
  function update() {
    if (expired()) return;
    const ms = Math.max(0, DEADLINE - Date.now());
    const values = {
      days: pad(Math.floor(ms / 86400000)),
      hours: pad(Math.floor(ms % 86400000 / 3600000)),
      minutes: pad(Math.floor(ms % 3600000 / 60000)),
      seconds: pad(Math.floor(ms % 60000 / 1000))
    };
    for (const [unit, value] of Object.entries(values)) {
      const el = document.querySelector(`#od-week-countdown [data-od-count="${unit}"]`);
      if (el) el.textContent = value;
    }
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
    if (!window.__odCountdownTimer) window.__odCountdownTimer = window.setInterval(update, 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { if (expired()) return; update(); } });
  window.addEventListener('pageshow', () => { if (!expired()) update(); });
  window.setInterval(expired, 1500);
})();
