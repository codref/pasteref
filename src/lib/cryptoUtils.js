import * as bip39 from "bip39"

// Modern base64 encoding (replaces deprecated btoa)
export const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Generate a random short URL with up to 8 case-sensitive characters
export const generateShortUrl = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Generate mnemonic password locally
export const generateMnemonicPassword = () => {
  // Generate 128 bits of entropy (12 words)
  const mnemonic = bip39.generateMnemonic(128)

  // Derive a password from the mnemonic
  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const passwordBytes = seed.slice(0, 32)

  // Convert to base64 for a readable password
  const password = arrayBufferToBase64(passwordBytes).substring(0, 24)

  return { password, mnemonic }
}

// Derive AES key from password using PBKDF2
export const deriveKey = async (password, salt) => {
  const encoder = new TextEncoder()

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  )

  const key = await crypto.subtle.deriveKey(
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
  )

  return key
}

// Encrypt the text (with compression)
export const encryptText = async (plaintext, password) => {
  const encoder = new TextEncoder()

  // Step 1: Compress the plaintext using gzip
  const stream = new Blob([plaintext]).stream()
  const compressedStream = stream.pipeThrough(new CompressionStream("gzip"))
  const compressedBlob = await new Response(compressedStream).blob()
  const compressed = new Uint8Array(await compressedBlob.arrayBuffer())

  // Step 2: Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // Step 3: Derive key from password
  const key = await deriveKey(password, salt)

  // Step 4: Encrypt the compressed data
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    compressed
  )

  // Step 5: Combine salt + iv + ciphertext
  const combined = new Uint8Array(
    salt.length + iv.length + encrypted.byteLength
  )
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(encrypted), salt.length + iv.length)

  // Step 6: Convert to base64 using modern approach
  return arrayBufferToBase64(combined)
}

// Decrypt the text (with decompression)
export const decryptText = async (encryptedBase64, password) => {
  try {
    // Step 1: Convert base64 to ArrayBuffer
    const binaryString = atob(encryptedBase64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Step 2: Extract salt, IV, and ciphertext
    const salt = bytes.slice(0, 16)
    const iv = bytes.slice(16, 28)
    const ciphertext = bytes.slice(28)

    // Step 3: Derive key from password
    const key = await deriveKey(password, salt)

    // Step 4: Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    )

    // Step 5: Decompress the data using gzip
    const stream = new Blob([decrypted]).stream()
    const decompressedStream = stream.pipeThrough(new DecompressionStream("gzip"))
    const decompressedBlob = await new Response(decompressedStream).blob()
    const plaintext = await decompressedBlob.text()

    return plaintext
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Decryption failed. Please check your password and encrypted text.')
  }
}
