
(function(){
  "use strict";
  var marker="__OD_A";
  var timer=setInterval(function(){
    try{
      var h=(location.hostname||"").toLowerCase().replace(/\.$/,"");
      if((h!=="offline-dice.de"&&h!=="www.offline-dice.de")||!window[marker]||window.top!==window.self){
        clearInterval(timer);
        document.documentElement.innerHTML='<meta charset="utf-8"><title>Offline Dice</title><main style="font-family:Arial;text-align:center;padding:60px">Unauthorized deployment.</main>';
        throw new Error("OD_PROTECTION_C");
      }
    }catch(e){
      if(e && String(e.message||"").indexOf("OD_PROTECTION_C")>=0) throw e;
    }
  },2500);
})();
