// package valueobjects

import { CatalogValidationError } from '../errors/catalog-errors';

/** The maximum length of the description of a catalog record. */
export const DESCRIPTION_MAX_LENGTH = 500;

/**
 * Description is the optional description of a catalog record.
 */
export class Description {
  private constructor(private readonly text: string) {}

  /**
   * create validates and builds a description. An empty description is
   * valid: the record simply carries no description.
   */
  static create(raw: string): Description {
    const trimmed = raw.trim();
    if (trimmed.length > DESCRIPTION_MAX_LENGTH) {
      throw new CatalogValidationError(
        'description',
        `La descripción no puede superar los ${DESCRIPTION_MAX_LENGTH} caracteres.`,
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
