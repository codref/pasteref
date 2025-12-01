<script setup>
import { ref, onMounted, getCurrentInstance } from "vue"
import {
  BButton,
  BField,
  BInput,
  BTabs,
  BTabItem,
  BCollapse,
  BIcon,
  BTooltip,
} from "buefy"
import { Buffer } from "buffer"
import * as bip39 from "bip39"
import buefyCss from "./styles/buefy-custom.scss?inline"

// Make Buffer available globally for bip39
window.Buffer = Buffer

const pasteContent = ref("")
const password = ref("")
const passwordMnemonic = ref("")
const encryptedText = ref("")

// Generate a random password
const generatePassword = (length = 16) => {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*-_=+"
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)

  return Array.from(randomValues)
    .map((value) => charset[value % charset.length])
    .join("")
}

// Generate BIP39 mnemonic from password
const passwordToMnemonic = (password) => {
  // Hash the password to get consistent bytes
  const encoder = new TextEncoder()
  const passwordBytes = encoder.encode(password)

  // Create a hash to get 128 bits (12 words) or 256 bits (24 words)
  const hashBuffer = crypto.subtle.digest("SHA-256", passwordBytes)

  return hashBuffer.then((hash) => {
    // Use first 128 bits for 12-word mnemonic
    const entropy = new Uint8Array(hash).slice(0, 16)
    return bip39.entropyToMnemonic(
      Array.from(entropy)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    )
  })
}

// Generate mnemonic from entropy (for new passwords)
const generateMnemonicPassword = () => {
  // Generate 128 bits of entropy (12 words)
  const mnemonic = bip39.generateMnemonic(128)

  // Derive a password from the mnemonic
  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const passwordBytes = seed.slice(0, 32)

  // Convert to base64 for a readable password
  const password = arrayBufferToBase64(passwordBytes).substring(0, 24)

  return { password, mnemonic }
}

// Modern base64 encoding (replaces deprecated btoa)
const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Derive AES key from password using PBKDF2
const deriveKey = async (password, salt) => {
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
const encryptText = async (plaintext, password) => {
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

// Helper function to set attributes on elements
const setAttributes = (element, attributes) => {
  attributes.forEach(({ name, value }) => {
    element.setAttribute(name, value)
  })
}

// Generate password on component load
onMounted(() => {
  const { password: newPassword, mnemonic } = generateMnemonicPassword()
  password.value = newPassword
  passwordMnemonic.value = mnemonic

  // Inject Material Design Icons stylesheet
  const fontImport = document.createElement("link")
  setAttributes(fontImport, [
    {
      name: "href",
      value:
        "https://cdn.jsdelivr.net/npm/@mdi/font@7.3.67/css/materialdesignicons.min.css",
    },
    { name: "rel", value: "stylesheet" },
  ])
  document.head.appendChild(fontImport)

  // Inject Buefy CSS into Shadow DOM for custom element
  const instance = getCurrentInstance()
  const shadowRoot = instance?.proxy?.$el?.getRootNode()
  if (shadowRoot && shadowRoot instanceof ShadowRoot) {
    const style = document.createElement("style")
    style.textContent = buefyCss
    shadowRoot.prepend(style)
  }
})

const handleSubmit = async () => {
  if (!pasteContent.value) {
    alert("Please enter some content to encrypt")
    return
  }

  try {
    encryptedText.value = await encryptText(pasteContent.value, password.value)
    console.log("Encrypted successfully")
  } catch (error) {
    console.error("Encryption error:", error)
    alert("Encryption failed")
  }
}

const handleClear = () => {
  pasteContent.value = ""
  encryptedText.value = ""
}

const handleGenerateNewPassword = () => {
  const { password: newPassword, mnemonic } = generateMnemonicPassword()
  password.value = newPassword
  passwordMnemonic.value = mnemonic
}
</script>

<template>
  <div class="pasteref">
    <b-collapse class="card" animation="slide" aria-id="password-panel">
      <template #trigger="props">
        <div class="card-header" role="button" aria-controls="password-panel">
          <p class="card-header-title">
            <b-tooltip
              position="is-right"
              label="Key loaded, you can now encrypt!"
            >
              <b-icon icon="check-circle" type="is-success"></b-icon>
            </b-tooltip>
            Password Management
          </p>
          <a class="card-header-icon">
            <b-icon :icon="props.open ? 'menu-down' : 'menu-up'"> </b-icon>
          </a>
        </div>
      </template>

      <div class="card-content">
        <b-field label="Password" label-position="on-border" grouped>
          <b-input
            v-model="password"
            type="password"
            expanded
            password-reveal
            readonly
          ></b-input>
          <p class="control">
            <b-button @click="handleGenerateNewPassword" icon-left="refresh">
              Regenerate
            </b-button>
          </p>
        </b-field>

        <b-field
          label="Password Mnemonic (BIP39 - 12 words)"
          label-position="on-border"
        >
          <b-input
            v-model="passwordMnemonic"
            type="password"
            password-reveal
            readonly
          ></b-input>
        </b-field>
      </div>
    </b-collapse>

    <b-tabs>
      <b-tab-item label="Plain text">
        <b-field label="Enter your paste content">
          <b-input
            v-model="pasteContent"
            type="textarea"
            placeholder="Type your text here..."
            :rows="10"
          />
        </b-field>

        <div class="is-expanded">
          <b-upload v-model="loadedPlainFile" @input="onLoadPlainFileClick">
            <b-tooltip
              label="The loaded file is converted to a UTF-8 message"
              position="is-right"
            >
              <a :class="`button is-pulled-left ${loading ? 'is-loading' : ''}`"
                >Load plain message from file</a
              >
            </b-tooltip>
          </b-upload>
        </div>
        <div class="buttons" position="is-left">
          <b-button @click="handleSubmit" type="is-primary"> Encrypt </b-button>
          <b-button @click="handleClear">Clear</b-button>
        </div>
      </b-tab-item>

      <b-tab-item label="Encrypted">
        <b-field
          v-if="encryptedText"
          label="Encrypted & Compressed Text (Base64)"
        >
          <b-input v-model="encryptedText" type="textarea" :rows="6" readonly />
        </b-field>
      </b-tab-item>
    </b-tabs>
  </div>
</template>

<style lang="scss">
@import url("https://cdn.jsdelivr.net/npm/@mdi/font@7.3.67/css/materialdesignicons.min.css");

.pasteref {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-family: system-ui, -apple-system, sans-serif;
}

.title {
  text-align: center;
  margin-bottom: 2rem;
}

.buttons {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.help-text {
  margin-top: 2rem;
  text-align: center;
  font-size: 0.875rem;
  color: #666;
}

code {
  background-color: #f5f5f5;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: monospace;
}
</style>
