
(function(){
  const WORKER="https://offline-dice-api.fischerleo56.workers.dev/ip-ban-check";
  const FIREBASE="https://kenzy-dice-default-rtdb.europe-west1.firebasedatabase.app";
  function show(){
    const overlay=document.getElementById("od-ban-overlay");
    if(!overlay)return;
    overlay.classList.add("od-ban-visible");
    overlay.setAttribute("aria-hidden","false");
    document.body.style.overflow="hidden";
  }
  function hide(){
    const overlay=document.getElementById("od-ban-overlay");
    if(!overlay)return;
    overlay.classList.remove("od-ban-visible");
    overlay.setAttribute("aria-hidden","true");
    document.body.style.overflow="";
  }
  async function check(){
    try{
      // Check the account ban first. This also works when the account has no IP record.
      const uid=String(localStorage.getItem("offlineDiceFirebaseUserId")||"").trim();
      if(uid && /^[A-Za-z0-9_-]{1,128}$/.test(uid)){
        try{
          const accountResponse=await fetch(FIREBASE+"/registeredUsers/"+encodeURIComponent(uid)+"/banned.json",{cache:"no-store"});
          if(accountResponse.ok && await accountResponse.json()===true){show();return;}
        }catch(accountError){
          console.warn("Offline Dice account-ban check:",accountError);
        }
      }
      const r=await fetch(WORKER,{cache:"no-store"});
      const data=await r.json();
      if(data && data.banned===true) show(); else hide();
    }catch(e){
      console.error("Offline Dice ban check:",e);
    }
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",check,{once:true});
  else check();
  window.addEventListener("offlineDiceLogin",check);
  setInterval(check,30000);
})();
