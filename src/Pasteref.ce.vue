<script setup>
import { ref, onMounted, onUnmounted, getCurrentInstance, defineProps, provide, nextTick, computed, watch } from "vue"
import { BCheckbox, BIcon, BTooltip, BButton, BField, BInput, BTabs, BTabItem, BModal } from "buefy"
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
import { getMinifiedUrl, resolveMinifiedUrl } from "./lib/urlUtils.js"
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
const minifiedQrCodeDataUrl = ref('')

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

// Handle copy minified QR code image
const handleCopyMinifiedQRCode = async () => {
  if (minifiedQrCodeDataUrl.value) {
    try {
      const response = await fetch(minifiedQrCodeDataUrl.value)
      const blob = await response.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])
      notify('Minified QR code copied to clipboard!', 'is-success')
    } catch (error) {
      console.error('Failed to copy minified QR code:', error)
      notify('Failed to copy minified QR code to clipboard', 'is-danger')
    }
  }
}

// Generate minified URL
const generateMinifiedUrl = async () => {
  const urlToMinify = props.baseUrl + store.encodedURL.split('~')[0]
  await getMinifiedUrl(props.minifyUrl, urlToMinify, (hash) => store.setMinifiedUrl(hash, store.password), notify)
}

// Handle copy minified URL
const handleCopyMinifiedUrl = async () => {
  const url = props.baseUrl + '#' + store.minifiedUrl
  await copyToClipboard(url)
  notify('Minified URL copied to clipboard!', 'is-success')
}

// Handle hash that starts with ~
const handleHashHash = async () => {
  const hash = window.location.hash.substring(1)

  // Extract the minified hash (remove the leading #)
  let minifiedHash = hash.substring(1)
  let passwordPart = ''

  // Check if the minified hash contains a password part (after ~)
  const hashParts = minifiedHash.split('~')
  if (hashParts.length > 1) {
    minifiedHash = hashParts[0]
    passwordPart = hashParts.slice(1).join('~') // In case there are multiple ~
  }

  try {
    notify('Resolving minified URL...', 'is-info')
    const resolvedPayload = await resolveMinifiedUrl(minifiedHash, props.minifyUrl, notify)

    // Reattach the password part if it exists
    const finalPayload = passwordPart ? `${resolvedPayload}~${passwordPart}` : resolvedPayload

    // Update the URL hash with the resolved payload
    window.location.hash = finalPayload
    // The handleHashChange will be triggered by the hashchange event
  } catch (error) {
    console.error('Error resolving minified URL:', error)
    notify('Could not resolve the minified URL. Please try again.', 'is-danger')
  }
}

// Handle hash change to load encrypted content
const handleHashChange = async () => {
  const hash = window.location.hash.substring(1)
  if (hash) {
    // Check if hash starts with #
    if (hash.startsWith('#')) {
      handleHashHash()
      return
    }

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
provide('generateMinifiedUrl', generateMinifiedUrl)

// Watch for includePasswordInUrl checkbox changes
watch(() => store.includePasswordInUrl, async () => {
  if (store.encodedURL && store.password) {
    // Get the base encrypted text (without password)
    const parts = store.encodedURL.split('~')
    const encryptedText = parts[0]

    // Update the URL based on checkbox state
    if (store.includePasswordInUrl) {
      // Add password to URL
      store.setEncodedURL(`${encryptedText}~${store.password}`)
    } else {
      // Remove password from URL, keep only encrypted text
      store.setEncodedURL(encryptedText)
    }
  }

  // Handle minified URL password
  if (store.minifiedUrl) {
    const minifiedParts = store.minifiedUrl.split('~')
    const baseMinifiedUrl = minifiedParts[0]

    if (store.includePasswordInUrl && store.password) {
      // Add password to minified URL
      store.setMinifiedUrl(baseMinifiedUrl, store.password)
    } else {
      // Remove password from minified URL
      store.setMinifiedUrl(baseMinifiedUrl)
    }

    // Regenerate QR code for minified URL
    if (store.minifiedUrl) {
      try {
        const minifiedFullUrl = props.baseUrl + '#' + store.minifiedUrl
        minifiedQrCodeDataUrl.value = await QRCode.toDataURL(minifiedFullUrl, {
          errorCorrectionLevel: 'H',
          type: 'image/png',
          quality: 0.95,
          margin: 1,
          width: 400
        })
      } catch (error) {
        console.error('Minified QR code generation error:', error)
      }
    }
  }
})

// Watch for minified URL changes and generate QR code
watch(() => store.minifiedUrl, async (newMinifiedUrl) => {
  if (newMinifiedUrl) {
    try {
      const minifiedFullUrl = props.baseUrl + '#' + newMinifiedUrl
      minifiedQrCodeDataUrl.value = await QRCode.toDataURL(minifiedFullUrl, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.95,
        margin: 1,
        width: 400
      })
    } catch (error) {
      console.error('Minified QR code generation error:', error)
    }
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
  <div class="pasteref" data-theme="light">

    
      <div class="box" v-if="store.minifiedUrl != ''">
        <article class="media">
          <div class="media-left">
            <figure class="image is-100x100">
              <img v-if="store.minifiedUrl" :src="minifiedQrCodeDataUrl" alt="QR Code"
                style="width: 100px; height: 100px; cursor: pointer;" @click="handleCopyMinifiedQRCode" title="Click to copy minified QR code" />
            </figure>
          </div>
          <div class="media-content">
            <div class="content">
              <b>{{ baseUrl }}#{{ store.minifiedUrl }}</b>
              <a href="#" @click.prevent="handleCopyMinifiedUrl" style="cursor: pointer; margin-left: 0.5rem;">
                <b-icon icon="content-copy" size="is-small"></b-icon>
              </a>
              <p>
                The shortened URL will last for 72 hours and will be disposed
                after the first visit, so you should not click it but rather copy
                it and paste on an email.
              </p>
            </div>
          </div>
        </article>
      </div>

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
        <b-button :expanded="isMobile()" type="is-primary" icon-left="content-copy" label="Copy long URL" :disabled="!store.encodedURL"
          @click="handleCopyUrl" />
      </p>
      <p class="control">
        <b-button type="is-primary" icon-right="qrcode" :disabled="!store.encodedURL" @click="handleOpenQRCodeModal" />
      </p>
      <p class="control">
        <b-button type="is-primary" icon-right="open-in-new" :disabled="!store.encodedURL"
          @click="handleOpenInNewTab" />
      </p>
    </b-field>

    <b-field>
      <b-tooltip :label="store.generateShortUrl ? 'A new short URL will be generated on paste action' : 'No short URL'"
        position="is-bottom">
        <b-checkbox v-model="store.generateShortUrl" type="is-primary">Generate short URL</b-checkbox>
      </b-tooltip>
      <b-tooltip
        :label="store.includePasswordInUrl ? 'Password will be included in URL' : 'Password will not be included in URL'"
        position="is-bottom">
        <b-checkbox v-model="store.includePasswordInUrl" type="is-warning">
          Include password in URL
        </b-checkbox>
      </b-tooltip>
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
          <img v-if="qrCodeDataUrl" :src="qrCodeDataUrl" alt="QR Code" style="max-width: 300px; margin: 0 auto; cursor: pointer;" @click="handleCopyQRCode" title="Click to copy QR code" />
          <p style="margin-top: 1rem; font-size: 0.875rem; color: #666;">
            Scan to share the pasted content (click image to copy)
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
