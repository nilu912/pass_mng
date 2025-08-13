chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_SAUCE") {
    console.log("Background received GET_SAUCE");

    sendResponse({ sauce: "Spicy Mayo!" }); // ✅ Send response

    // Also send message to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { type: "PUT_SAUCE", data: "Spicy Mayo!" });
    });

    return true; // ✅ Keeps sendResponse alive
  }
});