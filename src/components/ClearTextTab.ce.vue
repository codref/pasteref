<script setup>
import { BButton, BField, BInput, BUpload, BTooltip, BIcon, BCheckboxButton } from "buefy"
import { usePastebinStore } from "../stores/pastebin.js"
import { generateMnemonicPassword, encryptText } from "../lib/cryptoUtils.js"
import { compressAndEncode } from "../lib/compressionUtils.js"
import { getFieldSize } from "../lib/fieldUtils.js"
import { computed, inject } from "vue"

const store = usePastebinStore()
const notify = inject('notify')
const copyUrl = inject('copyUrl')

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
</script>

<template>
  <b-field label="Enter your paste content" :message="fieldMessage">
    <b-input class="monospace-textarea" v-model="store.pasteContent" type="textarea" placeholder="Type your text here..." :rows="12" />
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
