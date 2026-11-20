(() => {
  window.__offlineDiceInstallPrompt = null;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    window.__offlineDiceInstallPrompt = event;
    window.dispatchEvent(new Event('offline-dice-install-ready'));
  });
  window.addEventListener('appinstalled', () => { window.__offlineDiceInstallPrompt = null; });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js', { scope: '/', updateViaCache: 'none' })
      .then(registration => registration.update())
      .catch(error => console.warn('Offline Dice service worker:', error));
  }
})();
