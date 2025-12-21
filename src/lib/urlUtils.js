import axios from 'axios'

/**
 * Utility functions for URL operations
 */

/**
 * Generates a minified URL by posting to the minify API
 * @param {string} minifyUrl - The API endpoint for minifying URLs
 * @param {string} encodedUrl - The encoded URL to minify
 * @param {function} setMinifiedUrl - Function to set the minified URL in the store
 * @param {function} notify - Notification function
 * @returns {Promise<void>}
 */
export const getMinifiedUrl = async (minifyUrl, encodedUrl, setMinifiedUrl, notify) => {
  try {
    const response = await axios.post(minifyUrl, {
      url: encodedUrl,
    })
    const minifiedURL = response.data.minifiedURL
    const hash = minifiedURL.substring(minifiedURL.lastIndexOf('/') + 1)
    setMinifiedUrl(hash)
    notify("Minified URL created", "is-info is-light")
  } catch (error) {
    notify("Cannot generate a minified URL", "is-danger")
    console.log(error)
  }
}

/**
 * Resolves a minified URL hash by calling the backend API
 * @param {string} minifiedHash - The minified URL hash (without ##)
 * @param {string} minifyUrl - The API endpoint for resolving minified URLs
 * @param {function} notify - Notification function
 * @returns {Promise<string>} The resolved payload URL
 */
export const resolveMinifiedUrl = async (minifiedHash, minifyUrl, notify) => {
  try {
    const response = await fetch(`${minifyUrl}/${minifiedHash}`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.url) {
      throw new Error('No URL in response')
    }
    
    // Extract the hash from the returned URL
    const hashMatch = data.url.match(/#(.+)$/)
    if (!hashMatch || !hashMatch[1]) {
      throw new Error('Invalid URL format - no hash found')
    }
    
    return hashMatch[1]
  } catch (error) {
    console.error('Failed to resolve minified URL:', error)
    notify('Failed to resolve minified URL', 'is-danger')
    throw error
  }
}