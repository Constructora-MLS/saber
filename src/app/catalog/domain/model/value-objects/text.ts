// Package valueobjects holds the value objects of the Catalog bounded
// context.
//
// Every value object validates its invariants on construction and never
// exposes a mutable state.
// package valueobjects

/**
 * textLength returns the number of characters of the text.
 *
 * The platform counts the characters by code point, so a character outside
 * the basic plane counts as one, exactly as it does there.
 */
export function textLength(text: string): number {
  return [...text].length;
}

/**
 * hasControlCharacters reports whether the text carries a control character.
 *
 * The platform rejects every control character: the C0 range, the delete
 * character and the C1 range.
 */
export function hasControlCharacters(text: string): boolean {
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) {
      return true;
    }
  }
  return false;
}
