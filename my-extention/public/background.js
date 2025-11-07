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
    const { contractAddress, abi, functionName, args } = message.payload;
    console.log(
      "Received CALL_CONTRACT_FUNCTION message",
      contractAddress,
      functionName,
      args
    );
    callContractFunction(contractAddress, abi, functionName, args, sendResponse);
    return true; // IMPORTANT for async
  }

  if (message.type === "CREATE_USER") {
    const { contractAddress, abi, masterPassword } = message.payload;
    console.log("Received CREATE_USER message", contractAddress, abi);
    createUser(contractAddress, abi, masterPassword, sendResponse);
    return true; // IMPORTANT for async
  }
});

/**
 * Ensures ethers.js is loaded in the page context
 */
async function ensureEthersLoaded(tabId) {
  try {
    // Check if ethers is already loaded
    const checkResults = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: "MAIN",
      func: () => {
        return typeof window.ethers !== 'undefined';
      }
    });
    
    // If ethers is already loaded, return
    if (checkResults && checkResults[0] && checkResults[0].result) {
      console.log("Ethers.js already loaded");
      return true;
    }
    
    // Otherwise, inject it
    console.log("Injecting ethers.js...");
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: "MAIN",
      files: ["ethers.min.js"],
    });
    
    // Wait for it to load
    await new Promise((resolve) => setTimeout(resolve, 500));
    return true;
  } catch (error) {
    console.error("Error ensuring ethers loaded:", error);
    return false;
  }
}

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
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "uniqueHash",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "webUrl",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "userName",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "password",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "passwordAddedEvent",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "hashedPass",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "salt",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "userRegisteredEvent",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_webUrl",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "_userName",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "_password",
          "type": "string"
        }
      ],
      "name": "addPasswordEntry",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_id",
          "type": "uint256"
        }
      ],
      "name": "getPasswordEntry",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "id",
              "type": "uint256"
            },
            {
              "internalType": "bytes32",
              "name": "uniqueHash",
              "type": "bytes32"
            },
            {
              "internalType": "string",
              "name": "webUrl",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "userName",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "password",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "timestamp",
              "type": "uint256"
            },
            {
              "internalType": "bool",
              "name": "isActive",
              "type": "bool"
            }
          ],
          "internalType": "struct PassMang.PasswordEntry",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getUserInfo",
      "outputs": [
        {
          "components": [
            {
              "internalType": "bytes32",
              "name": "masterPasswordHash",
              "type": "bytes32"
            },
            {
              "internalType": "bytes32",
              "name": "salt",
              "type": "bytes32"
            },
            {
              "internalType": "uint256",
              "name": "timestamp",
              "type": "uint256"
            },
            {
              "internalType": "bool",
              "name": "isActive",
              "type": "bool"
            },
            {
              "internalType": "uint256",
              "name": "totalEntries",
              "type": "uint256"
            }
          ],
          "internalType": "struct PassMang.User",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getUsersAllEntries",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "id",
              "type": "uint256"
            },
            {
              "internalType": "bytes32",
              "name": "uniqueHash",
              "type": "bytes32"
            },
            {
              "internalType": "string",
              "name": "webUrl",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "userName",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "password",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "timestamp",
              "type": "uint256"
            },
            {
              "internalType": "bool",
              "name": "isActive",
              "type": "bool"
            }
          ],
          "internalType": "struct PassMang.PasswordEntry[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "isUserRegister",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "passwordEntries",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "uniqueHash",
          "type": "bytes32"
        },
        {
          "internalType": "string",
          "name": "webUrl",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "userName",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "password",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "isActive",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_masterPassword",
          "type": "string"
        }
      ],
      "name": "registerUser",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "registeredUser",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "uniqueHashExists",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "users",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "masterPasswordHash",
          "type": "bytes32"
        },
        {
          "internalType": "bytes32",
          "name": "salt",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "isActive",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "totalEntries",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];

    // Inject ethers.js library
    const ethersLoaded = await ensureEthersLoaded(tab.id);
    if (!ethersLoaded) {
      sendResponse({ reply: "Failed to load ethers.js" });
      return;
    }

    // Store contract instance in window object for reuse
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
            
            // Store in window for reuse
            window.CONTRACT_INSTANCE = contractInstance;
            window.CONTRACT_ADDRESS = address;
            window.CONTRACT_ABI = abi;
            
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

/**
 * Call a contract function (read or write)
 */
async function callContractFunction(contractAddress, abi, functionName, args, sendResponse) {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab || !tab.id) {
      sendResponse({ success: false, error: "No active tab found" });
      return;
    }

    // Check if ethers.js is already loaded, if not inject it
    const ethersLoaded = await ensureEthersLoaded(tab.id);
    if (!ethersLoaded) {
      sendResponse({ success: false, error: "Failed to load ethers.js" });
      return;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: (address, abi, funcName, funcArgs) => {
        return new Promise(async (resolve) => {
          try {
            if (!window.ethereum || !window.ethers) {
              resolve({
                success: false,
                error: "MetaMask or ethers.js not found",
              });
              return;
            }

            // Refresh provider to get latest blockchain state
            const provider = new ethers.BrowserProvider(window.ethereum);
            
            // Force refresh by getting current block
            try {
              await provider.getBlockNumber();
            } catch (e) {
              console.warn("Could not get block number, continuing anyway");
            }

            // Use existing contract instance or create new one
            let contract = window.CONTRACT_INSTANCE;
            if (!contract || window.CONTRACT_ADDRESS !== address) {
              const signer = await provider.getSigner();
              contract = new ethers.Contract(address, abi, signer);
              window.CONTRACT_INSTANCE = contract;
              window.CONTRACT_ADDRESS = address;
              window.CONTRACT_ABI = abi;
            }

            // Call the function
            const result = await contract[funcName](...(funcArgs || []));
            
            // If it's a transaction, wait for it
            if (result.wait) {
              const receipt = await result.wait();
              resolve({ success: true, data: receipt, hash: result.hash });
            } else {
              // It's a view function, return the result directly
              // Convert BigInt to string for JSON serialization
              const serializedResult = JSON.parse(JSON.stringify(result, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
              ));
              resolve({ success: true, data: serializedResult });
            }
          } catch (error) {
            resolve({ success: false, error: error.message, stack: error.stack });
          }
        });
      },
      args: [contractAddress, abi, functionName, args],
    });

    if (!results || !results[0] || results[0].result === undefined) {
      sendResponse({ success: false, error: "Failed to call contract function" });
      return;
    }

    const result = results[0].result;
    sendResponse(result);
  } catch (error) {
    console.error("Call contract function error:", error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Create a user (specific function for registerUser)
 */
async function createUser(contractAddress, abi, masterPassword, sendResponse) {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab || !tab.id) {
      sendResponse({ success: false, error: "No active tab found" });
      return;
    }

    // Check if ethers.js is already loaded, if not inject it
    const ethersLoaded = await ensureEthersLoaded(tab.id);
    if (!ethersLoaded) {
      sendResponse({ success: false, error: "Failed to load ethers.js" });
      return;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: (address, abi, password) => {
        return new Promise(async (resolve) => {
          try {
            if (!window.ethereum || !window.ethers) {
              resolve({
                success: false,
                error: "MetaMask or ethers.js not found",
              });
              return;
            }

            // Use existing contract instance or create new one
            let contract = window.CONTRACT_INSTANCE;
            if (!contract || window.CONTRACT_ADDRESS !== address) {
              const provider = new ethers.BrowserProvider(window.ethereum);
              const signer = await provider.getSigner();
              contract = new ethers.Contract(address, abi, signer);
              window.CONTRACT_INSTANCE = contract;
              window.CONTRACT_ADDRESS = address;
              window.CONTRACT_ABI = abi;
            }

            // Call registerUser
            const tx = await contract.registerUser(password);
            const receipt = await tx.wait();
            
            resolve({ success: true, account: receipt });
          } catch (error) {
            resolve({ success: false, error: error.message });
          }
        });
      },
      args: [contractAddress, abi, masterPassword],
    });

    if (!results || !results[0] || results[0].result === undefined) {
      sendResponse({ success: false, error: "Failed to create user" });
      return;
    }

    const result = results[0].result;
    sendResponse(result);
  } catch (error) {
    console.error("Create user error:", error);
    sendResponse({ success: false, error: error.message });
  }
}

// // A simple background script for a MetaMask connection
// console.log("Background script loaded");
// let CONTRACT_INSTANCE;

// // Listener for messages from the popup or content script
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.type === "CONNECT_WALLET") {
//     connectWallet(sendResponse);
//     return true; // Indicates that the response will be sent asynchronously
//   }

//   if (message.type === "SIGN_TRANS") {
//     signTransaction(sendResponse);
//     return true;
//   }

//   if (message.type === "CONNECT_MY_CONTRACT") {
//     connectSmartContract(sendResponse);
//     return true;
//   }

//   if (message.type === "CALL_CONTRACT_FUNCTION") {
//     const { contractAddress, abi } = message.payload;
//     console.log(
//       "Received CALL_CONTRACT_FUNCTION message",
//       contractAddress,
//       abi
//     );
//     // handleConnect(message)
//     //   .then((result) => {
//     //     sendResponse({ success: true, account: result });
//     //   })
//     //   .catch((err) => {
//     //     sendResponse({ success: false, error: err.message });
//     //   });
//     console.log("CONTRACT_INSTANCE",CONTRACT_INSTANCE);

//     return true; // IMPORTANT for async
//   }

//   if (message.type === "CREATE_USER") {
//     const { contractAddress, abi } = message.payload;
//     console.log("Received CREATE_USER message", contractAddress, abi);
//     handleConnect(message)
//       .then((result) => {
//         sendResponse({ success: true, account: result });
//       })
//       .catch((err) => {
//         sendResponse({ success: false, error: err.message });
//       });
//     return true; // IMPORTANT for async
//   }
// });

// /**
//  * Connects to the user's MetaMask wallet.
//  * This function uses chrome.scripting.executeScript to run code in the active tab.
//  * It requests accounts from MetaMask and sends the result back to the caller.
//  */
// async function connectWallet(sendResponse) {
//   try {
//     const [tab] = await chrome.tabs.query({
//       active: true,
//       currentWindow: true,
//     });

//     const results = await chrome.scripting.executeScript({
//       target: { tabId: tab.id },
//       world: "MAIN",
//       func: () => {
//         return new Promise(async (resolve) => {
//           try {
//             if (!window.ethereum) {
//               resolve({ success: false, error: "MetaMask not found" });
//               return;
//             }

//             const accounts = await window.ethereum.request({
//               method: "eth_requestAccounts",
//             });

//             resolve({ success: true, address: accounts[0] });
//           } catch (error) {
//             if (error.code === 4001) {
//               resolve({ success: false, error: "User rejected connection" });
//             } else {
//               resolve({ success: false, error: error.message });
//             }
//           }
//         });
//       },
//     });

//     const result = results[0].result;
//     sendResponse({
//       reply: result.success ? result.address : result.error,
//     });
//   } catch (error) {
//     sendResponse({ reply: "Error: " + error.message });
//   }
// }

// /**
//  * Signs a message using the user's connected wallet.
//  * This function also runs in the MAIN world to access the MetaMask provider.
//  */
// async function signTransaction(sendResponse) {
//   try {
//     const [tab] = await chrome.tabs.query({
//       active: true,
//       currentWindow: true,
//     });

//     const results = await chrome.scripting.executeScript({
//       target: { tabId: tab.id },
//       world: "MAIN",
//       func: () => {
//         return new Promise(async (resolve) => {
//           try {
//             if (!window.ethereum) {
//               resolve({ success: false, error: "MetaMask not found" });
//               return;
//             }

//             const accounts = await window.ethereum.request({
//               method: "eth_accounts",
//             });

//             if (accounts.length === 0) {
//               resolve({ success: false, error: "No accounts connected" });
//               return;
//             }

//             const message = `Login - Nonce: ${Date.now()}`;
//             const signature = await window.ethereum.request({
//               method: "personal_sign",
//               params: [message, accounts[0]],
//             });

//             resolve({ success: true, signature });
//           } catch (error) {
//             if (error.code === 4001) {
//               resolve({ success: false, error: "User rejected signing" });
//             } else {
//               resolve({ success: false, error: error.message });
//             }
//           }
//         });
//       },
//     });

//     const result = results[0].result;
//     sendResponse({
//       reply: result.success ? result.signature : result.error,
//     });
//   } catch (error) {
//     sendResponse({ reply: "Error: " + error.message });
//   }
// }

// /**
//  * Connects to the smart contract using ethers.js.
//  * It first injects the ethers.min.js file, then executes the function.
//  */
// async function connectSmartContract(sendResponse) {
//   console.log("Creating contract instance...");
//   try {
//     const [tab] = await chrome.tabs.query({
//       active: true,
//       currentWindow: true,
//     });

//     if (!tab || !tab.id) {
//       sendResponse({ reply: "No active tab found" });
//       return;
//     }

//     console.log("Setting up contract instance...");

//     const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
//     const contractABI = [
//       {
//         anonymous: false,
//         inputs: [
//           {
//             indexed: false,
//             internalType: "address",
//             name: "user",
//             type: "address",
//           },
//           {
//             indexed: false,
//             internalType: "bytes32",
//             name: "uniqueHash",
//             type: "bytes32",
//           },
//           {
//             indexed: false,
//             internalType: "string",
//             name: "webUrl",
//             type: "string",
//           },
//           {
//             indexed: false,
//             internalType: "bytes",
//             name: "userName",
//             type: "bytes",
//           },
//           {
//             indexed: false,
//             internalType: "bytes",
//             name: "password",
//             type: "bytes",
//           },
//           {
//             indexed: false,
//             internalType: "uint256",
//             name: "timestamp",
//             type: "uint256",
//           },
//         ],
//         name: "passwordAddedEvent",
//         type: "event",
//       },
//       {
//         anonymous: false,
//         inputs: [
//           {
//             indexed: false,
//             internalType: "address",
//             name: "user",
//             type: "address",
//           },
//           {
//             indexed: false,
//             internalType: "bytes32",
//             name: "hashedPass",
//             type: "bytes32",
//           },
//           {
//             indexed: false,
//             internalType: "bytes32",
//             name: "salt",
//             type: "bytes32",
//           },
//           {
//             indexed: false,
//             internalType: "uint256",
//             name: "timestamp",
//             type: "uint256",
//           },
//         ],
//         name: "userRegisteredEvent",
//         type: "event",
//       },
//       {
//         inputs: [
//           {
//             internalType: "string",
//             name: "_webUrl",
//             type: "string",
//           },
//           {
//             internalType: "bytes",
//             name: "_userName",
//             type: "bytes",
//           },
//           {
//             internalType: "bytes",
//             name: "_password",
//             type: "bytes",
//           },
//         ],
//         name: "addPasswordEntry",
//         outputs: [],
//         stateMutability: "nonpayable",
//         type: "function",
//       },
//       {
//         inputs: [
//           {
//             internalType: "uint256",
//             name: "_id",
//             type: "uint256",
//           },
//         ],
//         name: "getPasswordEntry",
//         outputs: [
//           {
//             components: [
//               {
//                 internalType: "uint256",
//                 name: "id",
//                 type: "uint256",
//               },
//               {
//                 internalType: "bytes32",
//                 name: "uniqueHash",
//                 type: "bytes32",
//               },
//               {
//                 internalType: "string",
//                 name: "webUrl",
//                 type: "string",
//               },
//               {
//                 internalType: "bytes",
//                 name: "userName",
//                 type: "bytes",
//               },
//               {
//                 internalType: "bytes",
//                 name: "password",
//                 type: "bytes",
//               },
//               {
//                 internalType: "uint256",
//                 name: "timestamp",
//                 type: "uint256",
//               },
//               {
//                 internalType: "bool",
//                 name: "isActive",
//                 type: "bool",
//               },
//             ],
//             internalType: "struct PassMang.PasswordEntry",
//             name: "",
//             type: "tuple",
//           },
//         ],
//         stateMutability: "view",
//         type: "function",
//       },
//       {
//         inputs: [],
//         name: "getUsersAllEntries",
//         outputs: [
//           {
//             components: [
//               {
//                 internalType: "uint256",
//                 name: "id",
//                 type: "uint256",
//               },
//               {
//                 internalType: "bytes32",
//                 name: "uniqueHash",
//                 type: "bytes32",
//               },
//               {
//                 internalType: "string",
//                 name: "webUrl",
//                 type: "string",
//               },
//               {
//                 internalType: "bytes",
//                 name: "userName",
//                 type: "bytes",
//               },
//               {
//                 internalType: "bytes",
//                 name: "password",
//                 type: "bytes",
//               },
//               {
//                 internalType: "uint256",
//                 name: "timestamp",
//                 type: "uint256",
//               },
//               {
//                 internalType: "bool",
//                 name: "isActive",
//                 type: "bool",
//               },
//             ],
//             internalType: "struct PassMang.PasswordEntry[]",
//             name: "",
//             type: "tuple[]",
//           },
//         ],
//         stateMutability: "view",
//         type: "function",
//       },
//       {
//         inputs: [],
//         name: "isUserRegister",
//         outputs: [
//           {
//             internalType: "bool",
//             name: "",
//             type: "bool",
//           },
//         ],
//         stateMutability: "view",
//         type: "function",
//       },
//       {
//         inputs: [
//           {
//             internalType: "address",
//             name: "",
//             type: "address",
//           },
//           {
//             internalType: "uint256",
//             name: "",
//             type: "uint256",
//           },
//         ],
//         name: "passwordEntries",
//         outputs: [
//           {
//             internalType: "uint256",
//             name: "id",
//             type: "uint256",
//           },
//           {
//             internalType: "bytes32",
//             name: "uniqueHash",
//             type: "bytes32",
//           },
//           {
//             internalType: "string",
//             name: "webUrl",
//             type: "string",
//           },
//           {
//             internalType: "bytes",
//             name: "userName",
//             type: "bytes",
//           },
//           {
//             internalType: "bytes",
//             name: "password",
//             type: "bytes",
//           },
//           {
//             internalType: "uint256",
//             name: "timestamp",
//             type: "uint256",
//           },
//           {
//             internalType: "bool",
//             name: "isActive",
//             type: "bool",
//           },
//         ],
//         stateMutability: "view",
//         type: "function",
//       },
//       {
//         inputs: [
//           {
//             internalType: "string",
//             name: "_masterPassword",
//             type: "string",
//           },
//         ],
//         name: "registerUser",
//         outputs: [],
//         stateMutability: "nonpayable",
//         type: "function",
//       },
//       {
//         inputs: [
//           {
//             internalType: "address",
//             name: "",
//             type: "address",
//           },
//         ],
//         name: "registeredUser",
//         outputs: [
//           {
//             internalType: "bool",
//             name: "",
//             type: "bool",
//           },
//         ],
//         stateMutability: "view",
//         type: "function",
//       },
//       {
//         inputs: [
//           {
//             internalType: "bytes32",
//             name: "",
//             type: "bytes32",
//           },
//         ],
//         name: "uniqueHashExists",
//         outputs: [
//           {
//             internalType: "bool",
//             name: "",
//             type: "bool",
//           },
//         ],
//         stateMutability: "view",
//         type: "function",
//       },
//       {
//         inputs: [
//           {
//             internalType: "address",
//             name: "",
//             type: "address",
//           },
//         ],
//         name: "users",
//         outputs: [
//           {
//             internalType: "bytes32",
//             name: "masterPasswordHash",
//             type: "bytes32",
//           },
//           {
//             internalType: "bytes32",
//             name: "salt",
//             type: "bytes32",
//           },
//           {
//             internalType: "uint256",
//             name: "timestamp",
//             type: "uint256",
//           },
//           {
//             internalType: "bool",
//             name: "isActive",
//             type: "bool",
//           },
//           {
//             internalType: "uint256",
//             name: "totalEntries",
//             type: "uint256",
//           },
//         ],
//         stateMutability: "view",
//         type: "function",
//       },
//     ];
//     await chrome.scripting.executeScript({
//       target: { tabId: tab.id },
//       world: "MAIN",
//       files: ["ethers.min.js"],
//     });

//     await new Promise((resolve) => setTimeout(resolve, 500));

//     // Inject the ethers.js library and then execute the function
//     const results = await chrome.scripting.executeScript({
//       target: { tabId: tab.id },
//       world: "MAIN",
//       func: (address, abi) => {
//         return new Promise(async (resolve) => {
//           try {
//             if (!window.ethereum || !window.ethers) {
//               resolve({
//                 success: false,
//                 error: "MetaMask or ethers.js not found",
//               });
//               return;
//             }

//             const provider = new ethers.BrowserProvider(window.ethereum);
//             const accounts = await provider.send("eth_requestAccounts", []);
//             const signer = await provider.getSigner();
//             const contractInstance = new ethers.Contract(address, abi, signer);
//             CONTRACT_INSTANCE = contractInstance;
//             resolve({ success: true, account: accounts[0] });
//           } catch (error) {
//             resolve({ success: false, error: error.message });
//           }
//         });
//       },
//       args: [contractAddress, contractABI],
//     });

//     if (!results || !results[0] || results[0].result === undefined) {
//       sendResponse({ reply: "Failed to create contract instance" });
//       return;
//     }

//     const result = results[0].result;
//     sendResponse({
//       reply: result.success ? result.account : result.error,
//     });
//   } catch (error) {
//     console.error("Create contract instance error:", error);
//     sendResponse({ reply: "Error: " + error.message });
//   }
// }
