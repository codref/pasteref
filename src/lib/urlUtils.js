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
    setMinifiedUrl(response.data.minifiedURL)
    notify("Minified URL created", "is-info is-light")
  } catch (error) {
    notify("Cannot generate a minified URL", "is-danger")
    console.log(error)
  }
}