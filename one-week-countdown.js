/* Offline Dice one-week service countdown.
   Shared fixed deadline for every visitor: 2026-11-27T14:44:47Z
   Change COUNTDOWN_DEADLINE only if you intentionally want a different end time.
*/
(() => {
  'use strict';
  const COUNTDOWN_DEADLINE = new Date('2026-11-27T14:44:47Z').getTime();
  const OFFLINE_URL = '/service-offline.html';
  if (location.pathname.replace(/\\/+$/, '') === '/service-offline.html') return;

  const redirectIfExpired = () => {
    if (Date.now() >= COUNTDOWN_DEADLINE) {
      location.replace(OFFLINE_URL);
      return true;
    }
    return false;
  };

  if (redirectIfExpired()) return;

  const pad = n => String(n).padStart(2, '0');
  const render = () => {
    if (redirectIfExpired()) return;
    const left = Math.max(0, COUNTDOWN_DEADLINE - Date.now());
    const days = Math.floor(left / 86400000);
    const hours = Math.floor((left % 86400000) / 3600000);
    const minutes = Math.floor((left % 3600000) / 60000);
    const seconds = Math.floor((left % 60000) / 1000);
    const values = { days: pad(days), hours: pad(hours), minutes: pad(minutes), seconds: pad(seconds) };
    for (const [key, value] of Object.entries(values)) {
      const node = document.querySelector(`[data-od-count="${key}"]`);
      if (node) node.textContent = value;
    }
  };

  const mount = () => {
    if (redirectIfExpired()) return;
    if (document.getElementById('od-week-countdown')) return;
    const overlay = document.createElement('aside');
    overlay.id = 'od-week-countdown';
    overlay.setAttribute('aria-label', 'Service countdown');
    overlay.innerHTML = `
      <div class="od-week-card">
        <div class="od-week-top"><span class="od-week-live-dot"></span><span>SPECIAL EVENT</span><span class="od-week-tag">FINAL COUNTDOWN</span></div>
        <div class="od-week-heading">THE NEXT CHAPTER<br><span>STARTS SOON</span></div>
        <div class="od-week-subtitle">Offline Dice is preparing for a major change.</div>
        <div class="od-week-clock" aria-live="off">
          <div class="od-week-unit"><strong data-od-count="days">07</strong><small>DAYS</small></div>
          <i>:</i><div class="od-week-unit"><strong data-od-count="hours">00</strong><small>HOURS</small></div>
          <i>:</i><div class="od-week-unit"><strong data-od-count="minutes">00</strong><small>MINUTES</small></div>
          <i>:</i><div class="od-week-unit"><strong data-od-count="seconds">00</strong><small>SECONDS</small></div>
        </div>
        <div class="od-week-bottom"><span>OFFLINE DICE</span><span>COUNTING DOWN LIVE</span></div>
      </div>`;
    document.body.appendChild(overlay);
    render();
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('od-week-compact')));
    window.setInterval(render, 1000);
    document.addEventListener('visibilitychange', render);
    window.addEventListener('pageshow', render);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
  window.setInterval(redirectIfExpired, 1000);
  document.addEventListener('visibilitychange', redirectIfExpired);
})();
