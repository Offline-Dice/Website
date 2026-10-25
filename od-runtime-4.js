
(function(){
  "use strict";
  var h=(location.hostname||"").toLowerCase().replace(/\.$/,"");
  var valid=(h==="offline-dice.de"||h==="www.offline-dice.de") && location.protocol!=="file:" && window.top===window.self;
  if(!valid || !window.__OD_A){
    document.documentElement.innerHTML='<meta charset="utf-8"><title>Offline Dice</title><main style="font-family:Arial;text-align:center;padding:60px">Unauthorized deployment.</main>';
    throw new Error("OD_PROTECTION_D");
  }
})();
