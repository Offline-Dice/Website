
(function(){
  "use strict";
  function check(){
    var h=(location.hostname||"").toLowerCase().replace(/\.$/,"");
    if((h!=="offline-dice.de"&&h!=="www.offline-dice.de") || location.protocol==="file:" || window.top!==window.self){
      try{document.body.innerHTML="<div style='font-family:Arial;text-align:center;padding:60px'>Unauthorized Offline Dice copy.</div>";}catch(e){}
      throw new Error("OD_PROTECTION_B");
    }
    if(!window.__OD_A) throw new Error("OD_PROTECTION_A_MISSING");
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",check,{once:true});
  else check();
  setTimeout(check,1800);
})();
