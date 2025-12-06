<script setup>
import { BField, BInput } from "buefy"
import { usePastebinStore } from "../stores/pastebin.js"

const store = usePastebinStore()
</script>

<template>
  <b-field label="Encrypted & Compressed Text (Base64)">
    <b-input v-model="store.encryptedText" type="textarea" :rows="6" />
  </b-field>
</template>