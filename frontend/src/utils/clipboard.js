/**
 * Robust copy-to-clipboard utility supporting both modern Async Clipboard API
 * and classic execCommand fallback for non-secure (HTTP) contexts.
 */
export async function copyToClipboard(text) {
  if (!text) return false;

  // 1. Try modern navigator.clipboard if available (secure context / localhost)
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard.writeText failed, falling back to execCommand:', err);
    }
  }

  // 2. Robust fallback for HTTP (non-secure context) and older browsers
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    // Position invisible off-screen
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '-9999px';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);

    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, 99999); // Mobile compatibility

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('All clipboard copy attempts failed:', err);
    return false;
  }
}
