import { useContext, createContext, useState, useEffect } from "react";
import { sha256 } from "js-sha256";
const authContext = createContext();
export const useAuth = () => useContext(authContext);
import { abi } from "../contract/PassMang.json";
import { encryptData, decryptData } from "../utils/EncDecFuncs";

const AuthProvider = ({ children }) => {
  const [page, setPage] = useState("login");
  const [user, setUser] = useState(null);
  const [address, setAddress] = useState("");
  const [contract, setContract] = useState(null);
  const [contractStatus, setContractStatus] = useState(false);
  const [WalletStatus, setWalletStatus] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log("calling use effect form authContext");
    chrome.storage.local.get("walletAddress", (data) => {
      console.log(data);
      if (data.walletAddress != undefined) setWalletStatus(true);
    });
    chrome.storage.local.get("contractStatus", (data) => {
      console.log(data.contractStatus);
      if (data.contractStatus == undefined) setContractStatus(false);
      else setContractStatus(true);
    });
    const loginHandller = async () => {
      await chrome.storage.local.get("token", (data) => {
        console.log("token data", data.token);
        if (data.token == null) {
          setPage("login");
          return;
        }
        chrome.runtime.sendMessage(
          {
            type: "CALL_CONTRACT_FUNCTION",
            payload: {
              contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
              abi: abi,
              functionName: "isUserRegister",
              args: [],
            },
          },
          (response) => {
            if (!response.success) {
              console.error(
                "Runtime error:",
                chrome.runtime.lastError?.message || response.error
              );
              return;
            }
            console.log("Get response for call function", response);
            if (response.data) {
              setPage("dashboard");
              setUser(userData);
              // chrome.storage.local.set({ user: userData });
            } else {
              alert("User not registered!");
              return;
            }
          }
        );
      });
    };
    loginHandller();
    setIsLoading(false);
  }, []);

  // useEffect(() => {
  //   chrome.storage.local.get("user", (data) => {
  //     if (data == null || data.user == null) {
  //       setPage("login");
  //     } else {
  //       setPage("dashboard");
  //     }
  //   });

  //   // chrome.storage.local.get("page", (data) => {
  //   //   if (data.page === "dashboard") {
  //   //     setPage("dashboard");
  //   //   } else if (data.page === "login") {
  //   //     setPage("login");
  //   //   }
  //   // });
  // }, [user]);

  const login = (userData) => {
    setIsLoading(true);
    try {
      chrome.storage.local.get("passHash", (data) => {
        // const hashedPassword = sha256(userData.password);
        // if (data.passHash === hashedPassword) {
        const hashedPassword = decryptData(data.passHash);
        if (hashedPassword === userData.password) {
          chrome.runtime.sendMessage(
            {
              type: "CALL_CONTRACT_FUNCTION",
              payload: {
                contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
                abi: abi,
                functionName: "isUserRegister",
                args: [],
              },
            },
            (response) => {
              if (!response.success) {
                console.error(
                  "Runtime error:",
                  chrome.runtime.lastError?.message || response.error
                );
                return;
              }
              console.log("Get response for call function", response);
              if (response.data) {
                chrome.storage.local.set(
                  { token: sha256(hashedPassword) },
                  () => {
                    console.log("Token saved to storage");
                  }
                );
                setPage("dashboard");
                setUser(userData);
                // chrome.storage.local.set({ user: userData });
              } else {
                alert("User not registered!");
                return;
              }
            }
          );
        } else {
          alert("Invalid Password");
        }
      });
    } catch (err) {
      console.error("Error during login:", err);
    } finally {
      setIsLoading(false);
    }
  };
  const logout = () => {
    setUser(null);
    setPage("login");
    chrome.storage.local.remove("user");
    chrome.storage.local.remove("page");
    chrome.storage.local.remove("token");
  };
  const createAccount = async (userData) => {
    setIsLoading(true);
    // 1. Check for existing local password hash FIRST (best practice for UX)
    const { passHash } = await chrome.storage.local.get("passHash");
    if (passHash) {
      return alert("Account already exists"); // Prevents multiple registrations in local storage
    }

    // const hashedPassword = sha256(userData.password);
    console.log("Registering user with password:", userData.password);
    const hashedPassword = encryptData(userData.password);
    console.log("hashedPassword", hashedPassword);

    // The previous code had the storage check *after* the contract call block,
    // and the contract call was not awaited, causing flow issues.

    // 2. Send the transaction and await the response from the background script
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: "CALL_CONTRACT_FUNCTION",
          payload: {
            contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
            abi: abi,
            functionName: "registerUser",
            args: [hashedPassword],
          },
        },
        resolve
      );
    });

    // 3. Handle the response
    if (!response || !response.success) {
      console.error(
        "Runtime error during registerUser:",
        chrome.runtime.lastError?.message || (response && response.error)
      );
      // The Unauthorized (4100) error likely occurs here if the user rejects the MetaMask popup.
      // Alert the user so they know they need to approve the wallet popup.
      alert("Registration failed. Did you approve the MetaMask transaction?");
      return;
    }

    console.log("Get response for call function", response);

    // 4. ONLY IF the contract call succeeded, save the local hash.
    // This assumes the contract call succeeding is the final step for "account creation".
    await chrome.storage.local.set({ passHash: hashedPassword });
    alert("Account created! Please log in."); // Provide feedback
    setIsLoading(false);
  };
  const connectWallet = async () => {
    setIsLoading(true);
    // popup.js
    try {
      chrome.runtime.sendMessage(
        { type: "CONNECT_WALLET", payload: "connect metamask wallet!" },
        async (response) => {
          console.log("Popup received response:", response.reply);
          setAddress(response.reply);
          chrome.storage.local.set({ walletAddress: response.reply }, () => {
            console.log("Wallet saved to storage");
            setContractStatus(true);
          });
          setWalletStatus(true);
        }
      );
    } catch (err) {
      console.error("Error connecting wallet:", err);
    } finally {
      setIsLoading(false);
    }
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

      // setContractStatus("Connecting...");
      console.log("Starting contract connection...");

      // setContractStatus(response.reply);

      chrome.storage.local.set({ contractStatus: response.reply }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error saving to storage:", chrome.runtime.lastError);
        } else {
          console.log("Contract status saved to storage");
        }
      });
    });
  };

  return (
    <authContext.Provider
      value={{
        user,
        login,
        logout,
        createAccount,
        page,
        setPage,
        connectWallet,
        address,
        contract,
        contractStatus,
        connectContract,
        WalletStatus,
        setWalletStatus,
        setContractStatus,
        isLoading,
        setIsLoading,
      }}
    >
      {children}
    </authContext.Provider>
  );
};

export default AuthProvider;
