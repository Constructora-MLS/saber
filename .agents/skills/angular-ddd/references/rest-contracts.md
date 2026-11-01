# REST contracts and API failures

## Contracts

Location: `src/app/<context>/infrastructure/contracts/`

The contract mirrors the OpenAPI schema published by the backend. It is the only description of the wire format of the context.

```typescript
// src/app/catalog/infrastructure/contracts/catalog.contract.ts
export interface WorkUnitResource {
  readonly uuid: string;
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly serviceId: string;
  /** The name of the service the work unit belongs to. */
  readonly serviceName: string;
  readonly status: CatalogStatusResource;
  /** The moment the record was registered, in the RFC 3339 format. */
  readonly createdAt?: string;
  /** The moment the record was changed for the last time, in the RFC 3339 format. */
  readonly updatedAt?: string;
}

export interface UpdateWorkUnitRequest {
  readonly name?: string;
  readonly description?: string;
  readonly serviceId?: string;
  readonly status?: CatalogStatusResource;
}
```

### Rules

- The file is named `<context>.contract.ts` and groups the types of the context.
- The naming follows the contract of the backend: `…Resource` for a published representation, `Create…Request` / `Update…Request` for the bodies.
- The fields are `readonly` and optional when the backend may omit them (`description?: string`).
- The types are plain `interface`/`type`: **no DTO classes and no mapper classes**.
- The transformations are pure functions inside the gateway; the contract file only declares the shapes.
- The envelope of the platform is re-exported when the context needs it:

```typescript
export type { FieldErrorResource, ProblemResource } from '../../../shared/infrastructure/http/problem';
```

## Failures of the API

Location: `src/app/<context>/infrastructure/errors/`

Every failure of the platform is a problem details document (RFC 9457). The envelope lives once in `src/app/shared/infrastructure/http/problem.ts`; each context translates it into its own error.

```typescript
// src/app/catalog/infrastructure/errors/catalog-api.error.ts
export class CatalogApiError extends ApiError {
  constructor(
    status: number,
    code: string,
    detail: string,
    fieldErrors: readonly FieldErrorResource[] = [],
  ) {
    super(status, code, detail, fieldErrors);
    this.name = 'CatalogApiError';
  }
}

export function toCatalogApiError(status: number, body: unknown): CatalogApiError {
  const problem = parseProblem(body);

  if (!problem) {
    return new CatalogApiError(status, UNEXPECTED_ERROR_CODE, UNEXPECTED_ERROR_DETAIL);
  }

  return new CatalogApiError(
    status,
    problem.code ?? UNKNOWN_ERROR_CODE,
    problem.detail ?? problem.title ?? FALLBACK_ERROR_DETAIL,
    problem.errors ?? [],
  );
}
```

### Rules

- The error extends `ApiError` from the shared module and sets its own `name`.
- The translation function is `<context>ApiError(status, body)`; it is called by the gateway in the `catchError`.
- A payload that does not follow the problem details contract is reported as an unexpected failure, **without leaking the payload**.
- The message published by the platform is the `detail`; the `errors` carry the message of each invalid field, so a dialog can show them next to the inputs.
- The predicates of the error (`isUnauthorized`, `isNotFound`, …) live next to it when a guard or an interceptor needs them.

## The messages of the interface

The presentation never shows the raw detail of a failure. A small module translates the error into the headline and the message that the worker reads:

```typescript
// src/app/catalog/presentation/catalog-error-messages.ts
export function catalogApiErrorMessage(error: unknown): string { /* … */ }
```

- The file is named `<context>-error-messages.ts` (or `<context>-failures.ts` when it also holds the load failures of a page).
- The copy is in Spanish and it says what happened and what to do about it.
