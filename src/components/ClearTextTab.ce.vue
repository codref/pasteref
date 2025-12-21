<script setup>
import { BButton, BField, BInput, BTooltip, BIcon, BCheckboxButton } from "buefy"
import { usePastebinStore } from "../stores/pastebin.js"
import { generateMnemonicPassword, encryptText } from "../lib/cryptoUtils.js"
import { compressAndEncode } from "../lib/compressionUtils.js"
import { getFieldSize } from "../lib/fieldUtils.js"
import { encodeToBase64DataUrl, decodeFromBase64DataUrl, getFileExtensionFromMimeType } from "../lib/base64Utils.js"
import { downloadFileFromBase64 } from "../lib/fileDownloadUtils.js"
import { computed, inject, ref, nextTick } from "vue"

const store = usePastebinStore()
const notify = inject('notify')
const copyUrl = inject('copyUrl')
const generateMinifiedUrl = inject('generateMinifiedUrl')
const fileInput = ref(null)
const video = ref(null)
const canvas = ref(null)
const stream = ref(null)
const isCameraActive = ref(false)

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

    // Generate minified URL if enabled
    if (store.generateShortUrl && generateMinifiedUrl) {
      await generateMinifiedUrl()
    }

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
    const dataUrl = encodeToBase64DataUrl(reader.result, file.type)
    store.setPasteContent(dataUrl)
    store.setLoading(false)
  }
  reader.onerror = () => {
    notify("Error loading file", "is-danger")
    store.setLoading(false)
  }
  reader.readAsArrayBuffer(file)
}

const handleFileDownload = () => {
  downloadFileFromBase64(store.pasteContent, notify)
}

const handleClear = () => {
  store.setPasteContent('')
}

const handleInsertLocation = async () => {
  if (!navigator.geolocation) {
    notify('Geolocation is not supported by this browser.', 'is-danger')
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude
      const lon = position.coords.longitude
      const osmUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`
      store.setPasteContent(store.pasteContent + osmUrl)
    },
    (error) => {
      notify('Unable to retrieve your location.', 'is-danger')
      console.error('Geolocation error:', error)
    }
  )
}

const startCamera = async () => {
  try {
    isCameraActive.value = true
    await nextTick()
    stream.value = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    video.value.srcObject = stream.value
    await nextTick()
    video.value.play()
  } catch (error) {
    console.error('Camera error:', error)
    isCameraActive.value = false
    notify('Unable to access camera', 'is-danger')
  }
}

const capturePhoto = () => {
  const ctx = canvas.value.getContext('2d')
  const targetWidth = 640
  const scale = targetWidth / video.value.videoWidth
  canvas.value.width = targetWidth
  canvas.value.height = video.value.videoHeight * scale
  ctx.drawImage(video.value, 0, 0, canvas.value.width, canvas.value.height)
  const dataUrl = canvas.value.toDataURL('image/png')
  store.setPasteContent(dataUrl)
  stopCamera()
  notify('Photo captured and inserted', 'is-success')
}

const stopCamera = () => {
  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop())
    stream.value = null
  }
  isCameraActive.value = false
}
</script>

<template>
  
  <div class="buttons">
    <b-field>
      <input type="file" ref="fileInput" @change="handleFileUpload" style="display: none">
        <p class="control">
          <b-tooltip label="The loaded file is encoded as a base64 data URL" position="is-bottom">
            <a :class="`button is-pulled-left ${store.loading ? 'is-loading' : ''}`" @click="fileInput.click()">Load
              file</a>
          </b-tooltip>
        </p>
        <p class="control">
          <b-tooltip label="Decode and download as file" position="is-bottom">
            <b-button @click="handleFileDownload" icon-left="download"></b-button>
          </b-tooltip>
        </p>
    
      <p class="control">
        <b-tooltip label="Insert your current location" position="is-bottom">
          <b-button @click="handleInsertLocation" icon-left="map-marker"></b-button>
        </b-tooltip>
      </p>
      <p class="control" v-if="!isCameraActive">
        <b-tooltip label="Take a photo" position="is-bottom">
          <b-button @click="startCamera" icon-left="camera"></b-button>
        </b-tooltip>
      </p>
      <p class="control" v-if="isCameraActive">
        <b-tooltip label="Capture photo" position="is-bottom">
          <b-button @click="capturePhoto" icon-left="camera" type="is-success"></b-button>
        </b-tooltip>
      </p>
      <p class="control" v-if="isCameraActive">
        <b-tooltip label="Cancel" position="is-bottom">
          <b-button @click="stopCamera" icon-left="close"></b-button>
        </b-tooltip>
      </p>
        <p class="control">
          <b-tooltip label="Clear the text area" position="is-bottom">
            <b-button @click="handleClear" icon-left="close"></b-button>
          </b-tooltip>
        </p>        
    </b-field>
  </div>

  <video v-if="isCameraActive" ref="video" autoplay style="width: 100%; max-width: 400px;"></video>
  <canvas ref="canvas" style="display: none"></canvas>

  <b-field label="Enter your paste content" :message="fieldMessage">
    <b-input v-model="store.pasteContent" type="textarea" placeholder="Type your text here..." :rows="12" class="monospace-textarea" />
  </b-field>

  <div class="is-expanded">
    <div class="buttons is-pulled-left" position="is-left">
      <input type="file" ref="fileInput" @change="handleFileUpload" style="display: none">
      <b-field>

      </b-field>
    </div>
    <div class="buttons is-pulled-right" position="is-right">
      <b-button @click="handlePasteClear" :disabled="!store.pasteContent">Paste clear</b-button>
      <b-button @click="handleEncrypt" type="is-primary" :disabled="!store.pasteContent"> Paste encrypted
      </b-button>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
