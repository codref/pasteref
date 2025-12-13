/**
 * Modern clipboard utility for Vue 3 using the Clipboard API
 * @param {string} text - The text to copy to clipboard
 * @returns {Promise<boolean>} - Returns true if successful, false if failed
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy text: ', error);
    return false;
  }
};

/**
 * Legacy fallback for older browsers (if needed)
 * @param {HTMLElement} el - The element containing text to copy
 * @param {Function} emit - Vue emit function for notifications
 * @returns {boolean} - Returns true if successful, false if failed
 */
export const copyToClipboardLegacy = (el, emit = null) => {
  try {
    if (typeof el.select !== "undefined") {
      el.select();
    } else {
      el.querySelector("textarea").select();
    }

    const successful = document.execCommand("copy");

    if (successful && emit) {
      emit("notify", `Text copied to clipboard!`, "is-info is-light", 3000);
    } else if (!successful && emit) {
      emit("notify", `Failed to copy text to clipboard!`, "is-danger is-light", 3000);
    }

    return successful;
  } catch (error) {
    console.error('Failed to copy text: ', error);

    if (emit) {
      emit("notify", `Failed to copy text to clipboard!`, "is-danger is-light", 3000);
    }

    return false;
  }
};