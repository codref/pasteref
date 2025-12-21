import { decodeFromBase64DataUrl, getFileExtensionFromMimeType } from './base64Utils.js'

/**
 * Downloads a file from base64-encoded content.
 * @param {string} pasteContent - The base64 data URL string.
 * @param {function} notify - Notification function to provide user feedback.
 */
export const downloadFileFromBase64 = (pasteContent, notify) => {
  if (!pasteContent) {
    notify("No content to download", "is-warning")
    return
  }

  try {
    const { mimeType, data } = decodeFromBase64DataUrl(pasteContent)
    const extension = getFileExtensionFromMimeType(mimeType)
    const blob = new Blob([data], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `download${extension}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    notify("File downloaded successfully", "is-success")
  } catch (error) {
    console.error("Download error:", error)
    notify("Failed to download file", "is-danger")
  }
}

/**
 * Downloads plain text content as a .txt file.
 * @param {string} text - The plain text content.
 * @param {function} notify - Notification function to provide user feedback.
 * @param {string} filename - The filename for the download (default: 'download.txt').
 */
export const downloadPlainText = (text, notify, filename = 'download.txt') => {
  if (!text) {
    notify("No content to download", "is-warning")
    return
  }

  try {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    notify("File downloaded successfully", "is-success")
  } catch (error) {
    console.error("Download error:", error)
    notify("Failed to download file", "is-danger")
  }
}