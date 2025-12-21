import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const usePastebinStore = defineStore('pastebin', () => {
  const pasteContent = ref('')
  const password = ref('')
  const passwordMnemonic = ref('')
  const encryptedText = ref('')
  const encodedURL = ref('')
  const activeTab = ref(0)
  const loadedPlainFile = ref(null)
  const loading = ref(false)
  const decryptError = ref(false)
  const includePasswordInUrl = ref(true)
  const generateShortUrl = ref(true)
  const minifiedUrl = ref('')

  // Computed properties
  const hasPasswordInUrl = computed(() => {
    return encodedURL.value.includes('~')
  })

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

  const setEncodedURL = (url) => {
    encodedURL.value = url
  }

  const setActiveTab = (tab) => {
    activeTab.value = tab
  }

  const clearAll = () => {
    pasteContent.value = ''
    encryptedText.value = ''
    encodedURL.value = ''
    loadedPlainFile.value = null
    loading.value = false
  }

  const setLoadedPlainFile = (file) => {
    loadedPlainFile.value = file
  }

  const setLoading = (isLoading) => {
    loading.value = isLoading
  }

  const setDecryptError = (hasError) => {
    decryptError.value = hasError
  }

  const setIncludePasswordInUrl = (include) => {
    includePasswordInUrl.value = include
  }

  const setMinifiedUrl = (url, pwd = '') => {
    // Include password in minified URL if includePasswordInUrl is enabled and password is provided
    if (pwd && includePasswordInUrl.value) {
      minifiedUrl.value = `${url}~${pwd}`
    } else {
      minifiedUrl.value = url
    }
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
    encodedURL,
    activeTab,
    loadedPlainFile,
    loading,
    decryptError,
    includePasswordInUrl,
    generateShortUrl,
    minifiedUrl,
    hasPasswordInUrl,

    // Actions
    setPasteContent,
    setPassword,
    setPasswordMnemonic,
    setEncryptedText,
    setEncodedURL,
    setActiveTab,
    clearAll,
    setLoadedPlainFile,
    setLoading,
    setDecryptError,
    setIncludePasswordInUrl,
    setMinifiedUrl,
    onLoadPlainFileClick
  }
})