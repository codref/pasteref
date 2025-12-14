<script setup>
import { BButton, BField, BInput, BTooltip, BIcon, BCheckboxButton } from "buefy"
import { usePastebinStore } from "../stores/pastebin.js"
import { generateMnemonicPassword, encryptText } from "../lib/cryptoUtils.js"
import { compressAndEncode } from "../lib/compressionUtils.js"
import { getFieldSize } from "../lib/fieldUtils.js"
import { computed, inject, ref } from "vue"

const store = usePastebinStore()
const notify = inject('notify')
const copyUrl = inject('copyUrl')
const textareaRef = ref(null)
const fileInput = ref(null)

// Computed property for field message showing content length and bytes
const fieldMessage = computed(() => getFieldSize(store.pasteContent))

const handleEncrypt = async () => {
  if (!store.pasteContent) {
    alert("Please enter some content to encrypt")
    return
  }

  // Ensure password exists
  if (!store.password) {
    const { password: newPassword, mnemonic } = generateMnemonicPassword()
    store.setPassword(newPassword)
    store.setPasswordMnemonic(mnemonic)
  }

  try {
    const encrypted = await encryptText(store.pasteContent, store.password)
    store.setEncryptedText(encrypted)
    
    // Include password in URL if checkbox is checked
    const encodedUrl = store.includePasswordInUrl ? `${encrypted}~${store.password}` : encrypted
    store.setEncodedURL(encodedUrl)

    await copyUrl()
    store.setActiveTab(1) // Switch to Encrypted tab
    notify('Content encrypted successfully!<br>URL copied to clipboard!', 'is-success')
  } catch (error) {
    console.error("Encryption error:", error)
    notify('Encryption failed', 'is-danger')
  }
}

const handlePasteClear = async () => {
  if (!store.pasteContent) {
    alert("Please enter some content to compress")
    return
  }

  try {
    const compressed = await compressAndEncode(store.pasteContent)
    store.setEncodedURL(compressed)

    await copyUrl()
    notify('Content encrypted successfully!<br>URL copied to clipboard!', 'is-success')    
  } catch (error) {
    console.error("Compression error:", error)
    alert("Compression failed")
  }
}

const handleFileUpload = () => {
  const file = fileInput.value.files[0]
  if (!file) return

  const loadedFileSizeMb = file.size / 1024 ** 2
  if (loadedFileSizeMb > 2) {
    notify("The uploaded file exceeds the limit of 2MB.", "is-danger")
    return
  }

  store.setLoading(true)
  const reader = new FileReader()
  reader.onload = () => {
    store.setPasteContent(reader.result)
    store.setLoading(false)
  }
  reader.onerror = () => {
    notify("Error loading file", "is-danger")
    store.setLoading(false)
  }
  reader.readAsText(file)
}
</script>

<template>
  <b-field label="Enter your paste content" :message="fieldMessage">
    <b-input
      ref="textareaRef"
      v-model="store.pasteContent"
      type="textarea"
      placeholder="Type your text here..."
      :rows="12"
    />
  </b-field>

  <div class="is-expanded">
    <div class="buttons is-pulled-left" position="is-left">
    <input type="file" ref="fileInput" @change="handleFileUpload" style="display: none">
    <b-tooltip label="The loaded file is converted to a UTF-8 message" position="is-right">
      <a :class="`button is-pulled-left ${store.loading ? 'is-loading' : ''}`" @click="fileInput.click()">Load plain message from file</a>
    </b-tooltip>
    </div>
    <div class="buttons is-pulled-right" position="is-right">
      <b-button @click="handlePasteClear" :disabled="!store.pasteContent">Paste clear</b-button>
      <b-button @click="handleEncrypt" type="is-primary" :disabled="!store.pasteContent"> Paste encrypted
      </b-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
</style>
