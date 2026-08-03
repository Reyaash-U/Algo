import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes markdown content for XSS protection.
 * Uses isomorphic-dompurify to clean any dangerous HTML tags (like script, iframe)
 * and event handlers (like onclick) allowed within inline markdown HTML.
 * Also sanitizes javascript: protocols in markdown-style links.
 *
 * @param {string} md - The raw markdown content
 * @returns {string} The cleaned markdown content
 */
export function stripDangerous(md = '') {
  let clean = DOMPurify.sanitize(String(md));
  // Defuse javascript: protocol in markdown links to avoid substring match issues
  clean = clean.replace(/javascript:/gi, 'blocked-protocol:');
  return clean;
}
