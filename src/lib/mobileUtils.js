/**
 * Utility functions for detecting device types based on screen size.
 * Uses Bulma's responsive breakpoints for consistency.
 */

/**
 * Checks if the current device is considered mobile based on screen width.
 * Uses Bulma's mobile breakpoint (max-width: 768px).
 * @returns {boolean} True if on mobile, false otherwise.
 */
export function isMobile() {
  if (typeof window === 'undefined') return false; // SSR safe
  return window.matchMedia('(max-width: 768px)').matches;
}

/**
 * Checks if the current device is considered tablet based on screen width.
 * Uses Bulma's tablet breakpoint (min-width: 769px and max-width: 1023px).
 * @returns {boolean} True if on tablet, false otherwise.
 */
export function isTablet() {
  if (typeof window === 'undefined') return false; // SSR safe
  return window.matchMedia('(min-width: 769px) and (max-width: 1023px)').matches;
}

/**
 * Checks if the current device is considered desktop based on screen width.
 * Uses Bulma's desktop breakpoint (min-width: 1024px).
 * @returns {boolean} True if on desktop, false otherwise.
 */
export function isDesktop() {
  if (typeof window === 'undefined') return false; // SSR safe
  return window.matchMedia('(min-width: 1024px)').matches;
}