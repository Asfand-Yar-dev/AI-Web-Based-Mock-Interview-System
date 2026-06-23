/**
 * Regex helpers for case-insensitive, injection-safe matching.
 * Shared by the booking auto-match (bookingService) and the public interviewer
 * discovery search so both behave identically.
 */

/** Escape a string so it can be used literally inside a RegExp. */
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Anchored, case-insensitive exact match (e.g. "React" === "react"). */
function exactCI(value) {
  return new RegExp(`^${escapeRegex(String(value).trim())}$`, 'i');
}

/** Unanchored, case-insensitive substring match (e.g. "java" ⊂ "JavaScript"). */
function containsCI(value) {
  return new RegExp(escapeRegex(String(value).trim()), 'i');
}

module.exports = { escapeRegex, exactCI, containsCI };
