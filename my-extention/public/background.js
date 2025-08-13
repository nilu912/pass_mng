chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CONNECT_WALLET") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: "WALLET_CONNECT", payload: message.payload },
          (responseFromContent) => {
            // Send response back to popup
            sendResponse({ reply: responseFromContent.reply });
          }
        );
      }
    });

    // Important: return true to indicate async response
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