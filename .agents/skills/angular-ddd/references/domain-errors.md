# Domain errors

Location: `src/app/<context>/domain/model/errors/`

The errors of the domain are expressed in the ubiquitous language of the context: they never mention HTTP statuses nor JSON payloads.

```typescript
// src/app/catalog/domain/model/errors/catalog-errors.ts
/**
 * CatalogValidationError reports the invalid value of a field.
 *
 * The field is part of the invariant that was broken, so the interfaces can
 * show the message next to the input that produced it.
 */
export class CatalogValidationError extends Error {
  constructor(
    readonly field: string,
    readonly reason: string,
  ) {
    super(reason);
    this.name = 'CatalogValidationError';
  }
}
```

## Rules

- One file per context: `<context>-errors.ts`. The errors of the context are grouped there.
- The error carries the **field** that broke the invariant, so the dialog can show the message next to the input that produced it.
- The `reason` is the message the worker reads, in Spanish.
- The `name` of the class is set explicitly, so the error is identifiable in the console and in the tests.
- The domain error never imports anything from `@angular/*`.
- The error of the domain is not the error of the API: the gateway translates an HTTP failure into `<Context>ApiError` (see [rest-contracts.md](rest-contracts.md)).

## Checklist

- [ ] The file is `<context>-errors.ts` and groups the errors of the context.
- [ ] The error carries the field and the reason.
- [ ] The `name` is set explicitly.
- [ ] The message never mentions HTTP and it is written in Spanish.
