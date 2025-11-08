import CryptoJS from "crypto-js";
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY;

/**
 * Encrypts data using AES-256-CBC
 * @param {string} plaintext - The data to encrypt
 * @returns {string} - Format: "IV_HEX:CIPHERTEXT_BASE64"
 */
export function encryptData(plaintext) {

  try {
    if (!plaintext) {
      throw new Error("No data to encrypt");
    }

    // Convert to string
    const data = String(plaintext);
    // Generate random 16-byte IV
    const iv = CryptoJS.lib.WordArray.random(16);

    // Parse encryption key from hex string
    const key = CryptoJS.enc.Hex.parse(ENCRYPTION_KEY);
    // Encrypt using AES-CBC
    const encrypted = CryptoJS.AES.encrypt(data, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    console.log(data);
    // Format: IV (as hex) : Ciphertext (as base64)
    const result = iv.toString(CryptoJS.enc.Hex) + ":" + encrypted.toString();

    console.log("✅ Encrypted:", {
      original: data.substring(0, 20) + "...",
      ivLength: iv.toString(CryptoJS.enc.Hex).length,
      result: result.substring(0, 50) + "...",
    });

    return result;
  } catch (error) {
    console.error("❌ Encryption error:", error);
    throw new Error("Encryption failed: " + error.message);
  }
}

/**
 * Decrypts data encrypted with encryptData function
 * @param {string} ciphertext - Format: "IV_HEX:CIPHERTEXT_BASE64"
 * @returns {string} - The decrypted plaintext
 */
export function decryptData(ciphertext) {
  try {
    // Validate input
    if (!ciphertext || typeof ciphertext !== "string") {
      console.error("❌ Invalid ciphertext:", typeof ciphertext);
      return "[Invalid Data]";
    }

    // Split IV and encrypted data
    const parts = ciphertext.split(":");
    if (parts.length !== 2) {
      console.error(
        "❌ Invalid format. Expected 'IV:CIPHERTEXT', got:",
        ciphertext.substring(0, 50)
      );
      return "[Invalid Format]";
    }

    const ivHex = parts[0];
    const encryptedData = parts[1];

    // Validate IV length (should be 32 hex characters = 16 bytes)
    if (ivHex.length !== 32) {
      console.error("❌ Invalid IV length:", ivHex.length, "expected 32");
      return "[Invalid IV]";
    }

    console.log("🔓 Decrypting:", {
      ivHex: ivHex,
      encryptedLength: encryptedData.length,
    });

    // Parse IV from hex string
    const iv = CryptoJS.enc.Hex.parse(ivHex);

    // Parse key from hex string
    const key = CryptoJS.enc.Hex.parse(ENCRYPTION_KEY);

    // Decrypt using AES-CBC
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    // Convert to UTF-8 string
    const plaintext = decrypted.toString(CryptoJS.enc.Utf8);

    if (!plaintext || plaintext.length === 0) {
      console.error("❌ Decryption produced empty result");
      return "[Decryption Failed]";
    }

    console.log(
      "✅ Decrypted successfully:",
      plaintext.substring(0, 20) + "..."
    );
    return plaintext;
  } catch (error) {
    console.error("❌ Decryption error:", error.message);
    return "[Error: " + error.message + "]";
  }
}
