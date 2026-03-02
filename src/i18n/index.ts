/**
 * i18n helper — wraps chrome.i18n.getMessage with a friendlier API.
 */
export function t(key: string, ...substitutions: string[]): string {
  return chrome.i18n.getMessage(key, substitutions) || key;
}
