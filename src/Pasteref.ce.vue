<script setup>
import { ref, onMounted, getCurrentInstance } from "vue"
import {
  BButton,
  BField,
  BInput,
  BTabs,
  BTabItem,
  BIcon,
  BTooltip,
} from "buefy"
import PasswordManager from "./components/PasswordManager.ce.vue"
import { Buffer } from "buffer"
import buefyCss from "./styles/buefy-custom.scss?inline"

// Make Buffer available globally for bip39
window.Buffer = Buffer

const pasteContent = ref("")
const password = ref("")
const passwordMnemonic = ref("")
const encryptedText = ref("")



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

// Password generation and management are handled by the PasswordManager component
</script>

<template>
  <div class="pasteref">
    <PasswordManager v-model:password="password" v-model:passwordMnemonic="passwordMnemonic" />
    

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
