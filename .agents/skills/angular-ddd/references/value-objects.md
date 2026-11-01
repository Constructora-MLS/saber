# Value objects

Location: `src/app/<context>/domain/model/value-objects/`

A value object is an immutable, validated domain concept: a name, a code, a status, an identifier. In Saber they are **branded primitives**, not wrapper classes: a branded `string` keeps working with the native form controls and the templates, and the brand removes the "any string is a name" ambiguity at compile time.

## Shape

Every value object file follows the same three-part shape:

```typescript
// src/app/catalog/domain/model/value-objects/catalog-name.ts
import { CatalogValidationError } from '../errors/catalog-errors';
import { hasControlCharacters, textLength } from './text';

/** The boundaries of the name of a catalog record. */
export const CATALOG_NAME_MIN_LENGTH = 2;
export const CATALOG_NAME_MAX_LENGTH = 120;

/** CatalogName is a validated name of a catalog record. */
export type CatalogName = string & { readonly __catalogName: unique symbol };

/** parseCatalogName validates and normalizes a catalog name. */
export function parseCatalogName(raw: string): CatalogName {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new CatalogValidationError('name', 'El nombre es obligatorio.');
  }
  if (textLength(trimmed) < CATALOG_NAME_MIN_LENGTH) {
    throw new CatalogValidationError(
      'name',
      `El nombre debe tener al menos ${CATALOG_NAME_MIN_LENGTH} caracteres.`,
    );
  }
  // ...
  return trimmed as CatalogName;
}

/** restoreCatalogName trusts a value returned by the backend. */
export function restoreCatalogName(value: string): CatalogName {
  return value as CatalogName;
}

/**
 * CatalogName keeps the established factory call sites while exposing a
 * primitive branded type rather than a wrapper class.
 */
export const CatalogName = {
  create: parseCatalogName,
  restore: restoreCatalogName,
} as const;
```

## Rules

- **Branded type.** `type X = string & { readonly __brand: unique symbol }`. The brand name is unique per value object (`__catalogName`, `__employeeId`).
- **Two factories.**
  - `parseX(raw)`: validates and normalizes the value coming from the user. It throws a domain error when the invariant is broken.
  - `restoreX(value)`: trusts the value returned by the backend. It never re-runs the rules of the creation, because the stored record was valid when it was written.
- **Namespace object.** Export `X = { create: parseX, restore: restoreX } as const` so the call sites read `CatalogName.create(...)` and `CatalogName.restore(...)`.
- **Normalize, do not mutate.** Trimming and lowercasing belong to the parser; the restored value keeps exactly what the backend sent.
- **Named constants for the boundaries.** Export the limits (`CATALOG_NAME_MIN_LENGTH`) instead of hiding the numbers inside the condition.
- **Shared helpers live in the context.** Small pure helpers such as `textLength` and `hasControlCharacters` are plain exported functions of the `value-objects` folder.
- **The message of the failure belongs to the domain.** It is written in Spanish because the worker reads it, and it never mentions HTTP.

## Checklist

- [ ] The value object is a branded primitive, not a wrapper class and not a `{ value }` object.
- [ ] The file exports `parseX`, `restoreX` and the namespace object `X`.
- [ ] The parser normalizes and validates; the restore trusts.
- [ ] The boundaries are exported as named constants.
- [ ] The error thrown is a domain error of the context.
