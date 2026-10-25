
window.provablyFair = {
  serverSeed: crypto.randomUUID().replace(/-/g,""),
  clientSeed: localStorage.getItem("clientSeed") || "Kenzy",
  nonce: 0,
  nextNonce(){
    this.nonce++;
    return this.nonce;
  }
};
async function sha256(text) {
    const data = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}


/* Verify Codes are generated exclusively by the Cloudflare Worker. */
function copyVerifyCode(){
 const el=document.getElementById("verifyCode");
 if(el) navigator.clipboard.writeText(el.value);
}

async function getProvablyFairRandom(max) {
    const input =
        window.provablyFair.serverSeed +
        ":" +
        window.provablyFair.clientSeed +
        ":" +
        window.provablyFair.nonce;

    const hash = await sha256(input);

    const number = parseInt(hash.substring(0, 13), 16);
window.provablyFair.lastHash = hash;

    document.getElementById("nonceValue").textContent = window.provablyFair.nonce;

if (document.getElementById("serverSeedHash")) {
    document.getElementById("serverSeedHash").textContent = await sha256(window.provablyFair.serverSeed);
}

    window.provablyFair.nonce++;

    return number % max;
}
(async () => {
    const hash = await sha256(window.provablyFair.serverSeed);

    document.getElementById("serverSeedHash").textContent = hash;
    document.getElementById("clientSeedInput").value = window.provablyFair.clientSeed;
    document.getElementById("nonceValue").textContent = window.provablyFair.nonce;

    document.getElementById("clientSeedInput").addEventListener("input", function () {
        window.provablyFair.clientSeed = this.value;
        localStorage.setItem("clientSeed", this.value);
    });
})();
localStorage.setItem("clientSeed", window.provablyFair.clientSeed);
console.log("Provably Fair scaffold loaded", window.provablyFair);
