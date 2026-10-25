
(() => {
  // Capture Chrome's install event as early as possible.
  // The page is very large, so waiting until the end can miss beforeinstallprompt.
  window.__offlineDiceInstallPrompt = null;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    window.__offlineDiceInstallPrompt = event;
    window.dispatchEvent(new Event("offline-dice-install-ready"));
  });

  window.addEventListener("appinstalled", () => {
    window.__offlineDiceInstallPrompt = null;
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js", {scope: "/"})
      .catch((err) => console.warn("Offline Dice PWA service worker:", err));
  }
})();
