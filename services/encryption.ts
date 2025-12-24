export const encryption = {
  // Generate a key from a password using PBKDF2
  getKey: async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  },

  // Encrypt data
  encrypt: async (data: string, password: string): Promise<{ ciphertext: string; salt: string; iv: string }> => {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await encryption.getKey(password, salt);
    const enc = new TextEncoder();

    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      enc.encode(data)
    );

    return {
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      salt: btoa(String.fromCharCode(...salt)),
      iv: btoa(String.fromCharCode(...iv)),
    };
  },

  // Decrypt data
  decrypt: async (encryptedData: { ciphertext: string; salt: string; iv: string }, password: string): Promise<string> => {
    const salt = Uint8Array.from(atob(encryptedData.salt), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(encryptedData.iv), c => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(encryptedData.ciphertext), c => c.charCodeAt(0));
    
    const key = await encryption.getKey(password, salt);

    try {
      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: iv,
        },
        key,
        ciphertext
      );
      
      const dec = new TextDecoder();
      return dec.decode(decrypted);
    } catch (e) {
      throw new Error("Decryption failed. Invalid password or corrupted data.");
    }
  },

  // Compute SHA-256 checksum
  computeChecksum: async (data: string): Promise<string> => {
    const enc = new TextEncoder();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', enc.encode(data));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
};
