<script setup>
import { ref, onMounted, onUnmounted, getCurrentInstance, defineProps, provide, nextTick } from "vue"
import { BButton, BField, BInput, BTabs, BTabItem, BCheckboxButton, BIcon} from "buefy"
import PasswordManager from "./components/PasswordManager.ce.vue"
import ClearTextTab from "./components/ClearTextTab.ce.vue"
import EncryptedTextTab from "./components/EncryptedTextTab.ce.vue"
import { usePastebinStore } from "./stores/pastebin.js"
import { Buffer } from "buffer"
import buefyCss from "./styles/buefy-custom.scss?inline"
import { setAttributes } from "./lib/domUtils.js"
import { copyToClipboard } from "./lib/clipboardUtils.js"

const props = defineProps({
  baseUrl: {
    type: String,
    default: 'cdrf.at/'
  }
})

// Make Buffer available globally for bip39
window.Buffer = Buffer

// Use Pinia store
const store = usePastebinStore()

// Add password to URL checkbox state
const includePasswordInUrl = ref(false)

// Notification reactive variables
const notifyActive = ref(false)
const notifyMessage = ref("")
const notifyType = ref("is-success")
const notifyDuration = ref(2000)
let notifyTimeout = null

// Notification method
const notify = (message, type = "is-success", duration = 2000) => {
  // Clear any existing timeout
  if (notifyTimeout) {
    clearTimeout(notifyTimeout)
  }
  
  notifyDuration.value = duration
  notifyType.value = type
  notifyMessage.value = message
  notifyActive.value = true
  
  // Auto-close after duration
  notifyTimeout = setTimeout(() => {
    notifyActive.value = false
  }, duration)
}

// Handle copy URL
const handleCopyUrl = async () => {
  if (store.encodedURL) {
    await copyToClipboard(props.baseUrl + store.encodedURL)
    notify('URL copied to clipboard!', 'is-success')
  }
}

// Handle hash change to load encrypted content
const handleHashChange = async () => {
  const hash = window.location.hash.substring(1)
  if (hash) {
    // Check if password is included in the URL (separated by ~)
    const parts = hash.split('~')
    const encryptedText = parts[0]
    const password = parts[1] || ''
    
    store.setEncodedURL(hash)
    store.setEncryptedText(encryptedText)
    if (password) {
      store.setPassword(password)
      store.setIncludePasswordInUrl(true)
    }
    await nextTick()
    store.setActiveTab(1) // Switch to Encrypted tab
  }
}

// Provide notify and copyUrl to child components
provide('notify', notify)
provide('copyUrl', handleCopyUrl)

// Generate password on component load
onMounted(async () => {

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

  // Load encoded URL from hash if present and listen for changes
  await handleHashChange()
  window.addEventListener('hashchange', handleHashChange)
})

onUnmounted(() => {
  // Clean up event listener
  window.removeEventListener('hashchange', handleHashChange)
})



// Password generation and management are handled by the PasswordManager component
</script>

<template>
  <div class="pasteref">

    <b-field :message="store.hasPasswordInUrl ? 'Password is included in URL' : ''">
      <p class="control">
        <span class="button is-static">{{ baseUrl }}</span>
      </p>
      <b-input :value="store.encodedURL" placeholder="Your encoded URL" expanded readonly></b-input>
      <p class="control">
        <b-button type="is-primary" label="Copy long URL" :disabled="!store.encodedURL" @click="handleCopyUrl" />
      </p>
    </b-field>

    <PasswordManager />


    <b-tabs :animated="false" v-model="store.activeTab">
      <b-tab-item label="Clear text">
        <ClearTextTab />

      </b-tab-item>

      <b-tab-item label="Encrypted">
        <EncryptedTextTab />
      </b-tab-item>
    </b-tabs>

    <div v-if="notifyActive" :class="['notification', notifyType]" class="custom-notification">
      <button class="delete" @click="notifyActive = false"></button>
      <div class="custom-notification-content" v-html="notifyMessage">
      </div>
    </div>
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

.custom-notification {
  position: fixed;
  top: 2rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  max-width: 400px;
}
.custom-notification-content {
  word-wrap: break-word;
  margin: 0 1.5rem 0 0;
}
</style>
