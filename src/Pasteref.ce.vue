<script setup>
import { ref, onMounted, onUnmounted, getCurrentInstance, defineProps, provide, nextTick, computed, watch } from "vue"
import { BCheckboxButton, BIcon, BTooltip, BNotification, BButton, BField, BInput, BTabs, BTabItem, BModal } from "buefy"
import QRCode from 'qrcode'
import PasswordManager from "./components/PasswordManager.ce.vue"
import ClearTextTab from "./components/ClearTextTab.ce.vue"
import EncryptedTextTab from "./components/EncryptedTextTab.ce.vue"
import { usePastebinStore } from "./stores/pastebin.js"
import { Buffer } from "buffer"
import buefyCss from "./styles/buefy-custom.scss?inline"
import { setAttributes } from "./lib/domUtils.js"
import { copyToClipboard } from "./lib/clipboardUtils.js"
import { decodeAndDecompress } from "./lib/compressionUtils.js"
import { isMobile } from "./lib/mobileUtils.js"
import { getMinifiedUrl } from "./lib/urlUtils.js"
import axios from 'axios'

const props = defineProps({
  baseUrl: {
    type: String,
    default: 'cdrf.at/'
  },
  minifyUrl: {
    type: String,
    default: "https://api.codref.org/function/terminal/v1/url/minify"
  }
})

// Make Buffer available globally for bip39
window.Buffer = Buffer

// Use Pinia store
const store = usePastebinStore()

// Add ref for EncryptedTextTab
const encryptedTab = ref()

// Add password to URL checkbox state
const includePasswordInUrl = ref(false)

// QR code modal state
const isQRCodeModalOpen = ref(false)
const qrCodeDataUrl = ref('')

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

// Handle open in new tab
const handleOpenInNewTab = () => {
  if (store.encodedURL) {
    window.open(props.baseUrl + store.encodedURL, '_blank')
  }
}

// Handle open QR code modal
const handleOpenQRCodeModal = async () => {
  if (store.encodedURL) {
    try {
      const fullUrl = props.baseUrl + store.encodedURL
      qrCodeDataUrl.value = await QRCode.toDataURL(fullUrl, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.95,
        margin: 1,
        width: 400
      })
      isQRCodeModalOpen.value = true
    } catch (error) {
      console.error('QR code generation error:', error)
      if (error.message && error.message.includes('too big')) {
        notify('The URL is too long for a QR code. Please copy the URL instead.', 'is-warning')
      } else {
        notify('Failed to generate QR code', 'is-danger')
      }
    }
  }
}

// Handle copy QR code image
const handleCopyQRCode = async () => {
  if (qrCodeDataUrl.value) {
    try {
      const response = await fetch(qrCodeDataUrl.value)
      const blob = await response.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])
      notify('QR code copied to clipboard!', 'is-success')
    } catch (error) {
      console.error('Failed to copy QR code:', error)
      notify('Failed to copy QR code to clipboard', 'is-danger')
    }
  }
}

// Generate minified URL
const generateMinifiedUrl = async () => {
  const urlToMinify = props.baseUrl + store.encodedURL.split('~')[0]
  await getMinifiedUrl(props.minifyUrl, urlToMinify, store.setMinifiedUrl, notify)
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
    if (store.encryptedText && store.password) {
      await nextTick()
      encryptedTab.value?.handleDecrypt()
    } else if (store.encryptedText && !store.password) {
      try {
        const decompressedText = await decodeAndDecompress(store.encryptedText)
        store.setPasteContent(decompressedText)
        store.setActiveTab(0) // Switch to Plain Text tab
        notify('Decompression successful!', 'is-success')
      } catch (error) {
        console.error('Decompression error:', error)
        notify(error.message || 'Decompression failed. Please check the compressed text.', 'is-danger')
      }
    }
  }
}

// Provide notify and copyUrl to child components
provide('notify', notify)
provide('copyUrl', handleCopyUrl)

// Watch for changes in encodedURL and generate minified URL if enabled
watch(() => store.encodedURL, async (newUrl) => {
  if (newUrl && store.generateShortUrl) {
    await generateMinifiedUrl()
  }
})

// Watch for generateShortUrl toggle and generate if enabled and URL exists
watch(() => store.generateShortUrl, async (enabled) => {
  if (enabled && store.encodedURL) {
    await generateMinifiedUrl()
  }
})

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

    <b-notification v-if="store.minifiedUrl != ''" type="is-info is-light" has-icon icon="ghost" :closable="false">
      <div>
        <b>{{ store.minifiedUrl }}</b>
      </div>
      <p>
        The shortened URL will last for 72 hours and will be disposed
        after the first visit, so you should not click it but rather copy
        it and paste on an email.
      </p>
    </b-notification>

    <b-field v-if="isMobile()">
      <p class="control">
        <span class="button is-static">{{ baseUrl }}</span>
      </p>
      <b-input :value="store.encodedURL" placeholder="Your encoded URL" expanded readonly></b-input>
    </b-field>

    <b-field :message="store.hasPasswordInUrl ? 'Password is included in URL' : ''">
      <p class="control" v-if="!isMobile()">
        <span class="button is-static">{{ baseUrl }}</span>
      </p>
      <b-input v-if="!isMobile()" :value="store.encodedURL" placeholder="Your encoded URL" expanded readonly></b-input>
      <p class="control" :class="{ 'is-expanded': isMobile() }">
        <b-button :expanded="isMobile()" type="is-primary" label="Copy long URL" :disabled="!store.encodedURL"
          @click="handleCopyUrl" />
      </p>
      <p class="control">
        <b-button type="is-primary" icon-right="qrcode" :disabled="!store.encodedURL" @click="handleOpenQRCodeModal" />
      </p>
      <p class="control">
        <b-button type="is-primary" icon-right="open-in-new" :disabled="!store.encodedURL"
          @click="handleOpenInNewTab" />
      </p>
      <p class="control">
        <b-tooltip :label="store.generateShortUrl ? 'A new short URL will be generated' : 'No short URL'"
          position="is-left">
          <b-checkbox-button v-model="store.generateShortUrl">
            <b-icon icon="shield-link-variant" class="checkbox-button-icon"></b-icon>
          </b-checkbox-button>
        </b-tooltip>
      </p>
    </b-field>

    <PasswordManager />


    <b-tabs :animated="false" v-model="store.activeTab">
      <b-tab-item label="Clear text">
        <ClearTextTab />

      </b-tab-item>

      <b-tab-item label="Encrypted">
        <EncryptedTextTab ref="encryptedTab" />
      </b-tab-item>
    </b-tabs>

    <div v-if="notifyActive" :class="['notification', notifyType]" class="custom-notification">
      <button class="delete" @click="notifyActive = false"></button>
      <div class="custom-notification-content" v-html="notifyMessage">
      </div>
    </div>

    <b-modal v-model="isQRCodeModalOpen" has-modal-card>
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Share URL as QR Code</p>
        </header>
        <section class="modal-card-body has-text-centered">
          <img v-if="qrCodeDataUrl" :src="qrCodeDataUrl" alt="QR Code" style="max-width: 300px; margin: 0 auto;" />
          <p style="margin-top: 1rem; font-size: 0.875rem; color: #666;">
            Scan to share the pasted content
          </p>
        </section>
        <footer class="modal-card-foot">
          <div class="buttons is-pulled-right" position="is-right">
            <b-button @click="isQRCodeModalOpen = false">Close</b-button>
            <b-button @click="handleCopyQRCode" type="is-info" icon-left="content-copy">Copy QR Code</b-button>
          </div>
        </footer>
      </div>
    </b-modal>
  </div>
</template>

<style lang="scss">
@import url("https://cdn.jsdelivr.net/npm/@mdi/font@7.3.67/css/materialdesignicons.min.css");

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
