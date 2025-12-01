<script setup>
import { ref, computed, onMounted } from "vue"
import { BButton, BField, BInput, BCollapse, BIcon, BTooltip } from "buefy"
import * as bip39 from "bip39"

const props = defineProps({
  password: {
    type: String,
    default: "",
  },
  passwordMnemonic: {
    type: String,
    default: "",
  },
})
const emit = defineEmits(["update:password", "update:passwordMnemonic"])

const passwordComputed = computed({
  get: () => props.password,
  set: (val) => emit("update:password", val),
})

const mnemonicComputed = computed({
  get: () => props.passwordMnemonic,
  set: (val) => emit("update:passwordMnemonic", val),
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

// Generate mnemonic password locally in the component
const generateMnemonicPassword = () => {
  // Generate 128 bits of entropy (12 words)
  const mnemonic = bip39.generateMnemonic(128)

  // Derive a password from the mnemonic
  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const passwordBytes = seed.slice(0, 32)

  // Convert to base64 for a readable password
  const password = arrayBufferToBase64(passwordBytes).substring(0, 24)

  return { password, mnemonic }
}

const handleGenerateNewPassword = () => {
  const { password: newPassword, mnemonic } = generateMnemonicPassword()
  passwordComputed.value = newPassword
  mnemonicComputed.value = mnemonic
}

// If parent didn't set a password, generate one on mount
onMounted(() => {
  if (!props.password) {
    const { password: newPassword, mnemonic } = generateMnemonicPassword()
    passwordComputed.value = newPassword
    mnemonicComputed.value = mnemonic
  }
})
</script>

<template>
  <b-collapse class="card" animation="slide" aria-id="password-panel">
    <template #trigger="props">
      <div class="card-header" role="button" aria-controls="password-panel">
        <p class="card-header-title">
          <b-tooltip position="is-right" label="Key loaded, you can now encrypt!">
            <b-icon icon="check-circle" type="is-success"></b-icon>
          </b-tooltip>
          Password Management
        </p>
        <a class="card-header-icon">
          <b-icon :icon="props.open ? 'menu-down' : 'menu-up'"> </b-icon>
        </a>
      </div>
    </template>

    <div class="card-content">
      <b-field label="Password" label-position="on-border" grouped>
        <b-input
          v-model="passwordComputed"
          type="password"
          expanded
          password-reveal
          readonly
        ></b-input>
        <p class="control">
          <b-button @click="handleGenerateNewPassword" icon-left="refresh">
            Regenerate
          </b-button>
        </p>
      </b-field>

      <b-field
        label="Password Mnemonic (BIP39 - 12 words)"
        label-position="on-border"
      >
        <b-input
          v-model="mnemonicComputed"
          type="password"
          password-reveal
          readonly
        ></b-input>
      </b-field>
    </div>
  </b-collapse>
</template>

<style scoped>
/* Keep typography consistent; visuals are driven by parent styles */
</style>
