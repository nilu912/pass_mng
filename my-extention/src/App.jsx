import { useEffect, useState } from "react";

export default function App() {
  const [status, setStatus] = useState("Idle");
  useEffect(() => {
    chrome.storage.local.get("walletAddress", (data) => {
      if (data.walletAddress) {
        setStatus(data.walletAddress); // restore into React state
      }
    });
  }, []);
  const connect = async () => {
    // popup.js
    chrome.runtime.sendMessage(
      { type: "CONNECT_WALLET", payload: "connect metamask wallet!" },
      (response) => {
        console.log("Popup received response:", response.reply.address);
        setStatus(response.reply);
        chrome.storage.local.set({ walletAddress: response.reply }, () => {
          console.log("Wallet saved to storage");
        });
      }
    );

    // chrome.runtime.sendMessage(
    //   { type: "SEND_TO_CONTENT", payload: "Hello from popup!" },
    //   (response) => {
    //     console.log("Popup received response:", response.reply);
    //   }
    // );
  };
  const clearData = () => {
    chrome.storage.local.remove("walletAddress", () => {
      console.log("removed");
      setStatus("Idle");
    });
  };

  return (
    <div
      style={{ padding: 12, width: 320, fontFamily: "system-ui, sans-serif" }}
    >
      <h3 style={{ margin: 0, marginBottom: 8 }}>MetaMask Bridge</h3>
      <button
        onClick={connect}
        style={{ padding: "8px 12px", borderRadius: 8 }}
      >
        Connect Wallet
      </button>
      <button onClick={clearData}>clear storage</button>

      <div style={{ marginTop: 10, fontSize: 14 }}>
        <div>Status: {status}</div>
      </div>
    </div>
  );
}
