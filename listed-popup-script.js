
(function(){
  function setupListedPopup(){
    const popup=document.getElementById('listedPopup');
    const buttons=document.querySelectorAll('.get-listed-btn');
    const closeBtn=popup ? popup.querySelector('.listed-popup-close') : null;
    if(!popup || !buttons.length) return;
    function openPopup(e){
      if(e){ e.preventDefault(); e.stopPropagation(); }
      popup.classList.add('active');
      popup.setAttribute('aria-hidden','false');
    }
    function closePopup(e){
      if(e){ e.preventDefault(); e.stopPropagation(); }
      popup.classList.remove('active');
      popup.setAttribute('aria-hidden','true');
    }
    buttons.forEach(function(btn){ btn.addEventListener('click',openPopup); });
    if(closeBtn) closeBtn.addEventListener('click',closePopup);
    popup.addEventListener('click',function(e){ if(e.target===popup) closePopup(e); });
    document.addEventListener('keydown',function(e){ if(e.key==='Escape') closePopup(e); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setupListedPopup);
  else setupListedPopup();
})();
