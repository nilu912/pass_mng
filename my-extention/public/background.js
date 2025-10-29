// A simple background script for a MetaMask connection
console.log("Background script loaded");

// Listener for messages from the popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CONNECT_WALLET") {
    connectWallet(sendResponse);
    return true; // Indicates that the response will be sent asynchronously
  }

  if (message.type === "SIGN_TRANS") {
    signTransaction(sendResponse);
    return true;
  }

  if (message.type === "CONNECT_MY_CONTRACT") {
    connectSmartContract(sendResponse);
    return true;
  }

  if (message.type === "CALL_CONTRACT_FUNCTION") {
      const { contractAddress, abi } = message.payload;
      console.log("Received CALL_CONTRACT_FUNCTION message", contractAddress, abi);
    handleConnect(message)
      .then((result) => {
        sendResponse({ success: true, account: result });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true; // IMPORTANT for async
  }

  //   if (message.type === "CREATE_USER") {
  //     const { contractAddress, abi } = message.payload;
  //     console.log("Received CALL_CONTRACT_FUNCTION message", contractAddress, abi);
  //   handleConnect(message)
  //     .then((result) => {
  //       sendResponse({ success: true, account: result });
  //     })
  //     .catch((err) => {
  //       sendResponse({ success: false, error: err.message });
  //     });
  //   return true; // IMPORTANT for async
  // }
});


/**
 * Connects to the user's MetaMask wallet.
 * This function uses chrome.scripting.executeScript to run code in the active tab.
 * It requests accounts from MetaMask and sends the result back to the caller.
 */
async function connectWallet(sendResponse) {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: () => {
        return new Promise(async (resolve) => {
          try {
            if (!window.ethereum) {
              resolve({ success: false, error: "MetaMask not found" });
              return;
            }

            const accounts = await window.ethereum.request({
              method: "eth_requestAccounts",
            });

            resolve({ success: true, address: accounts[0] });
          } catch (error) {
            if (error.code === 4001) {
              resolve({ success: false, error: "User rejected connection" });
            } else {
              resolve({ success: false, error: error.message });
            }
          }
        });
      },
    });

    const result = results[0].result;
    sendResponse({
      reply: result.success ? result.address : result.error,
    });
  } catch (error) {
    sendResponse({ reply: "Error: " + error.message });
  }
}

/**
 * Signs a message using the user's connected wallet.
 * This function also runs in the MAIN world to access the MetaMask provider.
 */
async function signTransaction(sendResponse) {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: () => {
        return new Promise(async (resolve) => {
          try {
            if (!window.ethereum) {
              resolve({ success: false, error: "MetaMask not found" });
              return;
            }

            const accounts = await window.ethereum.request({
              method: "eth_accounts",
            });

            if (accounts.length === 0) {
              resolve({ success: false, error: "No accounts connected" });
              return;
            }

            const message = `Login - Nonce: ${Date.now()}`;
            const signature = await window.ethereum.request({
              method: "personal_sign",
              params: [message, accounts[0]],
            });

            resolve({ success: true, signature });
          } catch (error) {
            if (error.code === 4001) {
              resolve({ success: false, error: "User rejected signing" });
            } else {
              resolve({ success: false, error: error.message });
            }
          }
        });
      },
    });

    const result = results[0].result;
    sendResponse({
      reply: result.success ? result.signature : result.error,
    });
  } catch (error) {
    sendResponse({ reply: "Error: " + error.message });
  }
}

/**
 * Connects to the smart contract using ethers.js.
 * It first injects the ethers.min.js file, then executes the function.
 */
async function connectSmartContract(sendResponse) {
  console.log("Creating contract instance...");
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab || !tab.id) {
      sendResponse({ reply: "No active tab found" });
      return;
    }

    console.log("Setting up contract instance...");

    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const contractABI = [
      {
        anonymous: false,
        inputs: [
          {
            indexed: false,
            internalType: "address",
            name: "user",
            type: "address",
          },
          {
            indexed: false,
            internalType: "bytes32",
            name: "uniqueHash",
            type: "bytes32",
          },
          {
            indexed: false,
            internalType: "string",
            name: "webUrl",
            type: "string",
          },
          {
            indexed: false,
            internalType: "bytes",
            name: "userName",
            type: "bytes",
          },
          {
            indexed: false,
            internalType: "bytes",
            name: "password",
            type: "bytes",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "timestamp",
            type: "uint256",
          },
        ],
        name: "passwordAddedEvent",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: false,
            internalType: "address",
            name: "user",
            type: "address",
          },
          {
            indexed: false,
            internalType: "bytes32",
            name: "hashedPass",
            type: "bytes32",
          },
          {
            indexed: false,
            internalType: "bytes32",
            name: "salt",
            type: "bytes32",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "timestamp",
            type: "uint256",
          },
        ],
        name: "userRegisteredEvent",
        type: "event",
      },
      {
        inputs: [
          {
            internalType: "string",
            name: "_webUrl",
            type: "string",
          },
          {
            internalType: "bytes",
            name: "_userName",
            type: "bytes",
          },
          {
            internalType: "bytes",
            name: "_password",
            type: "bytes",
          },
        ],
        name: "addPasswordEntry",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "uint256",
            name: "_id",
            type: "uint256",
          },
        ],
        name: "getPasswordEntry",
        outputs: [
          {
            components: [
              {
                internalType: "uint256",
                name: "id",
                type: "uint256",
              },
              {
                internalType: "bytes32",
                name: "uniqueHash",
                type: "bytes32",
              },
              {
                internalType: "string",
                name: "webUrl",
                type: "string",
              },
              {
                internalType: "bytes",
                name: "userName",
                type: "bytes",
              },
              {
                internalType: "bytes",
                name: "password",
                type: "bytes",
              },
              {
                internalType: "uint256",
                name: "timestamp",
                type: "uint256",
              },
              {
                internalType: "bool",
                name: "isActive",
                type: "bool",
              },
            ],
            internalType: "struct PassMang.PasswordEntry",
            name: "",
            type: "tuple",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "getUsersAllEntries",
        outputs: [
          {
            components: [
              {
                internalType: "uint256",
                name: "id",
                type: "uint256",
              },
              {
                internalType: "bytes32",
                name: "uniqueHash",
                type: "bytes32",
              },
              {
                internalType: "string",
                name: "webUrl",
                type: "string",
              },
              {
                internalType: "bytes",
                name: "userName",
                type: "bytes",
              },
              {
                internalType: "bytes",
                name: "password",
                type: "bytes",
              },
              {
                internalType: "uint256",
                name: "timestamp",
                type: "uint256",
              },
              {
                internalType: "bool",
                name: "isActive",
                type: "bool",
              },
            ],
            internalType: "struct PassMang.PasswordEntry[]",
            name: "",
            type: "tuple[]",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "isUserRegister",
        outputs: [
          {
            internalType: "bool",
            name: "",
            type: "bool",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "address",
            name: "",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "",
            type: "uint256",
          },
        ],
        name: "passwordEntries",
        outputs: [
          {
            internalType: "uint256",
            name: "id",
            type: "uint256",
          },
          {
            internalType: "bytes32",
            name: "uniqueHash",
            type: "bytes32",
          },
          {
            internalType: "string",
            name: "webUrl",
            type: "string",
          },
          {
            internalType: "bytes",
            name: "userName",
            type: "bytes",
          },
          {
            internalType: "bytes",
            name: "password",
            type: "bytes",
          },
          {
            internalType: "uint256",
            name: "timestamp",
            type: "uint256",
          },
          {
            internalType: "bool",
            name: "isActive",
            type: "bool",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "string",
            name: "_masterPassword",
            type: "string",
          },
        ],
        name: "registerUser",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "address",
            name: "",
            type: "address",
          },
        ],
        name: "registeredUser",
        outputs: [
          {
            internalType: "bool",
            name: "",
            type: "bool",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "bytes32",
            name: "",
            type: "bytes32",
          },
        ],
        name: "uniqueHashExists",
        outputs: [
          {
            internalType: "bool",
            name: "",
            type: "bool",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "address",
            name: "",
            type: "address",
          },
        ],
        name: "users",
        outputs: [
          {
            internalType: "bytes32",
            name: "masterPasswordHash",
            type: "bytes32",
          },
          {
            internalType: "bytes32",
            name: "salt",
            type: "bytes32",
          },
          {
            internalType: "uint256",
            name: "timestamp",
            type: "uint256",
          },
          {
            internalType: "bool",
            name: "isActive",
            type: "bool",
          },
          {
            internalType: "uint256",
            name: "totalEntries",
            type: "uint256",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
    ];
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      files: ["ethers.min.js"],
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Inject the ethers.js library and then execute the function
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: (address, abi) => {
        return new Promise(async (resolve) => {
          try {
            if (!window.ethereum || !window.ethers) {
              resolve({
                success: false,
                error: "MetaMask or ethers.js not found",
              });
              return;
            }

            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.send("eth_requestAccounts", []);
            const signer = await provider.getSigner();
            const contractInstance = new ethers.Contract(address, abi, signer);

            resolve({ success: true, account: accounts[0] });
          } catch (error) {
            resolve({ success: false, error: error.message });
          }
        });
      },
      args: [contractAddress, contractABI],
    });

    if (!results || !results[0] || results[0].result === undefined) {
      sendResponse({ reply: "Failed to create contract instance" });
      return;
    }

    const result = results[0].result;
    sendResponse({
      reply: result.success ? result.account : result.error,
    });
  } catch (error) {
    console.error("Create contract instance error:", error);
    sendResponse({ reply: "Error: " + error.message });
  }
}
