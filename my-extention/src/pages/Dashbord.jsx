import React, { useEffect, useState } from "react";
import { useAuth } from "../context/authContext";
import { abi } from "../contract/PassMang.json";

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const { logout, connectWallet, address } = useAuth();
  const usersCred = [
    {
      id: 1,
      url: "facebook.com",
      email: "user1@example.com",
      password: "password1",
    },
    {
      id: 2,
      url: "twitter.com",
      email: "user2@example.com",
      password: "password2",
    },
    {
      id: 3,
      url: "instagram.com",
      email: "user3@example.com",
      password: "password3",
    },
  ];

  useEffect(() => {
    chrome.storage.local.get("user", (data) => {
      setUser(data);
      console.log(data);
    });
  }, []);

  const [signature, setSignature] = useState("Idle");
  const [contractStatus, setContractStatus] = useState("Not connected");
  const [status, setStatus] = useState("Idle");

  useEffect(() => {
    chrome.storage.local.get("signature", (data) => {
      if (data.signature) {
        setSignature(data.signature);
      }
    });

    chrome.storage.local.get("contractStatus", (data) => {
      if (data.contractStatus) {
        setContractStatus(data.contractStatus);
      }
    });
    console.log("Contract status restored:");
  }, []);

  const SignTrans = () => {
    chrome.runtime.sendMessage({ type: "SIGN_TRANS" }, (response) => {
      console.log("Get response for sign transaction", response);

      if (chrome.runtime.lastError) {
        console.error("Runtime error:", chrome.runtime.lastError.message);
        return;
      }

      if (!response) {
        console.error("No response received");
        return;
      }

      if (!response.reply) {
        console.error("Invalid response format:", response);
        return;
      }

      console.log("Signature response:", response.reply);
      setSignature(response.reply);
      chrome.storage.local.set({ signature: response.reply }, () => {
        console.log("Signature saved to storage");
      });
    });
  };

  const connectContract = () => {
    chrome.runtime.sendMessage({ type: "CONNECT_MY_CONTRACT" }, (response) => {
      console.log("Get response for sign transaction", response);

      if (chrome.runtime.lastError) {
        console.error("Runtime error:", chrome.runtime.lastError.message);
        return;
      }

      if (!response) {
        console.error("No response received");
        return;
      }

      if (!response.reply) {
        console.error("Invalid response format:", response);
        return;
      }

      console.log("Signature response:", response.reply);

      setContractStatus("Connecting...");
      console.log("Starting contract connection...");

      setContractStatus(response.reply);

      chrome.storage.local.set({ contractStatus: response.reply }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error saving to storage:", chrome.runtime.lastError);
        } else {
          console.log("Contract status saved to storage");
        }
      });
    });
  };

  const clearData = () => {
    chrome.storage.local.remove("walletAddress", () => {
      console.log("Wallet address removed");
      setStatus("Idle");
    });
    chrome.storage.local.remove("signature", () => {
      console.log("Signature removed");
      setSignature("Idle");
    });
    chrome.storage.local.remove("contractStatus", () => {
      console.log("Contract status removed");
      setContractStatus("Not connected");
    });
  };

  const callFunction = () => {

    chrome.runtime.sendMessage(
      { type: "CALL_CONTRACT_FUNCTION", payload: { contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS, abi: abi } },
      (response) => {
        console.log("Get response for call function", response);
      });
  }
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      <button
        onClick={() => logout()}
        className="bg-red-500 text-white py-2 px-4 rounded mt-4 mb-4"
      >
        Logout
      </button>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">MetaMask Bridge</h3>

        <div className="space-x-2 mb-4">
          <button
            onClick={connectWallet}
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            Connect Wallet
          </button>

          <button
            onClick={SignTrans}
            className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
          >
            Sign Transaction
          </button>

          <button
            onClick={connectContract}
            className="bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600"
          >
            Connect Contract
          </button>

          <button
            onClick={clearData}
            className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
          >
            Clear Storage
          </button>

          <button
            onClick={callFunction}
            className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
          >
            Call Function
          </button>
        </div>

        <div className="mt-4 p-4 bg-gray-100 rounded">
          <div className="text-sm space-y-2">
            <div>
              <strong>User Wallet:</strong> {address}
            </div>
            <div>
              <strong>Signature:</strong> {signature}
            </div>
            <div>
              <strong>Contract Status:</strong> {contractStatus}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">User Credentials</h3>
        <div className="space-y-2">
          {usersCred.map((data) => (
            <div key={data.id} className="p-2 border rounded">
              <p>
                <strong>URL:</strong> {data.url}
              </p>
              <p>
                <strong>Email:</strong> {data.email}
              </p>
              <p>
                <strong>Password:</strong> {data.password}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

// import React, { useEffect, useState } from "react";
// import { useAuth } from "../context/authContext";

// const Dashboard = () => {
//   const [user, setUser] = useState(null);
//   const { logout, connectWallet, address } = useAuth();
//   const usersCred = [
//     { id: 1, url: "facebook.com", email: "user1@example.com", password: "password1" },
//     { id: 2, url: "twitter.com", email: "user2@example.com", password: "password2" },
//     { id: 3, url: "instagram.com", email: "user3@example.com", password: "password3" },
//   ];
//   useEffect(() => {
//     chrome.storage.local.get("user", (data) => {
//       setUser(data);
//       console.log(data);
//     });
//   }, []);

//   // const [address, setAddress] = useState("Idle");
//   const [signature, setSignature] = useState("Idel");
//   const [status, setStatus] = useState("Idle");
//   useEffect(() => {
//     // chrome.storage.local.get("walletAddress", (data) => {
//     //   if (data.walletAddress) {
//     //     setAddress(data.walletAddress); // restore into React state
//     //   }
//     // });
//     chrome.storage.local.get("signature", (data) => {
//       if (data.signature) {
//         setSignature(data.signature); // restore into React state
//       }
//     });
//   }, []);

//   // const connect = async () => {
//   //   // popup.js
//   //   chrome.runtime.sendMessage(
//   //     { type: "CONNECT_WALLET", payload: "connect metamask wallet!" },
//   //     (response) => {
//   //       console.log("Popup received response:", response.reply);
//   //       setAddress(response.reply);
//   //       chrome.storage.local.set({ walletAddress: response.reply }, () => {
//   //         console.log("Wallet saved to storage");
//   //       });
//   //     }
//   //   );

//   //   chrome.runtime.sendMessage(
//   //     { type: "SEND_TO_CONTENT", payload: "Hello from popup!" },
//   //     (response) => {
//   //       console.log("Popup received response:", response.reply);
//   //     }
//   //   );
//   // };
//   const SignTrans = () => {
//     // chrome.runtime.sendMessage({ type: "SIGN_TRANS" }, (response) => {
//     //   console.log("Get response for sign transation", response.reply);
//     //   setSignature(response.reply);
//     //   chrome.storage.local.set({ signature: response.reply }, () => {
//     //     console.log("signature saved to storage");
//     //   });
//     // });
//     chrome.runtime.sendMessage({ type: "CONNECT_CONTRACT" }, (response) => {
//       console.log("Get response for connect contract", response);
//       // setSignature(response.reply);
//       // chrome.storage.local.set({ signature: response.reply }, () => {
//       //   console.log("signature saved to storage");
//       // });
//     });
//   };
//   const clearData = () => {
//     chrome.storage.local.remove("walletAddress", () => {
//       console.log("removed");
//       setStatus("Idle");
//     });
//     chrome.storage.local.remove("signature", () => {
//       console.log("removed");
//       setSignature("Idle");
//     });
//   };

//   return (
//     <div>
//       <h1>Dashboard</h1>
//       {/* {user && <p>Welcome, {user.user.email}!</p>} */}
//       <button
//         onClick={() => logout()}
//         className="bg-red-500 text-white py-2 px-4 rounded mt-4"
//       >
//         Logout
//       </button>
//       <div>
//         <h3 className="text-lg font-semibold mb-2">MetaMask Bridge</h3>
//         <button
//           onClick={connectWallet}
//           className="bg-blue-500 text-white py-2 px-4 rounded"
//         >
//           Connect Wallet
//         </button>
//         <button
//           onClick={SignTrans}
//           className="bg-blue-500 text-white py-2 px-4 rounded"
//         >
//           SignTrans
//         </button>
//         <button
//           onClick={clearData}
//           className="bg-blue-500 text-white py-2 px-4 rounded"
//         >
//           clear storage
//         </button>

//         <div className="mt-2 text-sm">
//           <div>User Wallet: {address}</div>
//           <div>Signature: {signature}</div>
//         </div>
//       </div>
//       {usersCred.map((data) => (
//         <div key={data.id}>
//           <p>URL: {data.url}</p>
//           <p>Email: {data.email}</p>
//           <p>Password: {data.password}</p>
//         </div>
//       ))}
//     </div>
//   );
// };

// export default Dashboard;
