
(function(){
  const chat = document.getElementById("od-public-chat");
  const launcher = document.getElementById("od-chat-launcher");
  if(!chat || !launcher) return;

  let closingTimer = null;

  function openChatAnimated(){
    clearTimeout(closingTimer);
    chat.classList.remove("od-chat-hidden","od-chat-closing");
    chat.classList.add("od-chat-animating","od-chat-opening");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        chat.classList.remove("od-chat-opening");
        chat.classList.remove("od-chat-animating");
      });
    });
  }

  function closeChatAnimated(){
    clearTimeout(closingTimer);
    chat.classList.remove("od-chat-opening");
    chat.classList.add("od-chat-animating","od-chat-closing");
    closingTimer = setTimeout(() => {
      chat.classList.remove("od-chat-animating","od-chat-closing");
      chat.classList.add("od-chat-hidden");
    }, 220);
  }

  launcher.addEventListener("click", function(e){
    e.stopImmediatePropagation();
    const hidden = chat.classList.contains("od-chat-hidden") ||
                   getComputedStyle(chat).display === "none";
    if(hidden) {
      // Clear unread state immediately when the chat is opened.
      if(typeof window.clearChatUnread === "function") window.clearChatUnread();
      openChatAnimated();
    } else closeChatAnimated();
  }, true);

  const close = chat.querySelector(".od-chat-close");
  if(close){
    close.addEventListener("click", function(e){
      e.stopImmediatePropagation();
      closeChatAnimated();
    }, true);
  }
})();
