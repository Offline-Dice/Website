
(() => {
  function setup() {
    const installBtn = document.getElementById("offlineDiceInstallBtn");
    const antiBanBox = document.getElementById("antiBanBox");
    if (!installBtn || installBtn.dataset.installReady === "1") return;
    installBtn.dataset.installReady = "1";

    // Put the install button directly beside Anti-Ban Mode.
    if (antiBanBox) {
      antiBanBox.insertBefore(installBtn, antiBanBox.firstChild);
      installBtn.parentElement && installBtn.parentElement.classList.add("offline-dice-install-parent");
    }

    const isStandalone = () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: window-controls-overlay)").matches ||
      window.navigator.standalone === true;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

    const updateVisibility = (hide = false) => {
      const installed = isStandalone() || hide;
      installBtn.style.display = installed ? "none" : "flex";
      installBtn.setAttribute("aria-hidden", installed ? "true" : "false");
    };

    installBtn.addEventListener("click", async () => {
      if (isStandalone()) {
        updateVisibility(true);
        return;
      }

      const promptEvent = window.__offlineDiceInstallPrompt;
      if (promptEvent) {
        window.__offlineDiceInstallPrompt = null;
        try {
          await promptEvent.prompt();
          const choice = await promptEvent.userChoice;
          if (choice && choice.outcome === "accepted") updateVisibility(true);
        } catch (_) {}
        return;
      }

      if (isIOS) {
        alert("Install Offline Dice:\n\nIn Safari, tap Share and then Add to Home Screen.");
        return;
      }

      alert("Chrome is not offering installation yet. Open ⋮ and choose Install Offline Dice.");
    });

    window.addEventListener("offline-dice-install-ready", () => {
      installBtn.disabled = false;
      updateVisibility(false);
    });

    window.addEventListener("appinstalled", () => {
      window.__offlineDiceInstallPrompt = null;
      updateVisibility(true);
    });

    // If opened as the installed PWA, hide it. No localStorage flag is used,
    // so a normal browser visit after uninstalling shows the button again.
    updateVisibility(false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup, {once:true});
  } else {
    setup();
  }
})();
