/**
 * Generates a field message showing character count and byte size
 * @param {string} text - The text to analyze
 * @returns {string} The formatted message
 */
export const getFieldSize = (text) => {
  if (!text) return ""
  const charCount = text.length
  const byteCount = new TextEncoder().encode(text).length

  // Format bytes with appropriate unit
  let formattedSize
  if (byteCount < 1024) {
    formattedSize = `${byteCount} B`
  } else if (byteCount < 1024 * 1024) {
    formattedSize = `${(byteCount / 1024).toFixed(1)} KB`
  }

  return `${charCount} characters (${formattedSize})`
}
