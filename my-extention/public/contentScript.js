function injectMetaMaskConnector() {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("injected.js");
  script.onload = () => script.remove(); // Clean up after injection
  (document.head || document.documentElement).appendChild(script);
}

injectMetaMaskConnector();

// Wait a moment before posting the message to ensure injected.js is loaded
setTimeout(() => {
  window.postMessage({ type: "CONNECT_METAMASK" }, "*");
}, 100); // 100ms delay is usually enough


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "WALLET_CONNECT") {
    // Inject the connector if not already injected
    injectMetaMaskConnector();

    // Wait a moment before posting the message to injected.js
    setTimeout(() => {
      window.postMessage({ type: "CONNECT_METAMASK" }, "*");
    }, 100);

    // Listen for response from injected.js
    const handler = (event) => {
      if (event.source !== window || !event.data) return;

      if (event.data.type === "METAMASK_CONNECTED") {
        const wallet = event.data.wallet;
        console.log("Wallet connected:", wallet);

        sendResponse({ reply: wallet });
        window.removeEventListener("message", handler); // Clean up
      }

      if (event.data.type === "METAMASK_ERROR") {
        console.error("MetaMask error:", event.data.error);
        sendResponse({ reply: "Error: " + event.data.error });
        window.removeEventListener("message", handler); // Clean up
      }
    };

    window.addEventListener("message", handler);

    return true; // Keep message channel open for async response
  }
});
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.type === "WALLET_CONNECT") {
//     console.log("Content script received:", message.payload);
//     if (typeof window.ethereum !== "undefined") {
//       window.ethereum
//         .request({ method: "eth_requestAccounts" })
//         .then((accounts) => {
//           const walletAddress = accounts[0];
//           console.log("Connected wallet:", walletAddress);

//           // Respond with wallet address
//           sendResponse({ reply: walletAddress });
//         })
//         .catch((error) => {
//           console.error("MetaMask connection error:", error);
//           sendResponse({ reply: "Error connecting to MetaMask" });
//         });

//       return true; // Keep the message channel open for async response
//     } else {
//       console.warn("MetaMask not detected");
//       sendResponse({ reply: "MetaMask not found" });
//     }
//   }
// });

// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.type === "PROCESS_DATA") {
//     console.log("Content script received:", message.payload);

//     // Log to page console (not just extension console)
//     window.console.log("Page log:", message.payload);

//     // Respond back to background
//     sendResponse({ reply: "Content script processed it!" });
//   }
// });
