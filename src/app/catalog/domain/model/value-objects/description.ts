// package valueobjects

import { CatalogValidationError } from '../errors/catalog-errors';
import { hasControlCharacters, textLength } from './text';

/**
 * The maximum length of the description of a catalog record.
 */
export const DESCRIPTION_MAX_LENGTH = 500;

/**
 * Description is the optional description of a catalog record.
 */
export class Description {
  private constructor(private readonly text: string) {}

  /**
   * create validates and builds a description. An empty description is
   * valid: the record simply carries no description.
   *
   * The control characters are rejected, because the platform rejects them
   * too and the form must not offer a value that the server refuses.
   */
  static create(raw: string): Description {
    const trimmed = raw.trim();
    if (textLength(trimmed) > DESCRIPTION_MAX_LENGTH) {
      throw new CatalogValidationError(
        'description',
        `La descripción no puede superar los ${DESCRIPTION_MAX_LENGTH} caracteres.`,
      );
    }
    if (hasControlCharacters(trimmed)) {
      throw new CatalogValidationError(
        'description',
        'La descripción contiene caracteres no permitidos.',
      );
    }
    return new Description(trimmed);
  }

  /**
   * restore rebuilds a description from its stored value.
   */
  static restore(value: string): Description {
    return new Description(value);
  }

  /**
   * value returns the description as it was stored.
   */
  get value(): string {
    return this.text;
  }

  /**
   * isEmpty reports whether the description carries no text.
   */
  get isEmpty(): boolean {
    return this.text.length === 0;
  }
}
