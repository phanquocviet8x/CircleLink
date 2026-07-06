// Small client-side safety helpers.

// Only allow safe URL schemes when rendering user-supplied links in href.
// Blocks javascript:, data:, vbscript:, etc. Returns '#' for anything unsafe.
const SAFE_SCHEME = /^(https?:|mailto:|tel:)/i;

export function sanitizeUrl(raw) {
  if (!raw || typeof raw !== 'string') return '#';
  const url = raw.trim();
  if (SAFE_SCHEME.test(url)) return url;
  // Bare domains without a scheme -> assume https
  if (/^[\w-]+(\.[\w-]+)+/.test(url)) return `https://${url}`;
  return '#';
}
