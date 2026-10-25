
(function(){
  "use strict";
  var H="offline-dice.de", W="www.offline-dice.de";
  var h=(location.hostname||"").toLowerCase().replace(/\.$/,"");
  var ok=(location.protocol==="https:"||location.protocol==="http:")&&(h===H||h===W)&&window.top===window.self;
  if(!ok){
    document.documentElement.innerHTML='<meta charset="utf-8"><title>Offline Dice</title><style>html,body{margin:0;min-height:100%;background:#080b12;color:#fff;font-family:Arial,sans-serif;display:grid;place-items:center}main{text-align:center;padding:32px}h1{margin:0 0 10px}</style><main><h1>Offline Dice</h1><p>This copy is not authorized to run.</p></main>';
    throw new Error("OD_PROTECTION_A");
  }
  Object.defineProperty(window,"__OD_A",{value:"production",writable:false,configurable:false});
})();
