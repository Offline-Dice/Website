/* Offline Dice – Realistic Dice Mode
   - Auswahl "Realistic Dice" im Dropdown neben Color Dice / Coinflip
     (gespeichert in localStorage "realisticDiceMode")
   - macht aus den normalen .color-block-Würfeln echte 3D-Würfel mit Augen
   - ändert NICHT die Roll-Logik: Farbe, Verify-Code und Anti-Ban kommen
     weiterhin aus game-main.js / Worker / anti-ban.js
   - zusätzlicher Würfel-"Klack"-Sound beim Landen (respektiert Mute)          */
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

  /* ---------- Sound: kurzer Klack, wenn der Würfel aufkommt ---------- */
  var audioCtx = null;
  function getCtx() {
    if (!audioCtx) {
      var A = window.AudioContext || window.webkitAudioContext;
      if (!A) return null;
      try { audioCtx = new A(); } catch (e) { return null; }
    }
    if (audioCtx.state === "suspended") audioCtx.resume().catch(function () {});
    return audioCtx;
  }
  function clack(delay, strength) {
    try {
      if (typeof isMuted !== "undefined" && isMuted) return;
    } catch (e) {}
    var c = getCtx();
    if (!c) return;
    var t = c.currentTime + delay;

    var len = Math.floor(c.sampleRate * 0.05);
    var buf = c.createBuffer(1, len, c.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    var src = c.createBufferSource();
    src.buffer = buf;
    var bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800 + Math.random() * 1800;
    bp.Q.value = 1.2;
    var g = c.createGain();
    g.gain.setValueAtTime(0.5 * strength, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    src.connect(bp); bp.connect(g); g.connect(c.destination);
    src.start(t);

    var o = c.createOscillator();
    var og = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(90, t + 0.05);
    og.gain.setValueAtTime(0.35 * strength, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    o.connect(og); og.connect(c.destination);
    o.start(t); o.stop(t + 0.08);
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
  }

  function land(block) {
    var st = block.__odRd;
    st.rolling = false;
    var cubeFrom = getComputedStyle(st.cube).transform;
    var hopFrom = getComputedStyle(st.hopper).transform;
    st.scene.classList.remove("od-rd-rolling", "od-rd-neutral");
    st.cube.style.transform = st.rest;
    try {
      if (cubeFrom && cubeFrom !== "none") {
        st.cube.animate([{ transform: cubeFrom }, { transform: st.rest }],
          { duration: 520, easing: "cubic-bezier(.2,.8,.3,1)" });
      }
      if (hopFrom && hopFrom !== "none") {
        st.hopper.animate([{ transform: hopFrom }, { transform: "translateY(0)" }],
          { duration: 420, easing: "ease-out" });
      }
    } catch (e) {}
    var idx = Array.prototype.indexOf.call(block.parentNode ? block.parentNode.children : [], block);
    var stagger = Math.max(0, idx) * 0.06;
    clack(0.10 + stagger, 1);
    clack(0.28 + stagger, 0.55);
  }

  function enhance(block) {
    if (!enabled || block.__odRd) return;
    var parts = buildScene();
    var st = {
      scene: parts.scene, hopper: parts.hopper, cube: parts.cube,
      rest: randomRest(), rolling: false, observer: null
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
    if (st.scene.parentNode) st.scene.parentNode.removeChild(st.scene);
    delete block.__odRd;
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
