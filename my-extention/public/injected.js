window.addEventListener("message", async (event) => {
  if (event.source !== window || event.data.type !== "CONNECT_METAMASK") return;

  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const walletAddress = accounts[0];

    window.postMessage({ type: "METAMASK_CONNECTED", wallet: walletAddress }, "*");
  } catch (err) {
    window.postMessage({ type: "METAMASK_ERROR", error: err.message }, "*");
  }
});