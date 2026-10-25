
(function () {
  "use strict";

  // LAST 20 ROLLS is SESSION-ONLY.
  // Nothing is read from or written to localStorage/sessionStorage.
  var COLORS = {
    red: "#ef4444",
    orange: "#f59e0b",
    yellow: "#facc15",
    green: "#3baa35",
    blue: "#3b5bea",
    purple: "#9c27b0"
  };
  // Same colors as the big dice (only used for the small dice in the roll rows).
  var DIE_COLORS = {
    red: "red",
    orange: "orange",
    yellow: "gold",
    green: "green",
    blue: "blue",
    purple: "purple"
  };
  var history = [];

  function getBox() {
    return document.getElementById("last20Rolls");
  }

  function cleanColors(colors) {
    if (!Array.isArray(colors)) return [];
    return colors.map(function (c) {
      c = String(c == null ? "" : c).trim().toLowerCase();
      return c === "gold" ? "yellow" : c;
    }).filter(function (c) {
      return Object.prototype.hasOwnProperty.call(COLORS, c);
    });
  }

  function make(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  function createRoll(roll, index) {
    var row = make("div", "last20-roll" + (index === 0 ? " current" : ""), "");
    var head = make("div", "last20-roll-head", "");
    head.appendChild(make("div", "last20-roll-name", index === 0 ? "THIS ROLL" : "ROLL " + (index + 1)));
    if (roll.code) head.appendChild(make("div", "last20-roll-id", roll.code));
    row.appendChild(head);

    var dice = make("div", "last20-dice", "");
    roll.colors.forEach(function (color) {
      var die = make("span", "last20-die", "");
      die.style.backgroundColor = DIE_COLORS[color];
      die.setAttribute("title", color.toUpperCase());
      dice.appendChild(die);
    });
    row.appendChild(dice);
    return row;
  }

  function render() {
    var box = getBox();
    if (!box) return;
    box.innerHTML = "";

    box.appendChild(make("div", "last20-title", "LAST 20 ROLLS"));
    box.appendChild(make("div", "last20-label", "STATS"));

    var stats = make("div", "last20-stats", "");
    var counts = {red:0, orange:0, yellow:0, green:0, blue:0, purple:0};
    history.forEach(function (roll) {
      roll.colors.forEach(function (color) { counts[color]++; });
    });

    Object.keys(COLORS).forEach(function (color) {
      var stat = make("div", "last20-stat", "");
      var dot = make("span", "last20-dot", "");
      dot.style.backgroundColor = COLORS[color];
      stat.appendChild(dot);
      stat.appendChild(make("span", "", color.toUpperCase() + " × " + counts[color]));
      stats.appendChild(stat);
    });
    box.appendChild(stats);

    if (!history.length) {
      box.appendChild(make("div", "last20-empty", "Noch keine Rolls vorhanden."));
      return;
    }

    box.appendChild(make("div", "last20-label", "LAST ROLL"));
    box.lastChild.style.marginTop = "16px";
    box.appendChild(createRoll(history[0], 0));

    if (history.length > 1) {
      var previous = make("div", "last20-label", "PREVIOUS ROLLS");
      previous.style.marginTop = "16px";
      box.appendChild(previous);
      for (var i = 1; i < history.length; i++) {
        box.appendChild(createRoll(history[i], i));
      }
    }
  }

  window.last20AddRoll = function (colors, code) {
    var cleaned = cleanColors(colors);
    if (!cleaned.length) {
      console.warn("LAST20: no valid colors received", colors);
      return false;
    }

    history.unshift({
      colors: cleaned.slice(),
      code: code == null ? "" : String(code)
    });
    history = history.slice(0, 20);
    render();
    return true;
  };

  // Start empty on every page load. No persistence at all.
  function init() {
    history = [];
    // Remove any history written by older versions. This version never writes it.
    try { localStorage.removeItem("offlineDiceLast20Rolls"); } catch (e) {}
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {once:true});
  } else {
    init();
  }
})();
