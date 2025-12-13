import { arrayBufferToBase64 } from './cryptoUtils.js'

/**
 * Compresses plaintext using gzip compression and converts it to base64
 * @param {string} plaintext - The text to compress
 * @returns {Promise<string>} The compressed data encoded in base64
 */
export const compressAndEncode = async (plaintext) => {
  try {
    // Step 1: Convert plaintext to Blob and compress using gzip
    const stream = new Blob([plaintext]).stream()
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'))
    const compressedBlob = await new Response(compressedStream).blob()
    const compressed = new Uint8Array(await compressedBlob.arrayBuffer())

    // Step 2: Convert to base64
    return arrayBufferToBase64(compressed)
  } catch (error) {
    throw new Error(`Compression failed: ${error.message}`)
  }
}

/**
 * Decompresses base64-encoded gzip data back to plaintext
 * @param {string} base64Data - The base64-encoded compressed data
 * @returns {Promise<string>} The decompressed plaintext
 */
export const decodeAndDecompress = async (base64Data) => {
  try {
    // Convert base64 to ArrayBuffer
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Create a stream from the bytes
    const stream = new Blob([bytes]).stream()
    const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'))
    const decompressedBlob = await new Response(decompressedStream).blob()
    const plaintext = await decompressedBlob.text()

    return plaintext
  } catch (error) {
    throw new Error(`Decompression failed: ${error.message}`)
  }
}
