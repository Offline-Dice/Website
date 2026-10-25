
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getDatabase, ref, push, query, orderByChild, limitToLast, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js";

const odChatConfig = {
  apiKey: "AIzaSyBUT0t1I9Dkee5Ok_uYMzs4WfdwapOA5As",
  authDomain: "kenzy-dice.firebaseapp.com",
  projectId: "kenzy-dice",
  databaseURL: "https://kenzy-dice-default-rtdb.europe-west1.firebasedatabase.app",
  storageBucket: "kenzy-dice.firebasestorage.app",
  messagingSenderId: "578956722062",
  appId: "1:578956722062:web:5156f5737e51ef75246edf"
};

const odChatApp = getApps().length ? getApps()[0] : initializeApp(odChatConfig);
const odChatDb = getDatabase(odChatApp);
const OD_CHAT_PATH = "publicChat";
const OD_BLOCKED_WORDS_PATH = "chatBlockedWords";
let odBlockedWords = [];

const chat = document.getElementById("od-public-chat");
const messagesEl = document.getElementById("od-chat-messages");
const emptyEl = document.getElementById("od-chat-empty");
const form = document.getElementById("od-chat-form");
const input = document.getElementById("od-chat-input");
const send = document.getElementById("od-chat-send");
const status = document.getElementById("od-chat-status");
const closeBtn = document.getElementById("od-chat-close");

let odChatProfileImages = {};
onValue(ref(odChatDb, "registeredUsers"), snap=>{
  const users=snap.val()||{};
  const map={};
  Object.values(users).forEach(user=>{
    if(!user || !user.name || !user.profileImage) return;
    const image=String(user.profileImage);
    if(image.indexOf("data:image/")!==0) return;
    map[String(user.name).trim().toLowerCase()]=image;
  });
  odChatProfileImages=map;
  if(typeof renderMessages==="function") renderMessages(window.__odChatData||{});
});

function odNormalizeBlockedWord(value){
  return String(value || "").trim().replace(/\\s+/g," ").toLocaleLowerCase("de-DE");
}

function odMessageContainsBlockedWord(message){
  const text = String(message || "").toLocaleLowerCase("de-DE");
  return odBlockedWords.some(word=>{
    const w = odNormalizeBlockedWord(word);
    if(!w) return false;
    if(w.includes(" ")) return text.includes(w);
    try{
      return new RegExp("(^|[^\\p{L}\\p{N}_])" + w.replace(/[.*+?^${}()|[\\]\\\\]/g,"\\\\$&") + "($|[^\\p{L}\\p{N}_])","iu").test(text);
    }catch{
      return text.includes(w);
    }
  });
}

onValue(ref(odChatDb, OD_BLOCKED_WORDS_PATH), snap=>{
  const data = snap.val();
  if(Array.isArray(data)){
    odBlockedWords = data.map(odNormalizeBlockedWord).filter(Boolean);
  }else{
    odBlockedWords = Object.values(data || {}).map(odNormalizeBlockedWord).filter(Boolean);
  }
});
const launcher = document.getElementById("od-chat-launcher");
launcher.addEventListener("click",()=>{ chat.classList.remove("od-chat-hidden"); input.focus(); });


closeBtn.addEventListener("click", () => chat.classList.add("od-chat-hidden"));

function getLoggedInName(){
  return String(localStorage.getItem("offlineDicePlayerName") || "").trim().replace(/\s+/g," ").slice(0,24);
}

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}

function formatTime(value){
  const ms = typeof value === "number" ? value : Date.now();
  try{
    return new Intl.DateTimeFormat("de-DE",{hour:"2-digit",minute:"2-digit"}).format(new Date(ms));
  }catch{
    return "";
  }
}

function renderMessages(data){
  window.__odChatData=data||{};
  messagesEl.innerHTML="";
  const entries=Object.entries(data||{});
  if(!entries.length){
    messagesEl.appendChild(emptyEl);
    return;
  }
  entries.forEach(([id,m])=>{
    if(!m||!m.text||!m.name)return;

    const box=document.createElement("div");
    box.className="od-chat-message";

    const nameRow=document.createElement("span");
    nameRow.className="od-chat-name-row";

    const avatar=document.createElement("img");
    avatar.className="od-chat-avatar";
    avatar.alt="";
    avatar.loading="lazy";
    // Prefer the image saved with the chat message. This makes the avatar
    // stay attached to that user's message even if the profile changes later.
    const messageImage=String(m.profileImage||"");
    const profileImage=messageImage.indexOf("data:image/")===0
      ? messageImage
      : odChatProfileImages[String(m.name).trim().toLowerCase()]||"";

    if(profileImage.indexOf("data:image/")===0){
      avatar.src=profileImage;
      avatar.style.display="block";
    }else{
      // Keep a visible neutral avatar slot so the name is always positioned
      // next to the profile-picture area.
      avatar.style.display="block";
      avatar.src="data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">'+
        '<circle cx="12" cy="12" r="12" fill="#252830"/>'+
        '<circle cx="12" cy="9" r="4" fill="#9aa0aa"/>'+
        '<path d="M5 21c.9-4 3.3-6 7-6s6.1 2 7 6" fill="#9aa0aa"/>'+
        '</svg>'
      );
    }
    nameRow.appendChild(avatar);

    const name=document.createElement("span");
    name.className="od-chat-name";
    name.textContent=String(m.name);
    nameRow.appendChild(name);

    const role=window.__odChatRoles
      ? window.__odChatRoles[encodeURIComponent(String(m.name).trim()).replace(/\./g,"%2E")]||""
      : "";
    if(role){
      const roleEl=document.createElement("span");
      roleEl.className="od-chat-role";
      roleEl.textContent=String(role);
      nameRow.appendChild(roleEl);
    }

    const textEl=document.createElement("span");
    textEl.className="od-chat-text";
    textEl.textContent=String(m.text);

    const timeEl=document.createElement("span");
    timeEl.className="od-chat-time";
    timeEl.textContent=formatTime(m.createdAt);

    box.appendChild(nameRow);
    box.appendChild(textEl);
    box.appendChild(timeEl);
    messagesEl.appendChild(box);
  });
  messagesEl.scrollTop=messagesEl.scrollHeight;
}

onValue(
  query(ref(odChatDb, OD_CHAT_PATH), orderByChild("createdAt"), limitToLast(100)),
  snap=>{
    renderMessages(snap.val());
    status.textContent="Live · letzte 100 Nachrichten";
  },
  err=>{
    console.error("Public chat read error:",err);
    status.textContent="Chat nicht verfügbar";
  }
);

// Roles are read separately so the normal message send path stays unchanged.
onValue(
  ref(odChatDb, "chatRoles"),
  snap=>{
    window.__odChatRoles = snap.val() || {};
    renderMessages(window.__odChatData || {});
  },
  err=>console.warn("Chat roles read error:", err)
);

form.addEventListener("submit", async e=>{
  e.preventDefault();
  const name=getLoggedInName();
  const text=String(input.value || "").trim().replace(/\s+/g," ").slice(0,300);
  if(!name){
    status.textContent="Bitte zuerst anmelden.";
    return;
  }
  if(!text) return;

  if(odMessageContainsBlockedWord(text)){
    status.textContent="❌ Diese Nachricht enthält ein gesperrtes Wort.";
    return;
  }

  send.disabled=true;
  try{
    const senderProfileImage=String(localStorage.getItem("offlineDiceProfileImage")||"");

    // Chat writes go through the Offline Dice Cloudflare Worker.
    // The Worker checks the browser Origin and performs the Firebase write server-side.
    const chatResponse = await fetch(DICE_WORKER_URL + "/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      cache: "no-store",
      body: JSON.stringify({
        name: name,
        text: text,
        profileImage: senderProfileImage.indexOf("data:image/")===0 ? senderProfileImage : ""
      })
    });

    let chatResult = null;
    try {
      chatResult = await chatResponse.json();
    } catch {}

    if (!chatResponse.ok || !chatResult || chatResult.ok !== true) {
      throw new Error(
        String(chatResult?.error || "Chat Worker request failed (" + chatResponse.status + ")")
      );
    }

    input.value="";
    input.focus();
  }catch(err){
    console.error("Public chat write error:",err);
    status.textContent="Nachricht konnte nicht gesendet werden";
  }finally{
    send.disabled=false;
  }
});

window.addEventListener("offlineDiceLogin", event=>{
  if(event.detail && event.detail.name){
    status.textContent="Angemeldet als "+event.detail.name;
  }
});

const initialName=getLoggedInName();
if(initialName) status.textContent="Angemeldet als "+initialName;
