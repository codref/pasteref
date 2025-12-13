<script setup>
import { BButton, BField, BInput, BUpload, BTooltip, BIcon, BCheckboxButton } from "buefy"
import { usePastebinStore } from "../stores/pastebin.js"
import { generateMnemonicPassword, encryptText } from "../lib/cryptoUtils.js"
import { compressAndEncode } from "../lib/compressionUtils.js"
import { getFieldSize } from "../lib/fieldUtils.js"
import { computed, inject, onMounted, ref } from "vue"
import Prism from "prismjs"
import "prismjs/themes/prism.css"
import "prismjs/components/prism-markdown.js"

const store = usePastebinStore()
const notify = inject('notify')
const copyUrl = inject('copyUrl')
const textareaRef = ref(null)
const highlightedCode = ref('')

// Computed property for field message showing content length and bytes
const fieldMessage = computed(() => getFieldSize(store.pasteContent))

// Update highlighted code when paste content changes
const updateHighlight = () => {
  highlightedCode.value = Prism.highlight(
    store.pasteContent,
    Prism.languages.markdown,
    'markdown'
  )
}

onMounted(() => {
  updateHighlight()
})

const handleContentChange = () => {
  updateHighlight()
}

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
    <div class="syntax-highlighter-container">
      <b-input 
        ref="textareaRef"
        v-model="store.pasteContent" 
        @input="handleContentChange"
        type="textarea" 
        placeholder="Type your text here..." 
        :rows="12" 
      />
      <pre class="syntax-highlighter-overlay"><code v-html="highlightedCode" class="language-markdown"></code></pre>
    </div>
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

<style lang="scss" scoped>
.syntax-highlighter-container {
  position: relative;
  display: block;
  width: 100%;
}

::v-deep .b-input {
  position: relative;
  z-index: 2;

  textarea {
    background-color: rgba(245, 245, 245, 0.9) !important;
    font-family: 'Courier New', monospace !important;
    font-size: 1rem !important;
  }
}

.syntax-highlighter-overlay {
  position: absolute;
  top: 0;
  left: 0;
  margin: 0;
  padding: 0.625rem;
  border: 1px solid #dbdbdb;
  border-radius: 4px;
  background-color: #f5f5f5;
  font-family: 'Courier New', monospace;
  font-size: 1rem;
  line-height: 1.5;
  overflow: hidden;
  pointer-events: none;
  word-wrap: break-word;
  white-space: pre-wrap;
  z-index: 1;
  width: 100%;
  box-sizing: border-box;

  code {
    color: inherit;
    background: none;
    padding: 0;
    font-family: 'Courier New', monospace;
    display: block;
  }
}
</style>
