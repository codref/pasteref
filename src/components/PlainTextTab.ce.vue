<script setup>
import { BButton, BField, BInput, BUpload, BTooltip } from "buefy"
import { usePastebinStore } from "../stores/pastebin.js"
import { generateMnemonicPassword, encryptText } from "../lib/cryptoUtils.js"

const store = usePastebinStore()

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
    console.log("Encrypted successfully:", encrypted)
    console.log("Store encryptedText:", store.encryptedText)
    store.setActiveTab(1)
  } catch (error) {
    console.error("Encryption error:", error)
    alert("Encryption failed")
  }
}

const handleClear = () => {
  store.clearAll()
}
</script>

<template>
  <b-field label="Enter your paste content">
    <b-input v-model="store.pasteContent" type="textarea" placeholder="Type your text here..." :rows="10" />
  </b-field>

  <div class="is-expanded">
    <b-upload :value="store.loadedPlainFile" @input="(file) => { store.setLoadedPlainFile(file); store.onLoadPlainFileClick(file); }">
      <b-tooltip label="The loaded file is converted to a UTF-8 message" position="is-right">
        <a :class="`button is-pulled-left ${store.loading ? 'is-loading' : ''}`">Load plain message from file</a>
      </b-tooltip>
    </b-upload>
    <div class="buttons is-pulled-right" position="is-right">
      <b-button @click="handleEncrypt" type="is-primary"> Encrypt </b-button>
      <b-button @click="handleClear">Clear</b-button>
    </div>
  </div>
</template>