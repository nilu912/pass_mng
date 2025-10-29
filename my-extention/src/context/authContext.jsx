import { useContext, createContext, useState, useEffect } from "react";
import { sha256 } from "js-sha256";
const authContext = createContext();
export const useAuth = () => useContext(authContext);

const AuthProvider = ({ children }) => {
  const [page, setPage] = useState("login");
  const [user, setUser] = useState(null);
  const [address, setAddress] = useState("");
  const [contract, setContract] = useState(null);
  const [contractStatus, setContractStatus] = useState(false);
  const [WalletStatus, setWalletStatus] = useState(false);
  useEffect(() => {
    console.log("calling use effect form authContext");
    chrome.storage.local.get("walletAddress", (data) => {
      console.log(data);
      if(data.walletAddress != undefined)
        setWalletStatus(true);
    })
    chrome.storage.local.get("contractStatus", (data) => {
      console.log(data.contractStatus);
      if(data.contractStatus == undefined)
        setContractStatus(false);
      else
        setContractStatus(true);
    });
  }, []);

  useEffect(() => {
    chrome.storage.local.get("user", (data) => {
      if (data == null || data.user == null) {
        setPage("login");
      } else {
        setPage("dashboard");
      }
    });

    // chrome.storage.local.get("page", (data) => {
    //   if (data.page === "dashboard") {
    //     setPage("dashboard");
    //   } else if (data.page === "login") {
    //     setPage("login");
    //   }
    // });
  }, [user]);

  const login = (userData) => {
    const hashPass = chrome.storage.local.get("passHash", (data) => {
      const hashedPassword = sha256(userData.password);
      if (data.passHash === hashedPassword) {
        setPage("dashboard");
        setUser(userData);
        chrome.storage.local.set({ user: userData });
      } else {
        alert("Invalid Password");
      }
    });
  };
  const logout = () => {
    setUser(null);
    setPage("login");
    chrome.storage.local.remove("user");
    chrome.storage.local.remove("page");
  };
  const createAccount = async (userData) => {
    const { passHash } = await chrome.storage.local.get("passHash");
    if (passHash) {
      return alert("Account already exists");
    }
    const hashedPassword = sha256(userData.password);
    await chrome.storage.local.set({ passHash: hashedPassword });
  };

  const connectWallet = async () => {
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
        connectWallet,
        address,
        contract,
        contractStatus,
        connectContract,
        WalletStatus,
        setContractStatus
      }}
    >
      {children}
    </authContext.Provider>
  );
};

export default AuthProvider;
