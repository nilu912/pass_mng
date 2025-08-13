(() => {
  console.log("Injected.js ready");

  window.addEventListener("message", async (event) => {
    if (event.source !== window) return;
    if (event.data.type !== "CONNECT_METAMASK") return;

    try {
      if (!window.ethereum) {
        window.postMessage(
          { type: "METAMASK_ERROR", error: "MetaMask not found" },
          "*"
        );
        return;
      }

      // Optional: ethers.js via CDN
      if (!window.ethers) {
        await new Promise((resolve) => {
          const s = document.createElement("script");
          s.src = "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js";
          s.onload = resolve;
          document.head.appendChild(s);
        });
      }

      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const address = await signer.getAddress();

      // Send only primitives back
      window.postMessage({ type: "METAMASK_CONNECTED", wallet: { address } }, "*");

    } catch (err) {
      window.postMessage(
        { type: "METAMASK_ERROR", error: err.message },
        "*"
      );
    }
  });
})();


// window.addEventListener("message", async (event) => {
//   if (event.source !== window || event.data.type !== "CONNECT_METAMASK") return;

//   try {
//     const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
//     const walletAddress = accounts[0];

//     window.postMessage({ type: "METAMASK_CONNECTED", wallet: walletAddress }, "*");
//   } catch (err) {
//     window.postMessage({ type: "METAMASK_ERROR", error: err.message }, "*");
//   }
// });
