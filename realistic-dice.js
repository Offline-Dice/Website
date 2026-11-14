/* Offline Dice – Realistic Dice Mode
   - Auswahl "Realistic Dice" im Dropdown neben Color Dice / Coinflip
     (gespeichert in localStorage "realisticDiceMode")
   - macht aus den normalen .color-block-Würfeln echte 3D-Würfel mit Augen
   - beim Rollen fallen die Würfel in eine Box, die Box wird gerüttelt,
     dann hebt sie ab und die Ergebnisse kommen
   - ändert NICHT die Roll-Logik: Farbe, Verify-Code, Roll-Sound und Anti-Ban
     kommen weiterhin aus game-main.js / Worker / anti-ban.js
   - zwei kleine Effekt-Sounds (Reinfallen / Box hebt ab), eingebettet          */
(function () {
  "use strict";

  var STORAGE_KEY = "realisticDiceMode";
  var enabled = false;
  try { enabled = localStorage.getItem(STORAGE_KEY) === "on"; } catch (e) {}

  /* Augen auf einem 3x3-Raster (Zellen 1..9, zeilenweise) */
  var PIPS = {
    1: [5],
    2: [1, 9],
    3: [1, 5, 9],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 3, 4, 6, 7, 9]
  };
  /* Gegenüberliegende Seiten ergeben 7 wie bei echten Würfeln */
  var FACES = [["front", 1], ["back", 6], ["right", 3], ["left", 4], ["top", 2], ["bottom", 5]];

  function el(cls) {
    var d = document.createElement("div");
    d.className = cls;
    return d;
  }

  function buildScene() {
    var scene = el("od-rd-scene od-rd-neutral");
    scene.setAttribute("aria-hidden", "true");
    var shadow = el("od-rd-shadow");
    var hopper = el("od-rd-hopper");
    var cube = el("od-rd-cube");
    FACES.forEach(function (f) {
      var face = el("od-rd-face od-rd-" + f[0]);
      for (var cell = 1; cell <= 9; cell++) {
        var c = el("od-rd-cell");
        if (PIPS[f[1]].indexOf(cell) !== -1) c.appendChild(el("od-rd-pip"));
        face.appendChild(c);
      }
      cube.appendChild(face);
    });
    hopper.appendChild(cube);
    scene.appendChild(shadow);
    scene.appendChild(hopper);
    return { scene: scene, hopper: hopper, cube: cube };
  }

  function randomRest() {
    /* flacher Winkel -> Würfel bleibt schmal, man sieht trotzdem 3 Seiten */
    var yaw = 14 + Math.random() * 18;
    if (Math.random() < 0.5) yaw = -yaw;
    return "rotateX(" + (-20 - Math.random() * 10).toFixed(1) + "deg) rotateY(" + yaw.toFixed(1) + "deg)";
  }

  /* ---------- kleine Effekt-Sounds (aus den vorhandenen Seiten-Sounds, eingebettet) ---------- */
  var FX_DROP = "data:audio/mpeg;base64,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";
  var FX_LIFT = "data:audio/mpeg;base64,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";
  var fxCache = {};
  function fx(name, volume) {
    try {
      if (typeof isMuted !== "undefined" && isMuted) return;
    } catch (e) {}
    try {
      var src = name === "lift" ? FX_LIFT : FX_DROP;
      if (!fxCache[name]) fxCache[name] = new Audio(src);
      var a = fxCache[name].cloneNode();
      a.volume = volume;
      a.play().catch(function () {});
    } catch (e) {}
  }

  /* ---------- die Box ---------- */
  var rollingBlocks = [];   // Würfel, die gerade in der Box sind
  var box = null;
  var boxRaf = 0;
  var boxFailsafe = 0;
  var boxStart = 0;
  var dropSoundTimer = 0;

  function siblingIndex(block) {
    return Math.max(0, Array.prototype.indexOf.call(block.parentNode ? block.parentNode.children : [], block));
  }

  function placeBox() {
    if (!box) return;
    var l = Infinity, t = Infinity, r = -Infinity, b = -Infinity, n = 0;
    rollingBlocks.forEach(function (blk) {
      if (!blk.isConnected) return;
      var rc = blk.getBoundingClientRect();
      if (!rc.width) return;
      n++;
      l = Math.min(l, rc.left); r = Math.max(r, rc.right);
      t = Math.min(t, rc.top);  b = Math.max(b, rc.bottom);
    });
    if (!n) return;
    var cy = (t + b) / 2;
    var w = Math.max(130, (r - l) + 44);
    var wantL = (l + r) / 2 - w / 2;
    var wantT = cy - 40;
    /* !important, weil die Seite Kinder von #diceResultArea per CSS auf 76px zwingt */
    var s = box.style;
    s.setProperty("width", w + "px", "important");
    s.setProperty("min-width", "0", "important");
    s.setProperty("max-width", "none", "important");
    s.setProperty("height", "104px", "important");
    s.setProperty("aspect-ratio", "auto", "important");
    s.setProperty("flex", "none", "important");
    s.setProperty("left", wantL + "px", "important");
    s.setProperty("top", wantT + "px", "important");
    /* Falls ein Elternteil transform/filter hat, ist "fixed" relativ dazu: nachkorrigieren */
    var rc = box.getBoundingClientRect();
    var dx = wantL - rc.left, dy = wantT - rc.top;
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      s.setProperty("left", (wantL + dx) + "px", "important");
      s.setProperty("top", (wantT + dy) + "px", "important");
    }
  }

  function boxLoop() {
    if (!box) return;
    placeBox();
    boxRaf = requestAnimationFrame(boxLoop);
  }

  function ensureBox() {
    if (box) return;
    box = el("od-rd-box");
    boxStart = Date.now();
    var inner = el("od-rd-box-inner");
    inner.appendChild(el("od-rd-box-rim"));
    inner.appendChild(el("od-rd-box-body"));
    box.appendChild(inner);
    /* In den Würfelbereich hängen (nicht an den body): der Roll-Bildschirm der Seite
       zeigt nur #diceResultArea, alles andere kann ausgeblendet oder überdeckt sein. */
    var host = (rollingBlocks[0] && rollingBlocks[0].parentNode) || document.body;
    host.appendChild(box);
    placeBox();
    boxRaf = requestAnimationFrame(boxLoop);
    clearTimeout(boxFailsafe);
    boxFailsafe = setTimeout(function () { removeBox(false); }, 9000);
  }

  function removeBox(animated) {
    clearTimeout(boxFailsafe);
    clearTimeout(dropSoundTimer);
    cancelAnimationFrame(boxRaf);
    var b = box;
    box = null;
    if (!b) return;
    if (!animated) { if (b.parentNode) b.parentNode.removeChild(b); return; }
    fx("lift", 0.55);
    try {
      var a = b.animate([
        { transform: "translateY(0) rotate(0deg)", opacity: 1 },
        { transform: "translateY(-150px) rotate(-10deg)", opacity: 0 }
      ], { duration: 340, easing: "cubic-bezier(.4,0,.8,.6)", fill: "forwards" });
      a.onfinish = function () { if (b.parentNode) b.parentNode.removeChild(b); };
    } catch (e) {
      if (b.parentNode) b.parentNode.removeChild(b);
    }
  }

  function leaveBox(block) {
    var i = rollingBlocks.indexOf(block);
    if (i !== -1) rollingBlocks.splice(i, 1);
  }

  /* ---------- Würfel pro .color-block ---------- */
  function syncColor(block) {
    var st = block.__odRd;
    if (!st) return;
    var color = block.style.backgroundColor;
    if (color) st.scene.style.setProperty("--rd-color", color);
  }

  function startRoll(block) {
    var st = block.__odRd;
    st.rolling = true;
    st.cube.style.transform = "";
    st.scene.classList.add("od-rd-rolling", "od-rd-neutral");
    if (rollingBlocks.indexOf(block) === -1) rollingBlocks.push(block);
    ensureBox();

    /* Würfel fallen nacheinander von oben in die Box (die Vorderwand der Box verdeckt sie) */
    var idx = siblingIndex(block);
    var delay = 40 + idx * 45;
    try {
      if (st.fall) st.fall.cancel();
      st.fall = st.scene.animate([
        { transform: "translateY(-120px)", opacity: 1 },
        { transform: "translateY(-6px)", opacity: 1, offset: 0.72 },
        { transform: "translateY(30px) scale(.7)", opacity: 0 }
      ], { duration: 340, delay: delay, easing: "cubic-bezier(.5,0,.9,.6)", fill: "both" });
    } catch (e) {}
    /* ein kleiner Effekt-Sound, wenn der letzte Würfel in der Box ist */
    clearTimeout(dropSoundTimer);
    dropSoundTimer = setTimeout(function () { fx("drop", 0.5); }, delay + 290);
  }

  /* Im Realistic-Modus dauert der Roll mindestens so lange, damit man die Box
     im Roll-Bildschirm wirklich rütteln sieht. Dazu wird nur der Rückgabewert von
     playDiceRollSound() (auf den rollDice() wartet) verlängert – game-main.js
     selbst bleibt unverändert. */
  var ROLL_MIN_MS = 2400;
  function patchRollSound() {
    if (window.__odRdRollPatched || typeof window.playDiceRollSound !== "function") return;
    var orig = window.playDiceRollSound;
    window.__odRdRollPatched = true;
    window.playDiceRollSound = function () {
      var p = orig.apply(this, arguments);
      if (!enabled) return p;
      return Promise.all([p, new Promise(function (r) { setTimeout(r, ROLL_MIN_MS); })]).then(function () {});
    };
  }

  function land(block) {
    var st = block.__odRd;
    st.rolling = false;
    var cubeFrom = getComputedStyle(st.cube).transform;
    var hopFrom = getComputedStyle(st.hopper).transform;
    st.scene.classList.remove("od-rd-rolling", "od-rd-neutral");
    st.cube.style.transform = st.rest;
    try {
      if (st.fall) { st.fall.cancel(); st.fall = null; }
      /* Würfel kommen aus der Box heraus, während sie abhebt */
      st.scene.animate([
        { transform: "translateY(26px) scale(.75)", opacity: 0 },
        { transform: "translateY(0) scale(1)", opacity: 1 }
      ], { duration: 280, delay: 90, easing: "cubic-bezier(.2,.8,.3,1)", fill: "backwards" });
      if (cubeFrom && cubeFrom !== "none") {
        st.cube.animate([{ transform: cubeFrom }, { transform: st.rest }],
          { duration: 520, easing: "cubic-bezier(.2,.8,.3,1)" });
      }
      if (hopFrom && hopFrom !== "none") {
        st.hopper.animate([{ transform: hopFrom }, { transform: "translateY(0)" }],
          { duration: 420, easing: "ease-out" });
      }
    } catch (e) {}
    leaveBox(block);
    if (!rollingBlocks.length) removeBox(true);
  }

  function enhance(block) {
    if (!enabled || block.__odRd) return;
    var parts = buildScene();
    var st = {
      scene: parts.scene, hopper: parts.hopper, cube: parts.cube,
      rest: randomRest(), rolling: false, observer: null, fall: null
    };
    block.__odRd = st;
    block.insertBefore(parts.scene, block.firstChild);
    st.cube.style.transform = st.rest;
    syncColor(block);
    if (block.classList.contains("rolling-dice")) {
      startRoll(block);
    } else {
      st.scene.classList.remove("od-rd-neutral");
    }
    st.observer = new MutationObserver(function () {
      syncColor(block);
      var rolling = block.classList.contains("rolling-dice");
      if (rolling && !st.rolling) startRoll(block);
      else if (!rolling && st.rolling) land(block);
    });
    st.observer.observe(block, { attributes: true, attributeFilter: ["class", "style"] });
  }

  function unenhance(block) {
    var st = block.__odRd;
    if (!st) return;
    if (st.observer) st.observer.disconnect();
    if (st.fall) st.fall.cancel();
    if (st.scene.parentNode) st.scene.parentNode.removeChild(st.scene);
    delete block.__odRd;
    leaveBox(block);
    if (!rollingBlocks.length) removeBox(false);
  }

  function allBlocks() {
    return document.querySelectorAll("#diceResultArea .color-block");
  }

  function collect(node) {
    if (node.nodeType !== 1) return [];
    var out = [];
    if (node.classList.contains("color-block") && node.closest("#diceResultArea")) out.push(node);
    if (node.querySelectorAll) {
      var inner = node.querySelectorAll(".color-block");
      for (var i = 0; i < inner.length; i++) {
        if (inner[i].closest("#diceResultArea")) out.push(inner[i]);
      }
    }
    return out;
  }

  new MutationObserver(function (mutations) {
    if (!enabled) return;
    mutations.forEach(function (m) {
      m.addedNodes.forEach(function (node) {
        collect(node).forEach(enhance);
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });

  /* ---------- Auswahl im Dropdown (neben Color Dice / Coinflip) ----------
     Die Option "Realistic Dice" hat intern den Wert "color", damit das
     Spiel unverändert wie Color Dice läuft. Erkannt wird sie am data-Attribut. */
  function setEnabled(on) {
    enabled = on;
    try { localStorage.setItem(STORAGE_KEY, on ? "on" : "off"); } catch (e) {}
    document.body.classList.toggle("od-real-dice", on);
    var blocks = allBlocks();
    for (var i = 0; i < blocks.length; i++) {
      if (on) enhance(blocks[i]); else unenhance(blocks[i]);
    }
  }

  function selectIsRealistic(select) {
    var opt = select.options[select.selectedIndex];
    return !!(opt && opt.getAttribute("data-realistic") === "1");
  }

  function init() {
    var select = document.getElementById("colorDice");
    if (!select) return;
    var realisticIndex = -1;
    for (var i = 0; i < select.options.length; i++) {
      if (select.options[i].getAttribute("data-realistic") === "1") realisticIndex = i;
    }
    if (realisticIndex === -1) return;
    patchRollSound();
    /* gespeicherte Auswahl wiederherstellen (ohne change-Event: Spielmodus bleibt "color") */
    if (enabled) select.selectedIndex = realisticIndex;
    select.addEventListener("change", function () {
      setEnabled(selectIsRealistic(select));
    });
    setEnabled(selectIsRealistic(select));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
