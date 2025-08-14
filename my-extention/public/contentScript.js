// Injects injected.js into the page context
function injectMetaMaskConnector() {
  if (document.getElementById("my-injected-metamask-script")) return; // Prevent multiple injections

  const script = document.createElement("script");
  script.id = "my-injected-metamask-script";
  script.src = chrome.runtime.getURL("injected.js");
  script.onload = () => {
    console.log("Injected.js loaded into page");
    script.remove(); // Clean up tag, code stays in page context
  };
  (document.head || document.documentElement).appendChild(script);
}

// Always inject once on content script load
injectMetaMaskConnector();

// Listen for messages from popup → background → content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "WALLET_CONNECT") {
    console.log("Content script: received WALLET_CONNECT");

    // Set up listener for injected.js responses
    const handler = (event) => {
      if (event.source !== window || !event.data) return;

      if (event.data.type === "METAMASK_CONNECTED") {
        console.log("MetaMask connected:", event.data.wallet);
        sendResponse({ reply: event.data.wallet.address });
        window.removeEventListener("message", handler);
      }

      if (event.data.type === "METAMASK_ERROR") {
        console.error("MetaMask error:", event.data.error);
        sendResponse({ reply: "Error: " + event.data.error });
        window.removeEventListener("message", handler);
      }
    };

    window.addEventListener("message", handler);

    // Delay postMessage slightly to ensure injected.js is ready
    setTimeout(() => {
      console.log("Sending CONNECT_METAMASK to injected.js");
      window.postMessage({ type: "CONNECT_METAMASK" }, "*");
    }, 100);

    return true; // Keep message channel open for async sendResponse
  } else if (message.type === "TRANS_SIGN") {
    console.log("get request from TRANS_SIGN");
    const handler = (event) => {
      if (event.source !== window || !event.data) return;

      if (event.data.type === "METAMASK_SIGN_TRANS") {
        console.log("MetaMask signtransaction:", event.data.Signature);
        sendResponse({ reply: event.data.Signature.signature });
        window.removeEventListener("message", handler);
      }

      if (event.data.type === "METAMASK_ERROR") {
        console.error("MetaMask error:", event.data.error);
        sendResponse({ reply: "Error: " + event.data.error });
        window.removeEventListener("message", handler);
      }
    };
    window.addEventListener("message", handler);
    setTimeout(() => {
      console.log("Sending TRANS_SIGN to injected.js");
      window.postMessage({ type: "SIGN_MESSAGE" }, "*");
    }, 100);
    return true;
  }
});
// function injectMetaMaskConnector() {
//   const script = document.createElement("script");
//   script.src = chrome.runtime.getURL("injected.js");
//   script.onload = () => script.remove(); // Clean up after injection
//   (document.head || document.documentElement).appendChild(script);
// }

// injectMetaMaskConnector();

// // Wait a moment before posting the message to ensure injected.js is loaded
// // setTimeout(() => {
// //   window.postMessage({ type: "CONNECT_METAMASK" }, "*");
// // }, 100); // 100ms delay is usually enough

// chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
//   // if (message.type === "WALLET_CONNECT") {
//   //   window.postMessage({ type: "CONNECT_METAMASK" }, "*");
//   // }
//   if (message.type === "WALLET_CONNECT") {
//     // Inject the connector if not already injected
//     injectMetaMaskConnector();

//     await window.postMessage({ type: "CONNECT_METAMASK" }, "*");

//     // Wait a moment before posting the message to injected.js
//     // setTimeout(() => {
//     //   window.postMessage({ type: "CONNECT_METAMASK" }, "*");
//     // }, 100);

//     // Listen for response from injected.js
//     const handler = (event) => {
//       if (event.source !== window || !event.data) return;

//       if (event.data.type === "METAMASK_CONNECTED") {
//         const wallet = event.data.wallet;
//         console.log("Wallet connected:", wallet);

//         sendResponse({ reply: wallet });
//         window.removeEventListener("message", handler); // Clean up
//       }

//       if (event.data.type === "METAMASK_ERROR") {
//         console.error("MetaMask error:", event.data.error);
//         sendResponse({ reply: "Error: " + event.data.error });
//         window.removeEventListener("message", handler); // Clean up
//       }
//     };

//     window.addEventListener("message", handler);

//     return true; // Keep message channel open for async response
//   }
// });



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
