
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js";

const cleanBlueFirebaseConfig = {
  apiKey: "AIzaSyBUT0t1I9Dkee5Ok_uYMzs4WfdwapOA5As",
  authDomain: "kenzy-dice.firebaseapp.com",
  projectId: "kenzy-dice",
  databaseURL: "https://kenzy-dice-default-rtdb.europe-west1.firebasedatabase.app",
  storageBucket: "kenzy-dice.firebasestorage.app",
  messagingSenderId: "578956722062",
  appId: "1:578956722062:web:5156f5737e51ef75246edf"
};
const cleanBlueApp = getApps().length ? getApps()[0] : initializeApp(cleanBlueFirebaseConfig);
const cleanBlueDb = getDatabase(cleanBlueApp);
(function(){
  const intro=document.getElementById("od-intro");
  const phase=intro&&intro.querySelector(".od-login-phase");
  const welcome=intro&&intro.querySelector(".od-welcome-phase");
  const welcomeName=document.getElementById("od-welcome-name");
  const form=document.getElementById("od-login-form");
  const input=document.getElementById("od-login-name");
  const error=document.getElementById("od-login-error");
  const NAME_KEY="offlineDicePlayerName";
  if(!intro||!phase||!welcome||!welcomeName||!form||!input)return;

  let done=false;

  function finish(){
    if(done)return;
    done=true;
    intro.classList.add("is-done");
    setTimeout(function(){if(intro.parentNode)intro.remove();},650);
  }

  function showWelcome(name){
    welcomeName.textContent=name;
    welcome.setAttribute("aria-hidden","false");
    intro.classList.add("od-show-welcome");
    // Short welcome animation.
    setTimeout(finish,1000);
  }

  function finishLogin(name){
    const cleanName=String(name||"").trim().replace(/\s+/g," ").slice(0,24);
    if(!cleanName)return;
    localStorage.setItem(NAME_KEY,cleanName);
    window.dispatchEvent(new CustomEvent("offlineDiceLogin",{detail:{name:cleanName}}));
    intro.classList.remove("od-show-login");
    phase.setAttribute("aria-hidden","true");

    // After entering a new name, open the profile settings immediately.
    setTimeout(function(){
      window.dispatchEvent(new CustomEvent("offlineDiceOpenProfile"));
      setTimeout(finish,120);
    },350);
  }

  function showLogin(){
    phase.setAttribute("aria-hidden","false");
    intro.classList.add("od-show-login");
    setTimeout(function(){input.focus();},550);
  }

  form.addEventListener("submit",async function(e){
    e.preventDefault();
    const name=String(input.value||"").trim().replace(/\s+/g," ").slice(0,24);
    if(!name){
      error.textContent="Please enter your name.";
      input.focus();
      return;
    }

    const normalizedName=name.toLowerCase();
    const ownUserId=localStorage.getItem("offlineDiceFirebaseUserId");
    const button=form.querySelector("button[type=submit]");
    button.disabled=true;
    error.textContent="Checking name...";

    try{
      const snapshot=await get(ref(cleanBlueDb,"registeredUsers"));
      const users=snapshot.val()||{};
      const nameTaken=Object.entries(users).some(([id,user])=>{
        if(id===ownUserId || !user || typeof user.name!=="string") return false;
        return user.name.trim().replace(/\s+/g," ").toLowerCase()===normalizedName;
      });

      if(nameTaken){
        error.textContent="This name is already taken. Please choose another name.";
        input.focus();
        input.select();
        return;
      }

      error.textContent="";
      finishLogin(name);
    }catch(err){
      console.error("Name check:",err);
      error.textContent="Could not check the name. Please try again.";
    }finally{
      button.disabled=false;
    }
  });
  input.addEventListener("input",function(){error.textContent="";});

  function start(){
    const original=document.querySelector(".top-logo");
    const logo=intro.querySelector(".od-intro-logo");
    if(original&&logo)logo.src=original.currentSrc||original.src;

    setTimeout(function(){
      const saved=localStorage.getItem(NAME_KEY);
      if(saved){
        // Already logged in: personalized welcome, no login prompt.
        showWelcome(saved);
      }else{
        showLogin();
      }
    },500);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();
