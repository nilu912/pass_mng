import React, { useEffect, useState } from "react";
import { useAuth } from "../context/authContext";
import { abi } from "../contract/PassMang.json";
import {
  Eye,
  EyeOff,
  Lock,
  Globe,
  User,
  RefreshCw,
  Plus,
  Copy,
  Check,
  Alert,
} from "../utils/svgIcons.jsx";
import { encryptData, decryptData } from "../utils/EncDecFuncs.jsx";

const Dashboard = () => {
  const { logout, connectWallet } = useAuth();
  const [form, setForm] = useState({
    url: "",
    userName: "",
    password: "",
  });
  const [decryptedEntries, setDecryptedEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState({});
  const [copiedField, setCopiedField] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [autoFillEnabled, setAutoFillEnabled] = useState(false);
  // const [currentSiteUrl, setCurrentSiteUrl] = useState("");

  useEffect(() => {
    chrome.storage.local.get("walletAddress", (data) => {
      setWalletAddress(data.walletAddress);
    });
    chrome.storage.local.get("autoFillEnabled", (data) => {
      if (data) {
        setAutoFillEnabled(data.autoFillEnabled);
      }
    });
    fetchAndDecryptEntries();

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = new URL(tabs[0].url);
      console.log(url.hostname);
    });
  }, []);

  const setAutoFillHandler = () => {
    chrome.storage.local.set({
      autoFillEnabled: !autoFillEnabled,
    });
    setAutoFillEnabled(!autoFillEnabled);
  };
  useEffect(() => {
    if (decryptedEntries.length === 0) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        try {
          const url = new URL(tabs[0].url);
          const hostname = url.hostname.replace("www.", "");
          // setCurrentSiteUrl(hostname);
          // console.log("📍 Current site:", hostname);

          // Filter entries that match current site
          const matching = decryptedEntries.filter((entry) => {
            let savedHostname = entry.url;
            try {
              const savedUrl = new URL(
                entry.url.startsWith("http")
                  ? entry.url
                  : `https://${entry.url}`
              );
              savedHostname = savedUrl.hostname.replace("www.", "");
            } catch (e) {
              savedHostname = entry.url.replace("www.", "").toLowerCase();
            }

            return (
              hostname.includes(savedHostname) ||
              savedHostname.includes(hostname)
            );
          });

          // setFilteredEntries(matching);
          console.log(
            `🔍 Found ${matching.length} matching credentials for ${hostname}`
          );

          // Auto-fill if there's exactly one match and auto-fill is enabled
          if (matching.length === 1 && autoFillEnabled) {
            console.log("🚀 Auto-filling credentials...");
            setTimeout(() => {
              autofill(matching[0]);
            }, 500); // Small delay to ensure page is ready
          }
        } catch (error) {
          console.error("Error processing current tab URL:", error);
        }
      }
    });
  }, [decryptedEntries, autoFillEnabled]);

  const autofill = async (entry) => {
    // Check if username and password are valid
    if (
      entry.userName.includes("[Error") ||
      entry.userName.includes("[Invalid") ||
      entry.password.includes("[Error") ||
      entry.password.includes("[Invalid")
    ) {
      setErrorMessage("Cannot autofill: Invalid or corrupted credentials");
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab || !tab.id) {
        setErrorMessage("No active tab found");
        return;
      }

      // Check if we can access this tab
      if (
        tab.url.startsWith("chrome://") ||
        tab.url.startsWith("chrome-extension://")
      ) {
        setErrorMessage("Cannot autofill on Chrome internal pages");
        return;
      }

      // Extract hostname from current tab
      const currentUrl = new URL(tab.url);
      const currentHostname = currentUrl.hostname.replace("www.", "");

      // Extract hostname from saved entry
      let savedHostname = entry.url;
      try {
        // Try to parse as full URL
        const savedUrl = new URL(
          entry.url.startsWith("http") ? entry.url : `https://${entry.url}`
        );
        savedHostname = savedUrl.hostname.replace("www.", "");
      } catch (e) {
        // If parsing fails, treat it as hostname directly
        savedHostname = entry.url.replace("www.", "").toLowerCase();
      }

      console.log("🔍 URL Matching:", {
        current: currentHostname,
        saved: savedHostname,
        fullCurrentUrl: tab.url,
      });

      if (
        !currentHostname.includes(savedHostname) &&
        !savedHostname.includes(currentHostname)
      ) {
        setErrorMessage(
          `❌ URL mismatch!\nCurrent site: ${currentHostname}\nSaved for: ${savedHostname}\n\nThis credential is for a different website.`
        );
        console.warn("URL mismatch - autofill blocked");
        return;
      }

      console.log("✅ URL matched - proceeding with autofill");

      // Inject autofill code directly into the page
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (username, password) => {
          // Find username field
          function findUsernameField() {
            const selectors = [
              'input[type="email"]',
              'input[type="text"][name*="email" i]',
              'input[type="text"][name*="user" i]',
              'input[type="text"][id*="email" i]',
              'input[type="text"][id*="user" i]',
              'input[placeholder*="email" i]',
              'input[placeholder*="username" i]',
              'input[autocomplete="username"]',
              'input[autocomplete="email"]',
              'input[name="username"]',
              'input[name="email"]',
              'input[id="username"]',
              'input[id="email"]',
            ];

            for (const selector of selectors) {
              const field = document.querySelector(selector);
              if (field && field.offsetWidth > 0) {
                return field;
              }
            }

            const textInputs = document.querySelectorAll('input[type="text"]');
            for (const input of textInputs) {
              if (input.offsetWidth > 0) {
                return input;
              }
            }

            return null;
          }

          // Find password field
          function findPasswordField() {
            const passwordFields = document.querySelectorAll(
              'input[type="password"]'
            );
            for (const field of passwordFields) {
              if (field.offsetWidth > 0) {
                return field;
              }
            }
            return null;
          }

          // Fill input field
          function fillInputField(field, value) {
            field.value = value;

            const events = [
              new Event("input", { bubbles: true }),
              new Event("change", { bubbles: true }),
              new Event("blur", { bubbles: true }),
            ];

            events.forEach((event) => field.dispatchEvent(event));

            try {
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                "value"
              ).set;
              nativeInputValueSetter.call(field, value);
              field.dispatchEvent(new Event("input", { bubbles: true }));
            } catch (e) {
              // React setter not needed
            }
          }

          // Perform autofill
          const usernameField = findUsernameField();
          const passwordField = findPasswordField();

          let filled = false;

          if (usernameField) {
            fillInputField(usernameField, username);
            filled = true;
            console.log("✅ Username filled");
          }

          if (passwordField) {
            fillInputField(passwordField, password);
            filled = true;
            console.log("✅ Password filled");
          }

          return {
            success: filled,
            message: filled
              ? "Credentials filled successfully"
              : "No login fields found on this page",
            foundUsername: !!usernameField,
            foundPassword: !!passwordField,
          };
        },
        args: [entry.userName, entry.password],
      });

      const result = results[0].result;

      if (result.success) {
        setSuccessMessage(
          `✅ Credentials filled successfully on ${currentHostname}!`
        );
        console.log("Autofill successful:", result);
      } else {
        setErrorMessage(result.message);
        console.warn("Autofill failed:", result);
      }
    } catch (error) {
      console.error("❌ Autofill error:", error);
      setErrorMessage("Error: " + error.message);
    }
  };
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const inputHandler = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: value,
    });
  };

  const submitHandler = async () => {
    if (!form.url || !form.userName || !form.password) {
      setErrorMessage("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      console.log("\n=== Starting Encryption Process ===");
      console.log("\n=== Submitting New Password Entry ===");

      // Encrypt username and password
      const encryptedUserName = encryptData(form.userName);
      const encryptedPassword = encryptData(form.password);

      console.log("📦 Data prepared for blockchain:", {
        url: form.url,
        encryptedUserName: encryptedUserName.substring(0, 60) + "...",
        encryptedPassword: encryptedPassword.substring(0, 60) + "...",
      });

      // Verify encryption works by testing decryption
      const testUserName = decryptData(encryptedUserName);
      const testPassword = decryptData(encryptedPassword);

      if (testUserName !== form.userName || testPassword !== form.password) {
        throw new Error("Encryption verification failed!");
      }

      console.log("✅ Encryption verified successfully");

      // Find the addPasswordEntry function in ABI
      const addPasswordEntryAbi = abi.find(
        (item) => item.name === "addPasswordEntry" && item.type === "function"
      );

      console.log("📡 Calling smart contract...");

      chrome.runtime.sendMessage(
        {
          type: "CALL_CONTRACT_FUNCTION",
          payload: {
            contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
            abi: addPasswordEntryAbi ? [addPasswordEntryAbi] : abi,
            functionName: "addPasswordEntry",
            args: [form.url, encryptedUserName, encryptedPassword],
          },
        },
        (response) => {
          setIsSubmitting(false);

          if (chrome.runtime.lastError) {
            const errorMsg = chrome.runtime.lastError.message;
            console.error("❌ Runtime error:", errorMsg);
            setErrorMessage(`Failed to add password entry: ${errorMsg}`);
            return;
          }

          if (!response || !response.success) {
            const errorMsg = response?.error || "Unknown error";
            console.error("❌ Contract call failed:", errorMsg);
            setErrorMessage(`Failed to add password entry: ${errorMsg}`);
            return;
          }

          console.log("✅ Password entry added to blockchain:", response);
          setSuccessMessage("Password entry added successfully!");

          // Clear form
          setForm({ url: "", userName: "", password: "" });

          // Fetch updated entries after 1 second
          setTimeout(() => {
            fetchAndDecryptEntries();
          }, 1000);
        }
      );
    } catch (error) {
      setIsSubmitting(false);
      console.error("❌ Error in submission:", error);
      setErrorMessage("Error: " + error.message);
    }
  };

  const fetchAndDecryptEntries = () => {
    setIsLoading(true);
    setErrorMessage("");

    console.log("\n=== Fetching Password Entries ===");

    chrome.runtime.sendMessage(
      {
        type: "CALL_CONTRACT_FUNCTION",
        payload: {
          contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
          abi: abi,
          functionName: "getUsersAllEntries",
          args: [],
        },
      },
      (response) => {
        setIsLoading(false);

        if (chrome.runtime.lastError) {
          const error = chrome.runtime.lastError.message;
          console.error("❌ Runtime error:", error);
          setErrorMessage("Failed to fetch entries: " + error);
          return;
        }

        if (!response || !response.success) {
          const error = response?.error || "Unknown error";
          console.error("❌ Contract call failed:", error);
          setErrorMessage("Failed to fetch entries: " + error);
          return;
        }

        console.log("📥 Raw data from blockchain:", response.data);

        if (!response.data || !Array.isArray(response.data)) {
          console.error("❌ Invalid response format");
          setErrorMessage("Invalid data format from contract");
          return;
        }

        // Process entries based on Solidity struct:
        // struct PasswordEntry {
        //     uint id;              // index 0
        //     bytes32 uniqueHash;   // index 1
        //     string webUrl;        // index 2
        //     string userName;      // index 3 (encrypted)
        //     string password;      // index 4 (encrypted)
        //     uint timestamp;       // index 5
        //     bool isActive;        // index 6
        // }

        const decrypted = response.data.map((entry, idx) => {
          try {
            console.log(`\n--- Processing Entry ${idx + 1} ---`);

            // Extract data from contract response
            // The entry might be an object or array depending on your web3 library
            const id = entry.id || entry[0];
            const webUrl = entry.webUrl || entry[2];
            const encryptedUserName = entry.userName || entry[3];
            const encryptedPassword = entry.password || entry[4];
            const timestamp = entry.timestamp || entry[5];
            const isActive =
              entry.isActive !== undefined ? entry.isActive : entry[6];

            console.log("📦 Entry data:", {
              id: id?.toString(),
              webUrl: webUrl,
              encryptedUserName: encryptedUserName?.substring(0, 50) + "...",
              encryptedPassword: encryptedPassword?.substring(0, 50) + "...",
              timestamp: timestamp?.toString(),
            });

            // Decrypt username and password
            const decryptedUserName = decryptData(encryptedUserName);
            const decryptedPassword = decryptData(encryptedPassword);

            console.log("🔓 Decrypted:", {
              userName: decryptedUserName,
              password: decryptedPassword.substring(0, 10) + "...",
            });

            return {
              id: id?.toString() || idx.toString(),
              url: webUrl || "Unknown",
              userName: decryptedUserName,
              password: decryptedPassword,
              timestamp: timestamp
                ? new Date(Number(timestamp) * 1000).toLocaleString()
                : "N/A",
              isActive: isActive !== undefined ? Boolean(isActive) : true,
            };
          } catch (error) {
            console.error(`❌ Error processing entry ${idx}:`, error);
            return {
              id: idx.toString(),
              url: "Error",
              userName: "[Processing Error]",
              password: "[Processing Error]",
              timestamp: "N/A",
              isActive: false,
            };
          }
        });

        console.log("\n✅ All entries processed:", decrypted.length);
        setDecryptedEntries(decrypted);
      }
    );
  };

  const togglePasswordVisibility = (id) => {
    setShowPasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const copyToClipboard = (text, field) => {
    // Don't copy error messages
    if (
      text.includes("[Error") ||
      text.includes("[Invalid") ||
      text.includes("[Decryption Failed]")
    ) {
      setErrorMessage("Cannot copy error message");
      return;
    }

    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        setErrorMessage("Failed to copy to clipboard");
      });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-indigo-100">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl shadow-lg">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Password Manager
                </h1>
                <p className="text-gray-600 mt-1">
                  Secure blockchain-based password storage
                </p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-2.5 px-6 rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Alert Messages */}
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-xs">
          {errorMessage && (
            <div className="bg-red-50 border border-red-400 text-red-700 px-3 py-2 rounded-md shadow-sm flex items-start gap-2 text-xs">
              <Alert className="text-red-500 flex-shrink-0 w-3 h-3 mt-0.5" />
              <p className="flex-1 leading-tight">{errorMessage}</p>
              <button
                onClick={() => setErrorMessage("")}
                className="text-red-500 hover:text-red-700 flex-shrink-0"
              >
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-400 text-green-700 px-3 py-2 rounded-md shadow-sm flex items-start gap-2 text-xs">
              <Check className="text-green-500 flex-shrink-0 w-3 h-3 mt-0.5" />
              <p className="flex-1 leading-tight">{successMessage}</p>
              <button
                onClick={() => setSuccessMessage("")}
                className="text-green-500 hover:text-green-700 flex-shrink-0"
              >
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Wallet Connection Section */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-indigo-100">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                Wallet Connection
              </h3>

              {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <button
                  onClick={connectWallet}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 px-6 rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Connect Wallet
                </button>
                <button
                  onClick={connectContract}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-3 px-6 rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Connect Contract
                </button>
              </div> */}

              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 space-y-3 border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700 text-sm">
                    Wallet Address
                  </span>
                  <span className="text-gray-600 font-mono text-xs truncate ml-2 max-w-xs">
                    {walletAddress || "Not connected"}
                  </span>
                </div>
                {/* <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700 text-sm">
                    Contract Status
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      contractStatus === "Not connected"
                        ? "bg-gray-200 text-gray-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {contractStatus ? "Connected" : "Not connected"}
                  </span>
                </div> */}
              </div>
            </div>

            {/* Add New Entry Form */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-indigo-100">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Plus className="text-indigo-600" />
                Add New Password Entry
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Globe className="inline w-4 h-4 mr-1 text-indigo-600" />
                    Website URL
                  </label>
                  <input
                    type="text"
                    name="url"
                    placeholder="e.g., facebook.com"
                    value={form.url}
                    onChange={inputHandler}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-gray-50 hover:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <User className="inline w-4 h-4 mr-1 text-indigo-600" />
                    Username / Email
                  </label>
                  <input
                    type="text"
                    name="userName"
                    placeholder="e.g., user@example.com"
                    value={form.userName}
                    onChange={inputHandler}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-gray-50 hover:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Lock className="inline w-4 h-4 mr-1 text-indigo-600" />
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    placeholder="Enter password"
                    value={form.password}
                    onChange={inputHandler}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-gray-50 hover:bg-white"
                  />
                </div>

                <button
                  onClick={submitHandler}
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3.5 px-6 rounded-xl transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Encrypting & Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Add Password Entry
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Saved Passwords */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-indigo-100 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  Saved Passwords
                </h3>
                <button
                  onClick={fetchAndDecryptEntries}
                  disabled={isLoading}
                  className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 p-2 rounded-lg transition-colors disabled:opacity-50"
                  title="Refresh entries"
                >
                  <RefreshCw
                    className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
              {/* Add this inside the "Saved Passwords" card, before the Total Entries div */}

              <div className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        Auto-fill
                      </p>
                      <p className="text-xs text-gray-600">
                        Fill credentials automatically
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAutoFillHandler()}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      autoFillEnabled ? "bg-green-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        autoFillEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
              <div className="mb-4">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl p-4 text-center">
                  <div className="text-4xl font-bold">
                    {decryptedEntries.length}
                  </div>
                  <div className="text-sm opacity-90 mt-1">Total Entries</div>
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                {decryptedEntries.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Lock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm font-medium">
                      No passwords saved yet
                    </p>
                    <p className="text-xs mt-1">
                      Start by adding your first entry
                    </p>
                  </div>
                ) : (
                  decryptedEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="border-2 border-gray-100 rounded-xl p-3 hover:border-indigo-200 hover:shadow-md transition-all bg-gradient-to-br from-white to-gray-50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Globe className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                          <span className="font-semibold text-gray-800 truncate text-sm">
                            {entry.url}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                            entry.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {entry.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                          <span className="font-mono text-xs text-gray-700 truncate flex-1">
                            {entry.userName}
                          </span>
                          <button
                            onClick={() =>
                              copyToClipboard(
                                entry.userName,
                                `user-${entry.id}`
                              )
                            }
                            className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                            title="Copy username"
                          >
                            {copiedField === `user-${entry.id}` ? (
                              <Check className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-gray-500" />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                          <span className="font-mono text-xs text-gray-700 flex-1">
                            {showPasswords[entry.id]
                              ? entry.password
                              : "••••••••"}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(entry.id)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                            title={showPasswords[entry.id] ? "Hide" : "Show"}
                          >
                            {showPasswords[entry.id] ? (
                              <EyeOff className="w-3.5 h-3.5 text-gray-500" />
                            ) : (
                              <Eye className="w-3.5 h-3.5 text-gray-500" />
                            )}
                          </button>
                          <button
                            onClick={() =>
                              copyToClipboard(
                                entry.password,
                                `pass-${entry.id}`
                              )
                            }
                            className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                            title="Copy password"
                          >
                            {copiedField === `pass-${entry.id}` ? (
                              <Check className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-gray-500" />
                            )}
                          </button>
                        </div>
                      </div>
                      {/* In the password entry card */}
                      <button
                        onClick={() => autofill(entry)}
                        className="w-full mt-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-2 px-4 rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        Fill Data
                      </button>{" "}
                      <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                        {entry.timestamp}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #c7d2fe;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a5b4fc;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;

// import React, { useEffect, useState } from "react";
// import { useAuth } from "../context/authContext";
// import { abi } from "../contract/PassMang.json";
// import CryptoJS from "crypto-js";

// const Dashboard = () => {
//   const [user, setUser] = useState(null);
//   const { logout, connectWallet, address } = useAuth();
//   const [form, setForm] = useState({
//     url: "",
//     userName: "",
//     password: "",
//   });
//   const usersCred = [
//     {
//       id: 1,
//       url: "facebook.com",
//       email: "user1@example.com",
//       password: "password1",
//     },
//     {
//       id: 2,
//       url: "twitter.com",
//       email: "user2@example.com",
//       password: "password2",
//     },
//     {
//       id: 3,
//       url: "instagram.com",
//       email: "user3@example.com",
//       password: "password3",
//     },
//   ];

//   useEffect(() => {
//     chrome.storage.local.get("user", (data) => {
//       setUser(data);
//       console.log(data);
//       chrome.runtime.sendMessage(
//         {
//           type: "CALL_CONTRACT_FUNCTION",
//           payload: {
//             contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
//             abi: abi,
//             functionName: "getUsersAllEntries",
//             args: [],
//           },
//         },
//         (response) => {
//           if (!response.success) {
//             console.error(
//               "Runtime error:",
//               chrome.runtime.lastError?.message || response.error
//             );
//             return;
//           }
//           console.log("Get response for call function", response);
//         }
//       );
//     });
//   }, []);

//   const [signature, setSignature] = useState("Idle");
//   const [contractStatus, setContractStatus] = useState("Not connected");
//   const [status, setStatus] = useState("Idle");

//   useEffect(() => {
//     chrome.storage.local.get("signature", (data) => {
//       if (data.signature) {
//         setSignature(data.signature);
//       }
//     });

//     chrome.storage.local.get("contractStatus", (data) => {
//       if (data.contractStatus) {
//         setContractStatus(data.contractStatus);
//       }
//     });
//     console.log("Contract status restored:");
//   }, []);

//   const SignTrans = () => {
//     chrome.runtime.sendMessage({ type: "SIGN_TRANS" }, (response) => {
//       console.log("Get response for sign transaction", response);

//       if (chrome.runtime.lastError) {
//         console.error("Runtime error:", chrome.runtime.lastError.message);
//         return;
//       }

//       if (!response) {
//         console.error("No response received");
//         return;
//       }

//       if (!response.reply) {
//         console.error("Invalid response format:", response);
//         return;
//       }

//       console.log("Signature response:", response.reply);
//       setSignature(response.reply);
//       chrome.storage.local.set({ signature: response.reply }, () => {
//         console.log("Signature saved to storage");
//       });
//     });
//   };

//   const inputHandler = (e) => {
//     const { name, value } = e.target;
//     console.log(name, value);
//     setForm({
//       ...form,
//       [name]: value,
//     });
//   };

//   function encryptData(data, key) {
//     // Ensure data is a string. form.userName might be an array based on your logs!
//     const dataStr = Array.isArray(data) ? data[0] : data;

//     const encrypted = CryptoJS.AES.encrypt(dataStr, key, {
//       mode: CryptoJS.mode.ECB, // WARNING: ECB is not secure for many use cases, but it doesn't require an IV.
//       padding: CryptoJS.pad.Pkcs7,
//     });
//     return encrypted.toString();
//   }

// function decryptData(ciphertext, key) {
//   const parts = ciphertext.split(":");
//   const iv = CryptoJS.enc.Hex.parse(parts[0]);
//   const encrypted = parts[1];

//   const bytes = CryptoJS.AES.decrypt(encrypted, key, {
//     iv: iv,
//     mode: CryptoJS.mode.CBC,
//     padding: CryptoJS.pad.Pkcs7,
//   });

//   return bytes.toString(CryptoJS.enc.Utf8);
// }

//   function base64ToHex(base64) {
//     const raw = atob(base64); // Decode Base64 to binary string
//     let result = "0x";
//     for (let i = 0; i < raw.length; i++) {
//       const hex = raw.charCodeAt(i).toString(16);
//       result += hex.length === 2 ? hex : "0" + hex;
//     }
//     return result.toLowerCase();
//   }
//   const submitHandler = () => {
//     console.log("Form submitted:", form);
//     // /**
//     //  * Converts a standard JavaScript string into a Uint8Array of UTF-8 bytes.
//     //  * @param {string} str - The input string.
//     //  * @returns {Uint8Array} - The array of bytes.
//     //  */
//     // function stringToBytes(str) {
//     //   // TextEncoder is used to encode a string into a Uint8Array using UTF-8.
//     //   const encoder = new TextEncoder();

//     //   // The .encode() method performs the conversion.
//     //   const bytes = encoder.encode(str);

//     //   return bytes;
//     // }

//     // function bytesToHexString(byteArray) {
//     //   return (
//     //     "0x" +
//     //     Array.from(byteArray)
//     //       .map((byte) => byte.toString(16).padStart(2, "0"))
//     //       .join("")
//     //   );
//     // }
//     const SECRET_KEY_HEX = CryptoJS.enc.Hex.parse(
//       "0123456789abcdef0123456789abcdef"
//     );
//     const encryptedUserName = encryptData(form.userName, SECRET_KEY_HEX);
//     const encryptedPassword = encryptData(form.password, SECRET_KEY_HEX);

//     console.log("Encrypted UserName:", encryptedUserName);
//     console.log("Encrypted Password:", encryptedPassword);

//     // Example Usage:
//     // const convertedUserName = stringToBytes(encryptedUserName);
//     // const convertedPassword = stringToBytes(encryptedPassword);

//     // const userNameInBytes = bytesToHexString(convertedUserName);
//     // const passwordInBytes = bytesToHexString(convertedPassword);

//     const urlInString = form.url.toString();
//     // Output: Uint8Array [72, 101, 108, 108, 111, 32, 240, 159, 145, 133]
//     // (Note: The emoji '👋' requires 4 bytes in UTF-8, which is why the array size is larger than the string length)

//     chrome.runtime.sendMessage(
//       {
//         type: "CALL_CONTRACT_FUNCTION",
//         payload: {
//           contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
//           abi: abi,
//           functionName: "addPasswordEntry",
//           args: [urlInString, encryptedUserName, encryptedPassword],
//         },
//       },
//       (response) => {
//         if (!response.success) {
//           console.error(
//             "Runtime error:",
//             chrome.runtime.lastError?.message || response.error
//           );
//           return;
//         }
//         console.log("Get response for call function", response);
//       }
//     );
//   };

//   const connectContract = () => {
//     chrome.runtime.sendMessage({ type: "CONNECT_MY_CONTRACT" }, (response) => {
//       console.log("Get response for sign transaction", response);

//       if (chrome.runtime.lastError) {
//         console.error("Runtime error:", chrome.runtime.lastError.message);
//         return;
//       }

//       if (!response) {
//         console.error("No response received");
//         return;
//       }

//       if (!response.reply) {
//         console.error("Invalid response format:", response);
//         return;
//       }

//       console.log("Signature response:", response.reply);

//       setContractStatus("Connecting...");
//       console.log("Starting contract connection...");

//       setContractStatus(response.reply);

//       chrome.storage.local.set({ contractStatus: response.reply }, () => {
//         if (chrome.runtime.lastError) {
//           console.error("Error saving to storage:", chrome.runtime.lastError);
//         } else {
//           console.log("Contract status saved to storage");
//         }
//       });
//     });
//   };

//   const clearData = () => {
//     chrome.storage.local.remove("walletAddress", () => {
//       console.log("Wallet address removed");
//       setStatus("Idle");
//     });
//     chrome.storage.local.remove("signature", () => {
//       console.log("Signature removed");
//       setSignature("Idle");
//     });
//     chrome.storage.local.remove("contractStatus", () => {
//       console.log("Contract status removed");
//       setContractStatus("Not connected");
//     });
//   };

//   const callFunction = () => {
//     chrome.runtime.sendMessage(
//       {
//         type: "CALL_CONTRACT_FUNCTION",
//         payload: {
//           contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
//           abi: abi,
//           functionName: "registerUser",
//           args: ["abc"],
//         },
//       },
//       (response) => {
//         if (!response.success) {
//           console.error(
//             "Runtime error:",
//             chrome.runtime.lastError?.message || response.error
//           );
//           return;
//         }
//         console.log("Get response for call function", response);
//       }
//     );
//   };

//   const callUserDataContract = () => {
//     chrome.runtime.sendMessage(
//       {
//         type: "CALL_CONTRACT_FUNCTION",
//         payload: {
//           contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
//           abi: abi,
//           functionName: "getPasswordEntry",
//           args: [1],
//         },
//       },
//       (response) => {
//         if (!response.success) {
//           console.error(
//             "Runtime error:",
//             chrome.runtime.lastError?.message || response.error
//           );
//           return;
//         }
//         console.log("Get response for call function", response);
//       }
//     );
//   };
//   return (
//     <div className="p-4">
//       <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

//       <button
//         onClick={() => logout()}
//         className="bg-red-500 text-white py-2 px-4 rounded mt-4 mb-4"
//       >
//         Logout
//       </button>

//       <div className="mb-6">
//         <h3 className="text-lg font-semibold mb-4">MetaMask Bridge</h3>

//         <div className="space-x-2 mb-4">
//           <button
//             onClick={connectWallet}
//             className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
//           >
//             Connect Wallet
//           </button>
//           <button
//             onClick={SignTrans}
//             className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
//           >
//             Sign Transaction
//           </button>
//           <button
//             onClick={connectContract}
//             className="bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600"
//           >
//             Connect Contract
//           </button>
//           <button
//             onClick={clearData}
//             className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
//           >
//             Clear Storage
//           </button>
//           <button
//             onClick={callFunction}
//             className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
//           >
//             Call Function
//           </button>

//           <button
//             onClick={callUserDataContract}
//             className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
//           >
//             fetch data
//           </button>
//         </div>

//         <div className="mt-4 p-4 bg-gray-100 rounded">
//           <div className="text-sm space-y-2">
//             <div>
//               <strong>User Wallet:</strong> {address}
//             </div>
//             <div>
//               <strong>Signature:</strong> {signature}
//             </div>
//             <div>
//               <strong>Contract Status:</strong> {contractStatus}
//             </div>
//           </div>
//         </div>
//       </div>

//       <div>
//         <h1>Enter new entry:</h1>
//         <div>
//           <input
//             type="text"
//             name="url"
//             placeholder="enter URL"
//             value={form.url}
//             onChange={inputHandler}
//           />
//           <input
//             type="text"
//             name="userName"
//             placeholder="enter Email/userNamr"
//             value={form.userName}
//             onChange={inputHandler}
//           />
//           <input
//             type="text"
//             name="password"
//             placeholder="Password"
//             value={form.password}
//             onChange={inputHandler}
//           />
//           <button type="submit" onClick={submitHandler}>
//             Submit
//           </button>
//         </div>
//       </div>
//       <div>
//         <h3 className="text-lg font-semibold mb-2">User Credentials</h3>
//         <div className="space-y-2">
//           {usersCred.map((data) => (
//             <div key={data.id} className="p-2 border rounded">
//               <p>
//                 <strong>URL:</strong> {data.url}
//               </p>
//               <p>
//                 <strong>Email:</strong> {data.email}
//               </p>
//               <p>
//                 <strong>Password:</strong> {data.password}
//               </p>
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Dashboard;

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
