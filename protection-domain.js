
(function () {
  'use strict';
  var allowed = new Set(['offline-dice.de', 'www.offline-dice.de']);
  var host = String(location.hostname || '').toLowerCase().replace(/\.$/, '');
  var isHttp = location.protocol === 'https:' || location.protocol === 'http:';
  var isAllowed = isHttp && allowed.has(host);

  // A copied HTML file (file://), localhost, another domain, or an iframe is not a valid deployment.
  if (!isAllowed || window.top !== window.self) {
    try {
      document.documentElement.innerHTML = '<!doctype html><meta charset="utf-8"><title>Offline Dice</title>' +
        '<style>html,body{margin:0;min-height:100%;background:#080b12;color:#fff;font-family:Arial,sans-serif;display:grid;place-items:center}main{text-align:center;padding:32px;max-width:560px}h1{font-size:25px;margin:0 0 10px}p{opacity:.75;line-height:1.5}</style>' +
        '<main><h1>Offline Dice</h1><p>This copy is not authorized to run.<br>Use the official website at <b>offline-dice.de</b>.</p></main>';
    } catch (_) {}
    throw new Error('Offline Dice: unauthorized deployment');
  }

  // Make the check difficult to bypass accidentally when the page is copied.
  Object.defineProperty(window, '__OFFLINE_DICE_PRODUCTION__', { value: true, configurable: false });
})();
