<script setup>
import { inject } from "vue"
import { BField, BInput, BButton, BUpload, BTooltip } from "buefy"
import { usePastebinStore } from "../stores/pastebin.js"
import { decryptText } from "../lib/cryptoUtils.js"

const store = usePastebinStore()
const notify = inject('notify')

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
</script>

<template>
  <b-field label="Encrypted & Compressed Text (Base64)">
    <b-input v-model="store.encryptedText" type="textarea" :rows="6" />
  </b-field>
  <div class="is-expanded">
    <b-upload :value="store.loadedPlainFile" @input="(file) => { store.setLoadedPlainFile(file); store.onLoadPlainFileClick(file); }">
      <b-tooltip label="The loaded file is converted to a UTF-8 message" position="is-right">
        <a :class="`button is-pulled-left ${store.loading ? 'is-loading' : ''}`">Load plain message from file</a>
      </b-tooltip>
    </b-upload>
    <div class="buttons is-pulled-right" position="is-right">
      <b-button @click="handleDecrypt" type="is-primary" :disabled="!store.encryptedText"> Decrypt </b-button>
    </div>
  </div>  
</template>