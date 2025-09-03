chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CONNECT_WALLET") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: "WALLET_CONNECT", payload: message.payload },
          (responseFromContent) => {
            // Send response back to popup
            if (chrome.runtime.lastError) {
              console.warn(
                "Error sending message:",
                chrome.runtime.lastError.message
              );
              sendResponse({ reply: "No content script available" });
              return;
            }
            if (!responseFromContent) {
              sendResponse({ reply: "No response from content script" });
              return;
            }
            sendResponse({ reply: responseFromContent.reply });
          }
        );
      }
    });

    // Important: return true to indicate async response
    return true;
  }
  if (message.type === "SIGN_TRANS") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: "TRANS_SIGN" },
          (responseFromContent) => {
            sendResponse({ reply: responseFromContent.reply });
          }
        );
      }
    });
    return true;
  }
});

// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.type === "SEND_TO_CONTENT") {
//     chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//       if (tabs[0]?.id) {
//         chrome.tabs.sendMessage(
//           tabs[0].id,
//           { type: "PROCESS_DATA", payload: message.payload },
//           (responseFromContent) => {
//             // Send response back to popup
//             sendResponse({ reply: responseFromContent.reply });
//           }
//         );
//       }
//     });

//     // Important: return true to indicate async response
//     return true;
//   }
// });
