/**
 * Encodes binary data to a base64 data URL with the specified MIME type.
 * @param {ArrayBuffer | Uint8Array} data - The binary data to encode.
 * @param {string} mimeType - The MIME type for the data URL (e.g., 'application/pdf').
 * @returns {string} The base64 encoded data URL.
 */
function encodeToBase64DataUrl(data, mimeType) {
    const base64 = arrayBufferToBase64(data);
    return `data:${mimeType};base64,${base64}`;
}

/**
 * Converts an ArrayBuffer or Uint8Array to a base64 string.
 * @param {ArrayBuffer | Uint8Array} buffer - The buffer to convert.
 * @returns {string} The base64 encoded string.
 */
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Converts a base64 string to an ArrayBuffer.
 * @param {string} base64 - The base64 string to convert.
 * @returns {ArrayBuffer} The decoded ArrayBuffer.
 */
function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Decodes a base64 data URL and returns the MIME type and binary data.
 * @param {string} dataUrl - The data URL to decode.
 * @returns {Object} An object with mimeType and data (ArrayBuffer).
 */
function decodeFromBase64DataUrl(dataUrl) {
    const [header, base64] = dataUrl.split(',');
    const mimeType = header.split(':')[1].split(';')[0];
    const data = base64ToArrayBuffer(base64);
    return { mimeType, data };
}

/**
 * Gets the file extension from a MIME type.
 * @param {string} mimeType - The MIME type.
 * @returns {string} The file extension including the dot.
 */
function getFileExtensionFromMimeType(mimeType) {
    const map = {
        'application/pdf': '.pdf',
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'image/gif': '.gif',
        'text/plain': '.txt',
        'application/json': '.json',
        'application/zip': '.zip',
        // Add more mappings as needed
    };
    return map[mimeType] || '.bin';
}

export { encodeToBase64DataUrl, arrayBufferToBase64, decodeFromBase64DataUrl, base64ToArrayBuffer, getFileExtensionFromMimeType };