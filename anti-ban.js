
let antiBan = localStorage.getItem("antiBanMode")==="on";

function createAntiBan(){
    if(document.getElementById("antiBanBox")) return;

    const box=document.createElement("div");
    box.id="antiBanBox";
    box.innerHTML='<span id="antiBanText">Anti-Ban Mode</span><button type="button" id="antiBanSwitch"></button>';

    document.body.appendChild(box);

    document.getElementById("antiBanSwitch").onclick=(e)=>{
        e.preventDefault();
        e.stopPropagation();
        antiBan=!antiBan;
        localStorage.setItem("antiBanMode", antiBan?"on":"off");
        applyAntiBan();
    };
}

// LAST 20 ROLLS: Farben beim Darüberfahren genauso kurz aufdecken wie die Hauptwürfel.
if (!window.__last20AntiBanHoverBound) {
    window.__last20AntiBanHoverBound = true;
    document.addEventListener("mouseover", function(e) {
        if (!antiBan) return;
        const target = e.target && e.target.closest ? e.target.closest("#last20Rolls .last20-die, #last20Rolls .last20-dot") : null;
        if (!target || target.contains(e.relatedTarget)) return;
        target.classList.remove("antiBlur");
        target.classList.add("antiBanDice", "antiBanRevealed");
    });
    document.addEventListener("mouseout", function(e) {
        if (!antiBan) return;
        const target = e.target && e.target.closest ? e.target.closest("#last20Rolls .last20-die, #last20Rolls .last20-dot") : null;
        if (!target || target.contains(e.relatedTarget)) return;
        target.classList.remove("antiBanRevealed");
        target.classList.add("antiBlur");
    });
}

function applyAntiBan(){
    createAntiBan();

    const sw=document.getElementById("antiBanSwitch");
    if(sw) sw.classList.toggle("on",antiBan);

    document.querySelectorAll(".antiBlur").forEach(e=>e.classList.remove("antiBlur"));
    document.querySelectorAll(".antiBanRevealed").forEach(e=>e.classList.remove("antiBanRevealed"));

    if(!antiBan) return;

    document.querySelectorAll("select").forEach(e=>e.classList.add("antiBlur"));

    // Logo im Anti-Ban Mode ebenfalls dauerhaft verwischen.
    document.querySelectorAll(".top-logo").forEach(e=>e.classList.add("antiBlur"));

    document.querySelectorAll("*").forEach(e=>{
        if(e.textContent.trim().toUpperCase()==="ROLL COLOR DICE")
            e.classList.add("antiBlur");
    });

    // Auch die Würfel-Farben in LAST 20 ROLLS im Anti-Ban-Modus zensieren.
    document.querySelectorAll("#last20Rolls .last20-die, #last20Rolls .last20-dot").forEach(e=>{
        e.classList.add("antiBlur");
    });

    document.querySelectorAll(".color-block").forEach(e=>{
        e.classList.add("antiBlur","antiBanDice");

        if(!e.dataset.antiBanHoverBound){
            e.dataset.antiBanHoverBound="1";

            e.addEventListener("mouseenter",()=>{
                if(!antiBan) return;
                e.classList.remove("antiBlur");
                e.classList.add("antiBanRevealed");
            });

            e.addEventListener("mouseleave",()=>{
                if(!antiBan) return;
                e.classList.remove("antiBanRevealed");
                e.classList.add("antiBlur");
            });
        }
    });
}

function applyAntiBanToNode(node){
    if(!antiBan || !node || node.nodeType !== 1) return;

    const elements = [node, ...node.querySelectorAll(".color-block, select, .top-logo, #last20Rolls .last20-die, #last20Rolls .last20-dot")];

    elements.forEach(e=>{
        if(e.matches(".color-block")){
            e.classList.add("antiBlur","antiBanDice");

            if(!e.dataset.antiBanHoverBound){
                e.dataset.antiBanHoverBound="1";

                e.addEventListener("mouseenter",()=>{
                    if(!antiBan) return;
                    e.classList.remove("antiBlur");
                    e.classList.add("antiBanRevealed");
                });

                e.addEventListener("mouseleave",()=>{
                    if(!antiBan) return;
                    e.classList.remove("antiBanRevealed");
                    e.classList.add("antiBlur");
                });
            }
        }

        if(e.matches("select, .top-logo, #last20Rolls .last20-die, #last20Rolls .last20-dot"))
            e.classList.add("antiBlur");

        if(e.textContent && e.textContent.trim().toUpperCase()==="ROLL COLOR DICE")
            e.classList.add("antiBlur");
    });
}

new MutationObserver(mutations=>{
    if(!antiBan){
        createAntiBan();
        return;
    }

    // Only process newly inserted elements instead of scanning the whole page
    // after every dice/history DOM update.
    mutations.forEach(mutation=>{
        mutation.addedNodes.forEach(node=>{
            applyAntiBanToNode(node);
        });
    });
}).observe(document.body,{childList:true,subtree:true});

function initAntiBan(){
    createAntiBan();

    // Beim Neustart den gespeicherten Zustand sofort vollständig anwenden.
    // Dadurch können Schalter und Blur-Zustand nicht auseinanderlaufen.
    applyAntiBan();
}

document.addEventListener("DOMContentLoaded", initAntiBan);
window.addEventListener("load", initAntiBan);
