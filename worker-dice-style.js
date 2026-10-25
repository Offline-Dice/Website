
(function () {
  "use strict";
  const DICE_STYLE_URL = "https://offline-dice-api.fischerleo56.workers.dev/dice-style";

  async function loadWorkerDiceStyle() {
    try {
      const response = await fetch(DICE_STYLE_URL, {
        method: "GET",
        mode: "cors",
        cache: "no-store",
        credentials: "omit",
        headers: { "Accept": "text/css" }
      });

      if (!response.ok) {
        throw new Error("Dice style request failed (" + response.status + ")");
      }

      const css = await response.text();
      if (!css.trim()) {
        throw new Error("Empty Dice Worker stylesheet");
      }

      const style = document.createElement("style");
      style.id = "worker-dice-style";
      style.textContent = css;
      document.head.appendChild(style);
    } catch (error) {
      console.error("Could not load Dice design from Worker:", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadWorkerDiceStyle, { once: true });
  } else {
    loadWorkerDiceStyle();
  }
})();
