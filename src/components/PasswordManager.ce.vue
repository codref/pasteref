<script setup>
import { ref, computed, onMounted, inject, watch, nextTick } from "vue"
import { BButton, BField, BInput, BCollapse, BIcon, BTooltip, BCheckboxButton, BModal } from "buefy"
import * as bip39 from "bip39"
import { usePastebinStore } from "../stores/pastebin.js"
import { copyToClipboard } from "../lib/clipboardUtils.js"

const store = usePastebinStore()
const notify = inject('notify')

const isMnemonicModalOpen = ref(false)
const inputMnemonic = ref('')
const skipMnemonicWatch = ref(false)
const isPasswordPanelOpen = ref(false)

const isWeakPassword = computed(() => {
  const pwd = store.password;
  if (!pwd || pwd.length < 8) return true;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasDigit = /\d/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
  return !(hasUpper && hasLower && hasDigit && hasSpecial);
})

const mnemonicMessage = computed(() => {
  if (store.passwordMnemonic) {
    return 'Generated from password - use this to recover'
  }
  return 'Mnemonic only generated when password is created via BIP39. Manually entered passwords cannot be recovered from mnemonics.'
})

// Modern base64 encoding helper
const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Derive mnemonic from entropy and password from entropy
const derivePasswordAndMnemonicFromEntropy = (entropy) => {
  const mnemonic = bip39.entropyToMnemonic(entropy);
  const password = arrayBufferToBase64(entropy).substring(0, 24);
  return { password, mnemonic };
}

// Generate a random mnemonic and derive password from it using BIP39 seed
const generatePasswordAndMnemonicFromRandom = () => {
  // Generate random 16 bytes of entropy for 12-word mnemonic
  const entropyBytes = new Uint8Array(16);
  crypto.getRandomValues(entropyBytes);
  const mnemonic = bip39.entropyToMnemonic(entropyBytes);
  
  // Derive password from mnemonic using BIP39 seed
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const seedArray = new Uint8Array(seed);
  // Take first 24 chars of base64-encoded seed as password
  const password = arrayBufferToBase64(seedArray).substring(0, 24);
  
  return { password, mnemonic };
}

// Derive password from mnemonic using BIP39 seed (for recovery)
const derivePasswordFromMnemonic = (mnemonic) => {
  if (!mnemonic) return '';
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const seedArray = new Uint8Array(seed);
  const password = arrayBufferToBase64(seedArray).substring(0, 24);
  return password;
}

// Derive password and mnemonic from password (for backwards compatibility)
const deriveMnemonicFromPassword = async (password) => {
  if (!password) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  const entropy = hashArray.slice(0, 16);
  const mnemonic = bip39.entropyToMnemonic(entropy);
  return mnemonic;
}

// Derive password from mnemonic (reverse: mnemonic -> entropy -> password)
const derivePasswordFromMnemonicLegacy = (mnemonic) => {
  if (!mnemonic) return '';
  const entropy = bip39.mnemonicToEntropy(mnemonic);
  const entropyArray = new Uint8Array(entropy.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  const password = arrayBufferToBase64(entropyArray).substring(0, 24);
  return password;
}

// Generate password and derive mnemonic
const generatePasswordAndDeriveMnemonic = () => {
  return generatePasswordAndMnemonicFromRandom();
}

const handleGenerateNewPassword = async () => {
  const { password, mnemonic } = generatePasswordAndDeriveMnemonic();
  skipMnemonicWatch.value = true
  store.setPassword(password);
  store.setPasswordMnemonic(mnemonic);
  await nextTick()
  skipMnemonicWatch.value = false
}

const handleCopyPassword = async () => {
  const success = await copyToClipboard(store.password)
  if (success) {
    notify('Password copied to clipboard!', 'is-success')
  } else {
    notify('Failed to copy password', 'is-danger')
  }
}

const handleCopyMnemonic = async () => {
  if (!store.passwordMnemonic) {
    notify('No mnemonic to copy', 'is-warning')
    return
  }
  const success = await copyToClipboard(store.passwordMnemonic)
  if (success) {
    notify('Mnemonic copied to clipboard!', 'is-success')
  } else {
    notify('Failed to copy mnemonic', 'is-danger')
  }
}

const handleGenerateFromMnemonic = async () => {
  const mnemonic = inputMnemonic.value.trim()
  if (!bip39.validateMnemonic(mnemonic)) {
    notify('Invalid BIP39 mnemonic', 'is-danger')
    return
  }
  // Derive password from mnemonic by converting mnemonic back to entropy
  const password = derivePasswordFromMnemonic(mnemonic)
  skipMnemonicWatch.value = true
  store.setPassword(password)
  store.setPasswordMnemonic(mnemonic)
  await nextTick()
  skipMnemonicWatch.value = false
  isMnemonicModalOpen.value = false
  inputMnemonic.value = ''
  notify('Password generated from mnemonic', 'is-success')
}

// Password generation on mount
onMounted(async () => {
  // Don't generate password if there's encrypted content in the URL hash
  const hash = window.location.hash.substring(1)
  if (!store.password && !hash) {
    const { password, mnemonic } = generatePasswordAndDeriveMnemonic();
    skipMnemonicWatch.value = true
    store.setPassword(password);
    store.setPasswordMnemonic(mnemonic);
    await nextTick()
    skipMnemonicWatch.value = false
  }
  // If password already exists (from URL hash), don't auto-generate mnemonic
  // User must use the recovery modal if they have the 12 words
})

// Watch for password changes to clear mnemonic if manually edited
watch(() => store.password, async (newPassword) => {
  if (skipMnemonicWatch.value) return
  // Clear mnemonic when password is manually changed
  // Only programmatic generation ensures password-mnemonic consistency
  store.setPasswordMnemonic('');
})</script>

<template>
  <b-collapse class="card" animation="slide" aria-id="password-panel" v-model="isPasswordPanelOpen">
    <template #trigger="props">
      <div class="card-header" role="button" aria-controls="password-panel">
        <p class="card-header-title">
          <b-tooltip v-if="store.decryptError" position="is-right" label="Decryption failed">
            <b-icon icon="alert-circle" type="is-danger"></b-icon>
          </b-tooltip>
          <b-tooltip v-else-if="store.password" position="is-right" label="Key loaded, you can now encrypt!">
            <b-icon icon="check-circle" type="is-success"></b-icon>
          </b-tooltip>
          <b-tooltip v-else position="is-right" label="No password set">
            <b-icon icon="alert-box" type="is-warning"></b-icon>
          </b-tooltip>
          Password Management
        </p>
        <a class="card-header-icon">
          <b-icon :icon="props.open ? 'menu-down' : 'menu-up'"> </b-icon>
        </a>
      </div>
    </template>

    <div class="card-content">
      <b-field :label="`Password (${store.password.length} chars)`" label-position="on-border" :message="isWeakPassword ? 'Password is weak' : ''" :type="isWeakPassword ? 'is-warning' : ''">
        <b-input v-model="store.password" type="password" expanded password-reveal></b-input>
        <p class="control">
          <b-button @click="handleCopyPassword" icon-left="content-copy"></b-button>
        </p>
        <p class="control">
          <b-tooltip label="Generate new password" position="is-bottom">
            <b-button @click="handleGenerateNewPassword" icon-left="refresh"></b-button>
          </b-tooltip>
        </p>
        <p class="control">
          <b-tooltip label="Generate from BIP39 mnemonic" position="is-bottom">
            <b-button @click="isMnemonicModalOpen = true" icon-left="hours-12"></b-button>
          </b-tooltip>
        </p>        
        <p class="control">
          <b-tooltip :label="store.includePasswordInUrl ? 'Password will be included in URL' : 'Password will not be included in URL'" position="is-bottom">
            <b-checkbox-button v-model="store.includePasswordInUrl">
              <b-icon icon="open-in-app" class="checkbox-button-icon"></b-icon>
            </b-checkbox-button>
          </b-tooltip>
        </p>
      </b-field>

      <b-field label="Password Mnemonic (BIP39 - 12 words)" label-position="on-border" :message="mnemonicMessage">
        <b-input :value="store.passwordMnemonic" type="password" password-reveal expanded readonly></b-input>
        <p class="control">
          <b-button @click="handleCopyMnemonic" icon-left="content-copy" :disabled="!store.passwordMnemonic"></b-button>
        </p>
      </b-field>
    </div>
  </b-collapse>

  <b-modal v-model="isMnemonicModalOpen" has-modal-card>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Generate Password from BIP39 Mnemonic</p>
      </header>
      <section class="modal-card-body">
        <b-field label="Enter 12-word BIP39 mnemonic" label-position="on-border">
          <b-input v-model="inputMnemonic" type="textarea" placeholder="word1 word2 ... word12"></b-input>
        </b-field>
      </section>
      <footer class="modal-card-foot">
        <div class="buttons is-pulled-right" position="is-right">
          <b-button @click="isMnemonicModalOpen = false">Cancel</b-button>
          <b-button @click="handleGenerateFromMnemonic" type="is-primary">Generate</b-button>
        </div>
      </footer>
    </div>
  </b-modal>
</template>

<style scoped>
.checkbox-button-icon {
  margin-right: -0.5em !important;
}
</style>
