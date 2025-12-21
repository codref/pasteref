<script setup>
import { inject, computed, ref } from "vue"
import { BField, BInput, BButton, BUpload, BTooltip } from "buefy"
import { usePastebinStore } from "../stores/pastebin.js"
import { decryptText } from "../lib/cryptoUtils.js"
import { getFieldSize } from "../lib/fieldUtils.js"
import { downloadFileFromBase64, downloadPlainText } from "../lib/fileDownloadUtils.js"

const store = usePastebinStore()
const notify = inject('notify')
const fileInput = ref(null)

// Computed property for field message showing content length and bytes
const fieldMessage = computed(() => getFieldSize(store.encryptedText))

const handleDecrypt = async () => {
  if (!store.encryptedText || !store.password) {
    notify('Please provide both encrypted text and password', 'is-warning')
    return
  }

  store.setLoading(true)
  store.setDecryptError(false)
  try {
    const decryptedText = await decryptText(store.encryptedText, store.password)
    store.setPasteContent(decryptedText)
    store.setActiveTab(0) // Switch to Plain Text tab
    notify('Decryption successful!', 'is-success')
  } catch (error) {
    console.error('Decryption error:', error)
    store.setDecryptError(true)
    notify(error.message || 'Decryption failed. Please check your password and encrypted text.', 'is-danger')
  } finally {
    store.setLoading(false)
  }
}

const handleClear = () => {
  store.setEncryptedText('')
}

const handleFileUpload = () => {
  const file = fileInput.value.files[0]
  if (!file) return

  if (!file.type.startsWith('text/')) {
    notify("Only plain text files are allowed.", "is-danger")
    return
  }

  const loadedFileSizeMb = file.size / 1024 ** 2
  if (loadedFileSizeMb > 2) {
    notify("The uploaded file exceeds the limit of 2MB.", "is-danger")
    return
  }

  store.setLoading(true)
  const reader = new FileReader()
  reader.onload = () => {
    store.setEncryptedText(reader.result)
    store.setLoading(false)
  }
  reader.onerror = () => {
    notify("Error loading file", "is-danger")
    store.setLoading(false)
  }
  reader.readAsText(file)
}

const handleFileDownload = () => {
  downloadPlainText(store.encryptedText, notify)
}

defineExpose({ handleDecrypt })
</script>

<template>
  <b-field>
    <input type="file" ref="fileInput" @change="handleFileUpload" style="display: none">
    <p class="control">
      <b-tooltip label="Load plain text file" position="is-bottom">
        <a :class="`button is-pulled-left ${store.loading ? 'is-loading' : ''}`" @click="fileInput.click()">Load
          file</a>
      </b-tooltip>
    </p>
    <p class="control">
      <b-tooltip label="Download as text file" position="is-bottom">
        <b-button @click="handleFileDownload" icon-left="download"></b-button>
      </b-tooltip>
    </p>
    <p class="control">
      <b-tooltip label="Clear the text area" position="is-bottom">
        <b-button @click="handleClear" icon-left="close"></b-button>
      </b-tooltip>
    </p>
  </b-field>

  <b-field label="Encrypted & Compressed Text (Base64)" :message="fieldMessage">
    <b-input v-model="store.encryptedText" type="textarea" :rows="6" class="monospace-textarea" />
  </b-field>
  <div class="is-expanded">
    <div class="buttons is-pulled-right">
      <b-button @click="handleDecrypt" type="is-primary" :disabled="!store.encryptedText"> Decrypt </b-button>
    </div>
  </div>
</template>