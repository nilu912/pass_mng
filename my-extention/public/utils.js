export async function connectWallet(tabId) {
    console.log("Connecting wallet from utils.js");
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: async () => {
      if (!window.ethereum) {
        return { success: false, error: "MetaMask not found" };
      }
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts"
        });
        return { success: true, address: accounts[0] };
      } catch (err) {
        if (err.code === 4001) {
          return { success: false, error: "User rejected connection" };
        }
        return { success: false, error: err.message };
      }
    }
  });

  return results[0].result; // actual result from page
}
