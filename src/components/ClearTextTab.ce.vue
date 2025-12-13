<script setup>
import { BButton, BField, BInput, BUpload, BTooltip, BIcon, BCheckboxButton } from "buefy"
import { usePastebinStore } from "../stores/pastebin.js"
import { generateMnemonicPassword, encryptText } from "../lib/cryptoUtils.js"
import { compressAndEncode } from "../lib/compressionUtils.js"
import { computed, inject } from "vue"

const store = usePastebinStore()
const notify = inject('notify')
const copyUrl = inject('copyUrl')

// Computed property for field message showing content length and bytes
const fieldMessage = computed(() => {
  if (!store.pasteContent) return ""
  const charCount = store.pasteContent.length
  const byteCount = new TextEncoder().encode(store.pasteContent).length

  // Format bytes with appropriate unit
  let formattedSize
  if (byteCount < 1024) {
    formattedSize = `${byteCount} B`
  } else if (byteCount < 1024 * 1024) {
    formattedSize = `${(byteCount / 1024).toFixed(1)} KB`
  }

  return `${charCount} characters (${formattedSize})`
})

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
</script>

<template>
  <b-field label="Enter your paste content" :message="fieldMessage">
    <b-input v-model="store.pasteContent" type="textarea" placeholder="Type your text here..." :rows="10" />
  </b-field>

  <div class="is-expanded">
    <div class="buttons is-pulled-left" position="is-left">
    <b-upload :value="store.loadedPlainFile"
      @input="(file) => { store.setLoadedPlainFile(file); store.onLoadPlainFileClick(file); }">
      <b-tooltip label="The loaded file is converted to a UTF-8 message" position="is-right">
        <a :class="`button is-pulled-left ${store.loading ? 'is-loading' : ''}`">Load plain message from file</a>
      </b-tooltip>
    </b-upload>
    </div>
    <div class="buttons is-pulled-right" position="is-right">
      <b-button @click="handlePasteClear" :disabled="!store.pasteContent">Paste clear</b-button>
      <b-button @click="handleEncrypt" type="is-primary" :disabled="!store.pasteContent"> Paste encrypted
      </b-button>
    </div>
  </div>
</template>

<style lang="scss">
</style>
