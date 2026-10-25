
(function(){
  "use strict";

  const STATUS_URL = "https://api.offline-dice.de/tiktok-live";
  const CHECK_INTERVAL = 30000;
  let checkTimer = null;
  let checkInProgress = false;

  async function updateTopStreamerLive(){
    if(checkInProgress) return;
    checkInProgress = true;

    try{
      const cards = document.querySelectorAll('[data-top-streamer-username]');
      if(!cards.length) return;

      await Promise.all(Array.from(cards).map(async function(card){
        const username = String(card.getAttribute('data-top-streamer-username') || '').trim();
        if(!username) return;

        try{
          const response = await fetch(
            STATUS_URL + '?username=' + encodeURIComponent(username) + '&_=' + Date.now(),
            {
              method: 'GET',
              cache: 'no-store',
              credentials: 'omit'
            }
          );

          if(!response.ok) throw new Error('status');

          const data = await response.json();

          // Nur ein erfolgreich gelesener Status darf die Anzeige ändern.
          card.classList.toggle(
            'top-streamer-card-live',
            data && data.live === true
          );
        }catch(e){
          // Bei einem einzelnen fehlgeschlagenen Check den letzten
          // bekannten Status behalten, statt LIVE fälschlich zu entfernen.
        }
      }));
    }finally{
      checkInProgress = false;
    }
  }

  function scheduleNextCheck(){
    if(checkTimer) window.clearTimeout(checkTimer);

    checkTimer = window.setTimeout(async function(){
      await updateTopStreamerLive();
      scheduleNextCheck();
    }, CHECK_INTERVAL);
  }

  function forceRefresh(){
    updateTopStreamerLive();
    scheduleNextCheck();
  }

  function start(){
    forceRefresh();

    // Browser können Timer in Hintergrund-/AFK-Tabs stark verlangsamen.
    // Beim Zurückkehren deshalb sofort einen frischen Status holen.
    document.addEventListener('visibilitychange', function(){
      if(!document.hidden) forceRefresh();
    });

    window.addEventListener('focus', forceRefresh);
    window.addEventListener('pageshow', forceRefresh);

    // Falls der Tab nach langer Inaktivität wieder aktiv wird.
    window.addEventListener('online', forceRefresh);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start, {once:true});
  }else{
    start();
  }
})();
