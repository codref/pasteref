<script setup>
import { ref, onMounted, getCurrentInstance, defineProps } from "vue"
import {
  BButton,
  BField,
  BInput,
  BTabs,
  BTabItem
} from "buefy"
import PasswordManager from "./components/PasswordManager.ce.vue"
import PlainTextTab from "./components/PlainTextTab.ce.vue"
import EncryptedTextTab from "./components/EncryptedTextTab.ce.vue"
import { usePastebinStore } from "./stores/pastebin.js"
import { Buffer } from "buffer"
import buefyCss from "./styles/buefy-custom.scss?inline"
import { generateShortUrl } from "./lib/cryptoUtils.js"
import { setAttributes } from "./lib/domUtils.js"

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

// Generate password on component load
onMounted(() => {

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

  // Generate initial short URL
  const hash = window.location.hash.substring(1)
  if (hash) {
    store.setShortUrl(hash)
  } else {
    store.setShortUrl(generateShortUrl())
  }
})

// Password generation and management are handled by the PasswordManager component
</script>

<template>
  <div class="pasteref">

    <b-field message="What a beautiful email!!">
      <p class="control">
        <span class="button is-static">{{ baseUrl }}</span>
      </p>
      <b-input :value="store.shortUrl" placeholder="Your short URL" expanded readonly></b-input>
      <p class="control">
        <b-button type="is-primary" label="Create" />
      </p>
    </b-field>


    <PasswordManager />


    <b-tabs :animated="false" v-model="store.activeTab">
      <b-tab-item label="Plain text">
        <PlainTextTab />

      </b-tab-item>

      <b-tab-item label="Encrypted">
        <EncryptedTextTab />
      </b-tab-item>
    </b-tabs>
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
</style>
