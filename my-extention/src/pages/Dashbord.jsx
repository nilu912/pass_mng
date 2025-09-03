import React, { useEffect, useState } from "react";
import { useAuth } from "../context/authContext";

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const { logout } = useAuth();
  const usersCred = [
    { id: 1, url: "facebook.com", email: "user1@example.com", password: "password1" },
    { id: 2, url: "twitter.com", email: "user2@example.com", password: "password2" },
    { id: 3, url: "instagram.com", email: "user3@example.com", password: "password3" },
  ];
  useEffect(() => {
    chrome.storage.local.get("user", (data) => {
      setUser(data);
      console.log(data);
    });
  }, []);

  const [address, setAddress] = useState("Idle");
  const [signature, setSignature] = useState("Idel");
  const [status, setStatus] = useState("Idle");
  useEffect(() => {
    chrome.storage.local.get("walletAddress", (data) => {
      if (data.walletAddress) {
        setAddress(data.walletAddress); // restore into React state
      }
    });
    chrome.storage.local.get("signature", (data) => {
      if (data.signature) {
        setSignature(data.signature); // restore into React state
      }
    });
  }, []);
  const connect = async () => {
    // popup.js
    chrome.runtime.sendMessage(
      { type: "CONNECT_WALLET", payload: "connect metamask wallet!" },
      (response) => {
        console.log("Popup received response:", response.reply);
        setAddress(response.reply);
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
  const SignTrans = () => {
    chrome.runtime.sendMessage({ type: "SIGN_TRANS" }, (response) => {
      console.log("Get response for sign transation", response.reply);
      setSignature(response.reply);
      chrome.storage.local.set({ signature: response.reply }, () => {
        console.log("signature saved to storage");
      });
    });
  };
  const clearData = () => {
    chrome.storage.local.remove("walletAddress", () => {
      console.log("removed");
      setStatus("Idle");
    });
    chrome.storage.local.remove("signature", () => {
      console.log("removed");
      setSignature("Idle");
    });
  };

  return (
    <div>
      <h1>Dashboard</h1>
      {/* {user && <p>Welcome, {user.user.email}!</p>} */}
      <button
        onClick={() => logout()}
        className="bg-red-500 text-white py-2 px-4 rounded mt-4"
      >
        Logout
      </button>
      <div>
        <h3 className="text-lg font-semibold mb-2">MetaMask Bridge</h3>
        <button
          onClick={connect}
          className="bg-blue-500 text-white py-2 px-4 rounded"
        >
          Connect Wallet
        </button>
        <button
          onClick={SignTrans}
          className="bg-blue-500 text-white py-2 px-4 rounded"
        >
          SignTrans
        </button>
        <button
          onClick={clearData}
          className="bg-blue-500 text-white py-2 px-4 rounded"
        >
          clear storage
        </button>

        <div className="mt-2 text-sm">
          <div>Wallet: {address}</div>
          <div>Signature: {signature}</div>
        </div>
      </div>
      {usersCred.map((data) => (
        <div key={data.id}>
          <p>URL: {data.url}</p>
          <p>Email: {data.email}</p>
          <p>Password: {data.password}</p>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;
