
(function(){
  let enabled=localStorage.getItem('slowRevealMode')==='on';
  function setup(){
    if(document.getElementById('slowRevealToggle')) return;
    const b=document.createElement('button'); b.type='button'; b.id='slowRevealToggle'; b.innerHTML='<span class="slow-reveal-dot"></span><span>Slow Reveal</span>';
    b.setAttribute('aria-pressed', enabled?'true':'false');
    b.classList.toggle('on',enabled);
    b.addEventListener('click',function(){ enabled=!enabled; localStorage.setItem('slowRevealMode',enabled?'on':'off'); b.classList.toggle('on',enabled); b.setAttribute('aria-pressed',enabled?'true':'false'); });
    const social=document.getElementById('od-social-links');
    (social||document.body).appendChild(b);
  }
  window.odSlowRevealEnabled=function(){return enabled;};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setup); else setup();
})();
