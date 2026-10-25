
(function(){
  const root=document.getElementById('od-profile-dashboard');
  if(!root) return;

  const openBtn=document.getElementById('odpdOpen');
  const screen=document.getElementById('odpdScreen');
  const saveBtn=document.getElementById('odpdSave');
  const logoutBtn=document.getElementById('odpdLogout');
  const viewBtn=document.getElementById('odpdView');
  const nameInput=document.getElementById('odpdName');
  const bioInput=document.getElementById('odpdBio');
  const file=document.getElementById('odpdFile');
  const chooseFile=document.getElementById('odpdChooseFile');
  const fileName=document.getElementById('odpdFileName');
  const photo=document.getElementById('odpdPhoto');
  const openAvatar=document.getElementById('odpdOpenAvatar');
  const openName=document.getElementById('odpdOpenName');
  const loggedName=document.getElementById('odpdLoggedName');
  const usernameHelp=document.getElementById('odpdUsernameHelp');
  const error=document.getElementById('odpdError');
  const profileView=document.getElementById('odpdProfileView');
  const viewAvatar=document.getElementById('odpdViewAvatar');
  const viewName=document.getElementById('odpdViewName');
  const viewBio=document.getElementById('odpdViewBio');

  let pendingAvatar='';
  let selectedFileName='No file selected';

  function avatarSrc(v){
    if(!v) return '';
    if(String(v).indexOf('data:image')===0) return v;
    return '';
  }

  function syncBackground(){
    const bodyStyle=getComputedStyle(document.body);
    const bg=bodyStyle.backgroundImage;
    if(bg && bg!=='none'){
      screen.style.backgroundImage=bg;
    }else{
      screen.style.backgroundImage='none';
    }
    screen.style.backgroundColor=bodyStyle.backgroundColor||'#111';
    screen.style.backgroundSize=bodyStyle.backgroundSize||'cover';
    screen.style.backgroundPosition=bodyStyle.backgroundPosition||'center center';
    screen.style.backgroundRepeat=bodyStyle.backgroundRepeat||'no-repeat';
  }

  function setImage(el,v){
    const s=avatarSrc(v);
    if(s){
      el.src=s;
      el.style.display='';
    }else{
      el.removeAttribute('src');
      el.style.display='none';
    }
  }

  function updateNames(n){
    const shown=n||'Gast';
    openName.textContent=shown;
    loggedName.textContent=shown;
    usernameHelp.textContent=shown;
    viewName.textContent=shown;
  }

  function load(){
    const n=localStorage.getItem('offlineDicePlayerName')||'Gast';
    pendingAvatar=localStorage.getItem('offlineDiceProfileImage')||'';
    const bio=localStorage.getItem('offlineDiceProfileBio')||'';
    nameInput.value=n==='Gast'?'':n;
    bioInput.value=bio;
    selectedFileName='No file selected';
    fileName.textContent=selectedFileName;
    updateNames(n);
    setImage(photo,pendingAvatar);
    setImage(openAvatar,pendingAvatar);
    setImage(viewAvatar,pendingAvatar);
    error.style.display='none';
    profileView.classList.remove('active');
    syncStats();
    syncBackground();
  }

  function readCounter(key){
    const v=Number(localStorage.getItem(key));
    return Number.isFinite(v)&&v>=0 ? Math.floor(v) : 0;
  }
  // Statistics cards were removed from the profile UI.
  // Keep these functions harmless so the existing dice logic can still call
  // addCounter without breaking the profile script.
  function syncStats(){}
  function addCounter(key){
    const next=readCounter(key)+1;
    localStorage.setItem(key,String(next));
  }

  function open(){
    load();
    root.classList.add('odpd-active');
    document.body.style.overflow='hidden';
  }
  function close(){
    root.classList.remove('odpd-active');
    document.body.style.overflow='';
  }

  openBtn.addEventListener('click',open);
  document.getElementById('odpdBack').addEventListener('click',close);
  chooseFile.addEventListener('click',()=>file.click());

  file.addEventListener('change',()=>{
    const f=file.files&&file.files[0];
    if(!f)return;
    if(f.size>5*1024*1024){
      error.textContent='Profile photo must be 5 MB or smaller.';
      error.style.display='block';
      return;
    }
    selectedFileName=f.name;
    fileName.textContent=f.name;
    const r=new FileReader();
    r.onload=()=>{
      pendingAvatar=String(r.result||'');
      setImage(photo,pendingAvatar);
      setImage(openAvatar,pendingAvatar);
      setImage(viewAvatar,pendingAvatar);
      error.style.display='none';
    };
    r.readAsDataURL(f);
  });

  nameInput.addEventListener('input',()=>updateNames(nameInput.value.trim()||'Gast'));

  viewBtn.addEventListener('click',()=>{
    viewBio.textContent=bioInput.value.trim()||'No bio added yet.';
    setImage(viewAvatar,pendingAvatar);
    profileView.classList.toggle('active');
  });

  logoutBtn.addEventListener('click',()=>{
    localStorage.removeItem('offlineDicePlayerName');
    localStorage.removeItem('offlineDiceProfileImage');
    localStorage.removeItem('offlineDiceProfileBio');
    window.dispatchEvent(new CustomEvent('offlineDiceLogout'));
    close();
    setTimeout(()=>location.reload(),50);
  });

  saveBtn.addEventListener('click',async()=>{
    const n=nameInput.value.trim()||'Gast';
    const bio=bioInput.value.trim();

    saveBtn.disabled=true;
    saveBtn.textContent='Saving...';
    error.style.display='none';

    try{
      const {initializeApp,getApps}=await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js');
      const {getDatabase,ref,get,update}=await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js');
      const cfg={
        apiKey:'AIzaSyBUT0t1I9Dkee5Ok_uYMzs4WfdwapOA5As',
        authDomain:'kenzy-dice.firebaseapp.com',
        databaseURL:'https://kenzy-dice-default-rtdb.europe-west1.firebasedatabase.app',
        projectId:'kenzy-dice',
        storageBucket:'kenzy-dice.firebasestorage.app',
        messagingSenderId:'578956722062',
        appId:'1:578956722062:web:5156f5737e51ef75246edf'
      };
      const app=getApps().length?getApps()[0]:initializeApp(cfg);
      const db=getDatabase(app);
      const uid=localStorage.getItem('offlineDiceFirebaseUserId')||'';
      const snap=await get(ref(db,'registeredUsers'));
      let duplicate=false;
      if(snap.exists()){
        snap.forEach(c=>{
          const d=c.val()||{};
          if(c.key!==uid&&String(d.name||'').trim().toLowerCase()===n.toLowerCase())duplicate=true;
        });
      }
      if(duplicate){
        error.textContent='This username is already taken.';
        error.style.display='block';
        return;
      }

      localStorage.setItem('offlineDicePlayerName',n);
      localStorage.setItem('offlineDiceProfileImage',pendingAvatar||'');
      localStorage.setItem('offlineDiceProfileBio',bio);

      // Sync the profile picture to Firebase so other chat users can see it.
      try{
        const profileUid=localStorage.getItem('offlineDiceFirebaseUserId')||'';
        if(profileUid){
          await update(ref(db,'registeredUsers/'+profileUid),{
            name:n,
            profileImage:pendingAvatar||''
          });
        }
      }catch(profileWriteError){
        console.warn('Profile image sync failed:',profileWriteError);
      }

      updateNames(n);
      setImage(photo,pendingAvatar);
      setImage(openAvatar,pendingAvatar);
      window.dispatchEvent(new CustomEvent('offlineDiceLogin',{detail:{name:n}}));
      close();
    }catch(e){
      error.textContent='Could not save profile. Please check your connection.';
      error.style.display='block';
    }finally{
      saveBtn.disabled=false;
      saveBtn.textContent='Save profile';
    }
  });

  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&root.classList.contains('odpd-active'))close();
  });

  const themeSelect=document.getElementById('themeSelect');
  if(themeSelect){
    themeSelect.addEventListener('change',()=>setTimeout(syncBackground,0));
  }

  window.addEventListener('offlineDiceLogin',()=>setTimeout(load,0));
  window.addEventListener('offlineDiceLogout',()=>setTimeout(load,0));
  window.addEventListener('offlineDiceOpenProfile',()=>setTimeout(open,50));

  load();
})();
