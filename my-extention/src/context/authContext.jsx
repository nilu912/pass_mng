import { useContext, createContext, useState, useEffect } from "react";
import { sha256 } from "js-sha256";
const authContext = createContext();
export const useAuth = () => useContext(authContext);

const AuthProvider = ({ children }) => {
  const [page, setPage] = useState("login");
  const [user, setUser] = useState(null);

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
  return (
    <authContext.Provider value={{ user, login, logout, createAccount, page }}>
      {children}
    </authContext.Provider>
  );
};

export default AuthProvider;
