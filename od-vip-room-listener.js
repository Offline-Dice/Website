
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js";

const vipConfig = {
  apiKey:"AIzaSyBUT0t1I9Dkee5Ok_uYMzs4WfdwapOA5As",
  authDomain:"kenzy-dice.firebaseapp.com",
  projectId:"kenzy-dice",
  databaseURL:"https://kenzy-dice-default-rtdb.europe-west1.firebasedatabase.app",
  storageBucket:"kenzy-dice.firebasestorage.app",
  messagingSenderId:"578956722062",
  appId:"1:578956722062:web:5156f5737e51ef75246edf"
};

const vipApp = getApps().length ? getApps()[0] : initializeApp(vipConfig,"offlineDiceVipRoom");
const vipDb = getDatabase(vipApp);
const fallbackImage = "vip-fallback.jpg";

function getLoggedInName(){
  return String(localStorage.getItem("offlineDicePlayerName") || "").trim();
}

function renderVip(v){
  const box=document.getElementById("od-vip-room");
  const img=document.getElementById("od-vip-image");
  const name=document.getElementById("od-vip-name");
  const label=document.getElementById("od-vip-label");
  if(!box||!img||!name||!label)return;

  const image=v && (v.imageData || v.image);

  // Assigned VIP Room: keep the existing VIP Room behavior.
  if(v && v.name && image){
    img.src=image;
    img.onload=()=>box.style.display="block";
    img.onerror=()=>box.style.display="none";
    name.textContent=v.name;
    label.textContent="VIP ROOM";
    return;
  }

  // No VIP Room assigned: show the logged-in user's own room.
  const userName=getLoggedInName();
  if(!userName){
    box.style.display="none";
    return;
  }

  img.src=fallbackImage;
  img.onload=()=>box.style.display="block";
  img.onerror=()=>box.style.display="none";
  name.textContent=userName + "'s";
  label.textContent="ROOM";
}

function connectVip(){
  const uid=localStorage.getItem("offlineDiceFirebaseUserId");
  if(!uid)return false;
  onValue(ref(vipDb,"registeredUsers/"+uid+"/vipRoom"),snap=>renderVip(snap.val()));
  return true;
}

function start(){
  if(connectVip())return;
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(connectVip() || tries>=30)clearInterval(timer);
  },500);
}

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",start,{once:true});
}else{
  start();
}
