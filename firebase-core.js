
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getDatabase, ref, onValue, onDisconnect, set, update, serverTimestamp, get } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBUT0t1I9Dkee5Ok_uYMzs4WfdwapOA5As",
  authDomain: "kenzy-dice.firebaseapp.com",
  projectId: "kenzy-dice",
  databaseURL: "https://kenzy-dice-default-rtdb.europe-west1.firebasedatabase.app",
  storageBucket: "kenzy-dice.firebasestorage.app",
  messagingSenderId: "578956722062",
  appId: "1:578956722062:web:5156f5737e51ef75246edf"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
/* Registered users registry — separate from the existing website online counter. */
(function(){
  const REGISTERED_USERS_PATH = "registeredUsers";
  const NETWORK_WORKER = "https://offline-dice-api.fischerleo56.workers.dev/register-network";

  function getOrCreateUserId(){
    let userId = localStorage.getItem("offlineDiceFirebaseUserId");
    if(!userId){
      userId = (crypto.randomUUID ? crypto.randomUUID() :
        ("u_" + Date.now() + "_" + Math.random().toString(36).slice(2)));
      localStorage.setItem("offlineDiceFirebaseUserId", userId);
    }
    return userId;
  }

  function getPublicIPv4(){
    const endpoints = [
      "https://api4.ipify.org?format=json",
      "https://ipv4.icanhazip.com/",
      "https://api.ip.sb/ip"
    ];
    function tryEndpoint(index){
      if(index >= endpoints.length) return Promise.resolve("");
      return fetch(endpoints[index],{
        method:"GET",
        cache:"no-store",
        mode:"cors"
      }).then(function(response){
        if(!response.ok) throw new Error("ipv4-status-"+response.status);
        return response.text();
      }).then(function(text){
        const match=String(text||"").trim().match(
          /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/
        );
        if(!match) throw new Error("no-ipv4");
        return match[0];
      }).catch(function(){
        return tryEndpoint(index+1);
      });
    }
    return tryEndpoint(0);
  }

  function registerNetwork(userId, name){
    if(!userId) return Promise.resolve();
    return getPublicIPv4().then(function(ipv4){
      return fetch(NETWORK_WORKER,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        cache:"no-store",
        body:JSON.stringify({
          userId:userId,
          name:String(name||""),
          ipv4:String(ipv4||"")
        })
      });
    }).then(function(response){
      if(!response.ok) throw new Error("network-registration-failed:"+response.status);
      return response.json();
    }).catch(function(err){
      console.error("registeredUsers/network:", err);
    });
  }

  // IMPORTANT: Register the public network immediately when the page opens.
  // This also fills networkIp/network for existing users, so the admin does
  // not have to wait for a fresh login. Cloudflare supplies the IP server-side.
  (function registerExistingVisitorNetwork(){
    const userId=getOrCreateUserId();
    const savedName=String(localStorage.getItem("offlineDicePlayerName")||"").trim();
    if(savedName) registerNetwork(userId,savedName);
  })();

  window.addEventListener("offlineDiceLogin", function(event){
    const name = event.detail && event.detail.name;
    if(!name) return;

    const userId = getOrCreateUserId();

    const userRef = ref(db, REGISTERED_USERS_PATH + "/" + userId);

    update(userRef, {
      name: name,
      lastSeen: serverTimestamp(),
      online: true
    }).then(function(){
      // The Worker detects the public IP/network from Cloudflare. The user
      // never has to enter or reveal an IP address in the browser.
      return registerNetwork(userId,name);
    });

    // Only changes this user's registry record. It never removes the user
    // and never touches the existing website online counter.
    onDisconnect(userRef).update({
      online: false,
      lastSeen: serverTimestamp()
    }).catch(function(err){
      console.error("registeredUsers disconnect:", err);
    });
  });
})();


/* Separate Website-Paused overlay. */
(function(){
  let websitePausedActive=false;
  let websitePausedCloseTimer=null;

  function applyWebsitePausedOverlay(enabled){
    const overlay=document.getElementById("website-paused-overlay");
    if(!overlay) return;

    const originalLogo=document.querySelector(".top-logo");
    const overlayLogo=overlay.querySelector(".od-intro-logo");
    if(originalLogo && overlayLogo){
      overlayLogo.src=originalLogo.currentSrc || originalLogo.src;
    }

    clearTimeout(websitePausedCloseTimer);

    if(enabled){
      websitePausedActive=true;
      overlay.classList.remove("closing");
      overlay.classList.remove("active");
      void overlay.offsetWidth;
      overlay.classList.add("active");
      overlay.setAttribute("aria-hidden","false");
    }else{
      if(!websitePausedActive && !overlay.classList.contains("active")) return;
      websitePausedActive=false;
      overlay.classList.remove("active");
      void overlay.offsetWidth;
      overlay.classList.add("closing");
      overlay.setAttribute("aria-hidden","true");

      websitePausedCloseTimer=setTimeout(function(){
        if(!websitePausedActive){
          overlay.classList.remove("closing");
        }
      },700);
    }
  }

  function startWebsitePausedListener(){
    onValue(ref(db,"control/websitePaused"),function(snapshot){
      applyWebsitePausedOverlay(snapshot.val()===true);
    });
    onValue(ref(db,"control/websitePausedMessage"),function(snapshot){
      const el=document.querySelector("#website-paused-overlay .website-paused-text");
      if(el && snapshot.val()) el.textContent=String(snapshot.val());
    });
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",startWebsitePausedListener,{once:true});
  }else{
    startWebsitePausedListener();
  }
})();


/* Separate Server-Restart overlay: independent from the normal startup intro. */
(function(){
  let serverRestartActive=false;
  let serverRestartCloseTimer=null;

  function applyServerRestartOverlay(enabled){
    const overlay=document.getElementById("server-restart-overlay");
    if(!overlay) return;

    const originalLogo=document.querySelector(".top-logo");
    const overlayLogo=overlay.querySelector(".od-intro-logo");
    if(originalLogo && overlayLogo){
      overlayLogo.src=originalLogo.currentSrc || originalLogo.src;
    }

    clearTimeout(serverRestartCloseTimer);

    if(enabled){
      serverRestartActive=true;
      overlay.classList.remove("closing");
      overlay.classList.remove("active");
      void overlay.offsetWidth;
      overlay.classList.add("active");
      overlay.setAttribute("aria-hidden","false");
    }else{
      if(!serverRestartActive && !overlay.classList.contains("active")) return;
      serverRestartActive=false;
      overlay.classList.remove("active");
      void overlay.offsetWidth;
      overlay.classList.add("closing");
      overlay.setAttribute("aria-hidden","true");

      serverRestartCloseTimer=setTimeout(function(){
        if(!serverRestartActive){
          overlay.classList.remove("closing");
        }
      },700);
    }
  }

  function startServerRestartListener(){
    onValue(ref(db,"control/serverIntro"),function(snapshot){
      applyServerRestartOverlay(snapshot.val()===true);
    });
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",startServerRestartListener,{once:true});
  }else{
    startServerRestartListener();
  }
})();


// Globaler Neustart-Befehl aus dem Admin-Panel.
// Der erste Firebase-Wert beim Öffnen der Seite wird nur gespeichert.
// Erst eine spätere Änderung löst bei allen bereits geöffneten Seiten einen Reload aus.
let firstRestartLoad = true;
let lastRestart = null;

onValue(ref(db, "control/restart"), (snap) => {
  const restartValue = snap.val();

  if (firstRestartLoad) {
    firstRestartLoad = false;
    lastRestart = restartValue;
    return;
  }

  if (restartValue === null || restartValue === lastRestart) return;

  lastRestart = restartValue;
  window.location.reload();
});




// Persistent second announcement: stays visible until deleted in the admin panel.
onValue(ref(db, "announcements/permanent"), (snap)=>{
  const data = snap.val();
  const box = document.getElementById("persistentAnnouncementBox");
  const text = document.getElementById("persistentAnnouncementText");
  const linkBox = document.getElementById("persistentAnnouncementLink");
  const linkAnchor = document.getElementById("persistentAnnouncementLinkAnchor");
  if(!box || !text) return;

  if(data && data.message){
    text.textContent = data.message;
    if(linkBox && linkAnchor && data.linkText && data.linkUrl){
      linkAnchor.textContent = data.linkText;
      linkAnchor.href = data.linkUrl;
      linkBox.style.display = "inline";
    }else if(linkBox){
      linkAnchor.textContent = "";
      linkAnchor.removeAttribute("href");
      linkBox.style.display = "none";
    }
    box.style.display = "block";
  }else{
    text.textContent = "";
    if(linkBox){
      linkBox.style.display = "none";
      linkAnchor.textContent = "";
      linkAnchor.removeAttribute("href");
    }
    box.style.display = "none";
  }
});

// Announcement popup
let firstAnnouncementLoad = true;
let lastAnnouncement = null;
let announcementDurationMs = 5000;
onValue(ref(db, "control/announcementDuration"), (snap)=>{
  const seconds=Number(snap.val());
  if(Number.isFinite(seconds) && seconds>=1 && seconds<=120) announcementDurationMs=seconds*1000;
});

onValue(ref(db, "announcements/current"), (snap)=>{
  const data = snap.val();
  const current = JSON.stringify(data);

  if(firstAnnouncementLoad){
    firstAnnouncementLoad = false;
    lastAnnouncement = current;
    return;
  }

  if(current === lastAnnouncement) return;
  lastAnnouncement = current;

  if(data && data.message){
    const box = document.getElementById("announcementBox");
    const text = document.getElementById("announcementText");

    if(box && text){
      text.textContent = data.message;
      box.style.display = "block";
      box.classList.remove("announce-anim");
      void box.offsetWidth;
      box.classList.add("announce-anim");

      const notifyAudio = new Audio("data:audio/mp3;base64,//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uUBAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
      notifyAudio.volume = 0.8;
      notifyAudio.play().catch(()=>{});

      clearTimeout(window.announcementTimer);
      window.announcementTimer = setTimeout(()=>{
        box.style.display = "none";
      }, 5000);
    }
  }
});


window.saveKzCode = async function(id, data){
  try{
    await set(ref(db, "verifyCodes/" + id), {
      colors: data.colors || [],
      nonce: data.nonce || null,
      created: serverTimestamp()
    });
  }catch(e){
    console.error("KZ save error", e);
  }
};


// Firebase Presence: eigene ID pro Browser-Tab.
let sessionId = sessionStorage.getItem("offlineDiceOnlineId");
if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("offlineDiceOnlineId", sessionId);
}

const userRef = ref(db, "online/" + sessionId);

function heartbeat() {
  return set(userRef, {
    online: true,
    time: serverTimestamp()
  });
}

const connectedRef = ref(db, ".info/connected");
let heartbeatStarted = false;

onValue(connectedRef, async (snap) => {
  if (snap.val() === true) {
    // Firebase löscht diese Session bei einem echten Disconnect.
    await onDisconnect(userRef).remove();
    await heartbeat();

    if (!heartbeatStarted) {
      heartbeatStarted = true;

      // Heartbeat nur als Lebenszeichen, nicht als Offline-Timer.
      setInterval(heartbeat, 15000);

      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) heartbeat();
      });

      window.addEventListener("focus", heartbeat);
      window.addEventListener("pageshow", heartbeat);
    }
  }
});

// Nur aktive Firebase-Presence-Sessions zählen.
// Kein künstliches Löschen nach einer bestimmten Ping-Zeit.
onValue(ref(db, "online"), (snapshot) => {
  const data = snapshot.val() || {};
  let count = 0;

  for (const entry of Object.values(data)) {
    if (entry && entry.online === true) count++;
  }

  const counter = document.getElementById("onlineCounter");
  if (counter) counter.textContent = "🟢 Online " + count;
});

