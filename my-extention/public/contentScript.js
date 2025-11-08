// Injects injected.js into the page context
// Add this to your existing contentScript.js

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle autofill message
  if (message.type === "AUTOFILL") {
    console.log("Auto-filling credentials:", message);
    
    const result = autoFillCredentials(message.username, message.password);
    sendResponse({ success: result.success, message: result.message });
    return true;
  }

  // ... your other existing listeners (WALLET_CONNECT, TRANS_SIGN, etc.)
});

/**
 * Auto-fills credentials into login forms
 */
function autoFillCredentials(username, password) {
  try {
    // Find username/email field
    const usernameField = findUsernameField();
    if (usernameField) {
      fillInputField(usernameField, username);
      console.log("✅ Username filled");
    } else {
      console.warn("⚠️ Username field not found");
    }
    
    // Find password field
    const passwordField = findPasswordField();
    if (passwordField) {
      fillInputField(passwordField, password);
      console.log("✅ Password filled");
    } else {
      console.warn("⚠️ Password field not found");
    }
    
    if (usernameField || passwordField) {
      return { success: true, message: "Credentials filled successfully" };
    } else {
      return { success: false, message: "No login fields found on this page" };
    }
    
  } catch (error) {
    console.error("❌ Auto-fill error:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Find username/email input field
 */
function findUsernameField() {
  // Try multiple selectors for username/email fields
  const selectors = [
    'input[type="email"]',
    'input[type="text"][name*="email" i]',
    'input[type="text"][name*="user" i]',
    'input[type="text"][id*="email" i]',
    'input[type="text"][id*="user" i]',
    'input[placeholder*="email" i]',
    'input[placeholder*="username" i]',
    'input[autocomplete="username"]',
    'input[autocomplete="email"]',
    'input[name="username"]',
    'input[name="email"]',
    'input[id="username"]',
    'input[id="email"]',
  ];
  
  for (const selector of selectors) {
    const field = document.querySelector(selector);
    if (field && isVisible(field)) {
      return field;
    }
  }
  
  // Fallback: find first visible text input (not password)
  const textInputs = document.querySelectorAll('input[type="text"]');
  for (const input of textInputs) {
    if (isVisible(input)) {
      return input;
    }
  }
  
  return null;
}

/**
 * Find password input field
 */
function findPasswordField() {
  const passwordFields = document.querySelectorAll('input[type="password"]');
  
  // Return first visible password field
  for (const field of passwordFields) {
    if (isVisible(field)) {
      return field;
    }
  }
  
  return null;
}

/**
 * Fill an input field with a value
 */
function fillInputField(field, value) {
  // Set the value
  field.value = value;
  
  // Trigger various events to ensure the form recognizes the change
  const events = [
    new Event('input', { bubbles: true }),
    new Event('change', { bubbles: true }),
    new Event('blur', { bubbles: true }),
    new KeyboardEvent('keydown', { bubbles: true }),
    new KeyboardEvent('keyup', { bubbles: true })
  ];
  
  events.forEach(event => field.dispatchEvent(event));
  
  // For React forms, update the internal state
  try {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    ).set;
    
    nativeInputValueSetter.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  } catch (e) {
    console.log("React setter not needed or failed:", e);
  }
}

/**
 * Check if an element is visible
 */
function isVisible(element) {
  return !!(
    element.offsetWidth ||
    element.offsetHeight ||
    element.getClientRects().length
  ) && window.getComputedStyle(element).visibility !== 'hidden';
}



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
