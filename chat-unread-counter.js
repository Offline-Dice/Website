
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getDatabase, ref, query, orderByChild, limitToLast, onValue } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js";

(function(){
  const launcher = document.getElementById("od-chat-launcher");
  const chat = document.getElementById("od-public-chat");
  const badge = document.getElementById("od-chat-unread");
  if(!launcher || !chat || !badge) return;

  const config = {
    apiKey: "AIzaSyBUT0t1I9Dkee5Ok_uYMzs4WfdwapOA5As",
    authDomain: "kenzy-dice.firebaseapp.com",
    projectId: "kenzy-dice",
    databaseURL: "https://kenzy-dice-default-rtdb.europe-west1.firebasedatabase.app",
    storageBucket: "kenzy-dice.firebasestorage.app",
    messagingSenderId: "578956722062",
    appId: "1:578956722062:web:5156f5737e51ef75246edf"
  };

  const app = getApps().length ? getApps()[0] : initializeApp(config);
  const db = getDatabase(app);
  const chatRef = query(ref(db, "publicChat"), orderByChild("createdAt"), limitToLast(100));

  let unread = 0;
  let initialized = false;
  let knownIds = new Set();

  function openNow(){
    return !chat.classList.contains("od-chat-hidden") &&
           getComputedStyle(chat).display !== "none";
  }

  function updateBadge(){
    if(unread > 0){
      badge.textContent = unread > 99 ? "99+" : String(unread);
      launcher.classList.add("has-unread");
    }else{
      badge.textContent = "0";
      launcher.classList.remove("has-unread");
    }
  }

  function clearUnread(){
    unread = 0;
    updateBadge();
  }
  window.clearChatUnread = clearUnread;

  // The launcher has its own open/close handler. Clear the badge on the
  // actual opening event, not just on every click.
  function isChatOpen(){
    return !chat.classList.contains("od-chat-hidden") &&
           getComputedStyle(chat).display !== "none";
  }

  launcher.addEventListener("click", function(){
    setTimeout(function(){
      if(isChatOpen()) clearUnread();
    }, 0);
  });

  onValue(chatRef, snap => {
    const data = snap.val() || {};
    const currentIds = new Set(Object.keys(data));

    if(!initialized){
      knownIds = currentIds;
      initialized = true;
      updateBadge();
      return;
    }

    let newCount = 0;
    currentIds.forEach(id => {
      if(!knownIds.has(id)) newCount++;
    });
    knownIds = currentIds;

    if(newCount > 0 && !openNow()){
      unread += newCount;
      updateBadge();
    }else if(openNow()){
      clearUnread();
    }
  });
})();
