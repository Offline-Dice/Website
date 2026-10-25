
(function(){
  const gameSelect=document.getElementById('colorDice');
  const area=document.getElementById('liveBattleArea');
  const spin=document.getElementById('lbSpinButton');
  const autoRollButton=document.getElementById('lbAutoRollButton');
  const rollCount=document.getElementById('lbRollCount');
  const add=document.getElementById('lbAddPlayerButton');
  const remove=document.getElementById('lbRemovePlayerButton');
  const playerCount=document.getElementById('lbPlayerCount');
  if(!gameSelect||!area||!spin||!rollCount)return;

  const colors=[
    {name:'Red',color:'#ef4444',emoji:'🔴'},
    {name:'Orange',color:'#f59e0b',emoji:'🟠'},
    {name:'Yellow',color:'#facc15',emoji:'🟡'},
    {name:'Green',color:'#008b00',emoji:'🟢'},
    {name:'Blue',color:'#0066ff',emoji:'🔵'},
    {name:'Purple',color:'#8b2be2',emoji:'🟣'}
  ];

  const p=[
    {name:'PLAYER 1',color:'#0066ff',colorName:'Blue',hits:0},
    {name:'PLAYER 2',color:'#008b00',colorName:'Green',hits:0},
    {name:'PLAYER 3',color:'#f59e0b',colorName:'Orange',hits:0},
    {name:'PLAYER 4',color:'#facc15',colorName:'Yellow',hits:0}
  ];

  let activePlayers=2, roll=0, rolling=false, autoRolling=false, autoToken=0;

  function sync(){
    for(let i=3;i<=4;i++){
      const card=document.getElementById('lbBattlePlayer'+i);
      const setting=document.getElementById('lbSetting'+i);
      if(card)card.hidden=i>activePlayers;
      if(setting)setting.hidden=i>activePlayers;
    }
    if(playerCount)playerCount.textContent=activePlayers+' / 4 PLAYERS';
    const locked=area.classList.contains('lb-locked');
    if(add)add.disabled=locked||activePlayers>=4;
    if(remove)remove.disabled=locked||activePlayers<=2;
    const lbThemeLock=document.getElementById('themeSelect');
    if(lbThemeLock)lbThemeLock.disabled=locked;

    // During an active round, don't allow settings to be changed.
    // This includes the dice count, game mode, theme, roll count,
    // player names and player colors.
    const themeSelect=document.getElementById('themeSelect');
    const diceSelect=document.getElementById('numDice');
    if(diceSelect)diceSelect.disabled=locked;
    const modeSelect=document.getElementById('colorDice');
    if(modeSelect)modeSelect.disabled=locked;
    const rollsSelect=document.getElementById('lbRollCount');
    if(rollsSelect)rollsSelect.disabled=locked;

    for(let i=1;i<=4;i++){
      const input=document.getElementById('lbName'+i);
      if(input)input.disabled=locked||i>activePlayers;
    }
    document.querySelectorAll('#liveBattleArea .lb-color').forEach(b=>{
      b.disabled=locked||Number(b.dataset.player)>activePlayers;
    });
  }

  function updateNames(){
    for(let i=1;i<=activePlayers;i++){
      const input=document.getElementById('lbName'+i);
      const display=document.getElementById('lbPlayerDisplay'+i);
      p[i-1].name=((input&&input.value.trim())||('PLAYER '+i)).slice(0,16);
      if(display)display.textContent=p[i-1].name;
    }
  }

  function chooseColor(btn){
    if(area.classList.contains('lb-locked'))return;
    const i=Number(btn.dataset.player);
    if(!i||i>activePlayers)return;
    p[i-1].color=btn.dataset.color;
    p[i-1].colorName=btn.dataset.name;
    btn.parentElement.querySelectorAll('.lb-color').forEach(x=>x.classList.remove('selected'));
    btn.classList.add('selected');
    const c=colors.find(x=>x.name===p[i-1].colorName);
    const display=document.getElementById('lbCurrentColor'+i);
    if(display)display.textContent=(c?c.emoji:'🎨')+' '+p[i-1].colorName;
    p[i-1].hits=0;
    document.getElementById('lbHits'+i).textContent='0';
    roll=0;
    document.getElementById('lbRollProgress').textContent='ROLL 0 / '+rollCount.value;
  }

  document.querySelectorAll('#liveBattleArea .lb-color').forEach(btn=>{
    btn.addEventListener('click',function(e){
      e.preventDefault();
      chooseColor(btn);
    });
  });

  for(let i=1;i<=4;i++){
    const input=document.getElementById('lbName'+i);
    if(input)input.addEventListener('input',function(){
      if(!area.classList.contains('lb-locked'))updateNames();
    });
  }

  function lock(yes){
    area.classList.toggle('lb-locked',yes);
    const diceSelect=document.getElementById('numDice');
    const modeSelect=document.getElementById('colorDice');
    const rollsSelect=document.getElementById('lbRollCount');
    const themeSelect=document.getElementById('themeSelect');

    if(diceSelect)diceSelect.disabled=yes;
    if(modeSelect)modeSelect.disabled=yes;
    if(rollsSelect)rollsSelect.disabled=yes;
    if(themeSelect)themeSelect.disabled=yes;

    // Roll Again and Auto Roll intentionally stay usable during the battle.
    if(spin)spin.disabled=false;
    if(autoRollButton)autoRollButton.disabled=false;
    sync();
  }

  function reset(){
    stopAuto();
    const overlay=document.getElementById('lbWinnerOverlay');
    if(overlay){
      overlay.classList.remove('active','lb-closing');
      overlay.setAttribute('aria-hidden','true');
    }
    rolling=false;roll=0;
    lock(false);
    for(let i=0;i<4;i++){
      p[i].hits=0;
      const h=document.getElementById('lbHits'+(i+1));
      if(h)h.textContent='0';
    }
    document.getElementById('lbRollProgress').textContent='ROLL 0 / '+rollCount.value;
    updateNames();
    renderPreview();
  }
  window.resetLiveBattle=reset;

  function createDie(color){
    const d=document.createElement('div');
    d.className='color-block lb-die';
    d.style.backgroundColor=color;
    const dot=document.createElement('div');
    dot.className='dot';
    d.appendChild(dot);
    return d;
  }

  function renderPreview(){
    const box=document.getElementById('lbDiceArea');
    const n=Math.max(1,Math.min(6,Number(document.getElementById('numDice').value)||1));
    box.innerHTML='';
    for(let i=0;i<n;i++)box.appendChild(createDie('#bdbdbd'));
  }

  function showWinner(){
    const overlay=document.getElementById('lbWinnerOverlay');
    const name=document.getElementById('lbWinnerName');
    const score=document.getElementById('lbWinnerScore');
    let best=-1,winner='DRAW',tie=false;
    for(let i=0;i<activePlayers;i++){
      if(p[i].hits>best){best=p[i].hits;winner=p[i].name;tie=false;}
      else if(p[i].hits===best){tie=true;}
    }
    if(tie)winner='DRAW';
    name.textContent=winner;
    score.textContent=p.slice(0,activePlayers).map(x=>x.hits).join(' - ')+' HITS';
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden','false');
    lock(false);
    area.classList.remove('lb-locked');
    const lbThemeUnlock=document.getElementById('themeSelect');
    if(lbThemeUnlock)lbThemeUnlock.disabled=false;
    if(spin)spin.disabled=false;
    if(autoRollButton)autoRollButton.disabled=false;
  }

  async function spinBattle(){
    if(rolling||gameSelect.value!=='livebattle')return;
    rolling=true;
    lock(true);
    updateNames();

    const total=Number(rollCount.value)||10;
    const n=Math.max(1,Math.min(6,Number(document.getElementById('numDice').value)||1));
    if(roll===0){
      for(let i=0;i<activePlayers;i++){
        p[i].hits=0;
        document.getElementById('lbHits'+(i+1)).textContent='0';
      }
    }
    roll++;
    document.getElementById('lbRollProgress').textContent='ROLL '+roll+' / '+total;

    const box=document.getElementById('lbDiceArea');
    box.innerHTML='';
    const dice=[];
    for(let i=0;i<n;i++){
      const d=createDie('#e0e0e0');
      d.classList.add('lb-battle-rolling');
      box.appendChild(d);
      dice.push(d);
    }
    try{if(typeof playDiceRollSound==='function')playDiceRollSound();}catch(e){}
    await new Promise(r=>setTimeout(r,1000));

    const matches=Array(activePlayers).fill(0);
    let workerResults;
    try {
      workerResults = await getWorkerColorResults(n);
    } catch (workerError) {
      console.error('Offline Dice Worker roll failed:', workerError);
      dice.forEach(d => {
        d.classList.remove('lb-battle-rolling');
        d.style.backgroundColor = '#e0e0e0';
      });
      rolling=false;
      sync();
      return;
    }

    for(let i=0;i<n;i++){
      const resultName = workerResults[i];
      const lookupName = String(resultName).toLowerCase() === 'gold' ? 'yellow' : String(resultName).toLowerCase();
      const result = colors.find(c => c.name.toLowerCase() === lookupName);
      if(!result) throw new Error('Unknown color from Dice Worker: ' + resultName);

      dice[i].classList.remove('lb-battle-rolling');
      dice[i].style.backgroundColor=result.color;
      for(let j=0;j<activePlayers;j++){
        if(result.color.toLowerCase()===p[j].color.toLowerCase())matches[j]++;
      }
      setTimeout(()=>dice[i].classList.remove('lb-battle-exit'),120);
      dice[i].classList.add('lb-battle-exit');
    }
    for(let j=0;j<activePlayers;j++){
      p[j].hits+=matches[j];
      document.getElementById('lbHits'+(j+1)).textContent=p[j].hits;
    }

    await new Promise(r=>setTimeout(r,180));
    rolling=false;
    if(roll>=total){
      document.getElementById('lbRollProgress').textContent='FINISHED · '+total+' ROLLS';
      roll=0;
      showWinner();
      stopAuto();
    }else{
      // Keep all battle settings locked between rolls.
      // ROLL AGAIN and AUTO ROLL remain usable.
      sync();
    }
  }

  function stopAuto(){
    autoRolling=false;
    autoToken++;
    if(autoRollButton){
      autoRollButton.classList.remove('active');
      autoRollButton.textContent='AUTO ROLL';
    }
  }

  async function startAuto(){
    if(autoRolling||rolling||gameSelect.value!=='livebattle')return;
    autoRolling=true;
    const token=++autoToken;
    autoRollButton.classList.add('active');
    autoRollButton.textContent='AUTO ROLL ON';
    while(autoRolling&&token===autoToken&&gameSelect.value==='livebattle'){
      const total=Number(rollCount.value)||10;
      if(roll>=total){stopAuto();break;}
      await spinBattle();
      if(!autoRolling||token!==autoToken)break;
      await new Promise(r=>setTimeout(r,700));
    }
    if(token===autoToken)stopAuto();
  }

  add&&add.addEventListener('click',function(){
    if(activePlayers<4&&!area.classList.contains('lb-locked')){
      activePlayers++;
      sync();
      const input=document.getElementById('lbName'+activePlayers);
      if(input)input.focus();
    }
  });

  remove&&remove.addEventListener('click',function(){
    if(activePlayers>2&&!area.classList.contains('lb-locked')){
      const old=activePlayers;
      const input=document.getElementById('lbName'+old);
      if(input)input.value='';
      p[old-1].hits=0;
      document.getElementById('lbHits'+old).textContent='0';
      activePlayers--;
      roll=0;
      document.getElementById('lbRollProgress').textContent='ROLL 0 / '+rollCount.value;
      sync();
      updateNames();
    }
  });

  spin.addEventListener('click',spinBattle);
  autoRollButton.addEventListener('click',()=>autoRolling?stopAuto():startAuto());

  document.getElementById('lbWinnerClose').addEventListener('click',function(){
    const overlay=document.getElementById('lbWinnerOverlay');
    overlay.classList.add('lb-closing');
    setTimeout(()=>{
      overlay.classList.remove('active','lb-closing');
      overlay.setAttribute('aria-hidden','true');
      reset();
    },320);
  });

  rollCount.addEventListener('change',function(){
    if(area.classList.contains('lb-locked'))return;
    roll=0;
    for(let i=0;i<activePlayers;i++){
      p[i].hits=0;
      document.getElementById('lbHits'+(i+1)).textContent='0';
    }
    document.getElementById('lbRollProgress').textContent='ROLL 0 / '+rollCount.value;
  });

  gameSelect.addEventListener('change',function(){
    if(gameSelect.value==='livebattle'){
      const select=document.getElementById('numDice');
      const saved=(typeof modeValues!=='undefined'&&modeValues.livebattle)?Number(modeValues.livebattle):1;
      select.value=String(Math.max(1,Math.min(6,saved||1)));
      reset();
      renderPreview();
    }
  });

  // Initial state: controls are usable immediately. No invisible lock.
  area.classList.remove('lb-locked');
  sync();
  updateNames();
  renderPreview();
})();
