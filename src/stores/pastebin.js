import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePastebinStore = defineStore('pastebin', () => {
  const pasteContent = ref('')
  const password = ref('')
  const passwordMnemonic = ref('')
  const encryptedText = ref('')
  const shortUrl = ref('')
  const activeTab = ref(0)
  const loadedPlainFile = ref(null)
  const loading = ref(false)

  // Actions
  const setPasteContent = (content) => {
    pasteContent.value = content
  }

  const setPassword = (pwd) => {
    password.value = pwd
  }

  const setPasswordMnemonic = (mnemonic) => {
    passwordMnemonic.value = mnemonic
  }

  const setEncryptedText = (text) => {
    encryptedText.value = text
  }

  const setShortUrl = (url) => {
    shortUrl.value = url
  }

  const setActiveTab = (tab) => {
    activeTab.value = tab
  }

  const clearAll = () => {
    pasteContent.value = ''
    encryptedText.value = ''
    loadedPlainFile.value = null
    loading.value = false
  }

  const setLoadedPlainFile = (file) => {
    loadedPlainFile.value = file
  }

  const setLoading = (isLoading) => {
    loading.value = isLoading
  }

  // Handle file loading
  const onLoadPlainFileClick = async (file) => {
    if (!file) return

    loading.value = true
    try {
      const text = await file.text()
      pasteContent.value = text
      console.log('File loaded successfully')
    } catch (error) {
      console.error('Error loading file:', error)
      alert('Error loading file')
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    pasteContent,
    password,
    passwordMnemonic,
    encryptedText,
    shortUrl,
    activeTab,
    loadedPlainFile,
    loading,

    // Actions
    setPasteContent,
    setPassword,
    setPasswordMnemonic,
    setEncryptedText,
    setShortUrl,
    setActiveTab,
    clearAll,
    setLoadedPlainFile,
    setLoading,
    onLoadPlainFileClick
  }
})