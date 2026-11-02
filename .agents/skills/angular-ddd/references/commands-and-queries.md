# Commands and queries

Location: `src/app/<context>/application/commands/` and `src/app/<context>/application/queries/`

A command expresses an intention to change the state of the context. A query requests information without changing anything. Both are immutable `interface` declarations whose fields are `readonly`.

## Commands

```typescript
// src/app/catalog/application/commands/catalog-commands.ts
/**
 * CreateWorkUnitCommand asks for a new work unit.
 */
export interface CreateWorkUnitCommand {
  /** The name of the work unit. */
  readonly name: string;
  /** The optional description of the work unit. */
  readonly description?: string | null;
  /** The service the work unit belongs to. */
  readonly serviceId: string;
}
```

## Rules

- The file groups the commands of the context: `<context>-commands.ts`.
- The name states the intention: `Create…Command`, `Update…Command`, `Delete…Command`, `SignInCommand`.
- The fields are plain primitives (`string`, `number`, `boolean`) or the union types of the domain. The command carries the **intent and the raw values**; the service validates them with the domain before the call.
- Every field is documented with a short JSDoc: the meaning of the value, the unit, and whether it is optional.
- The identifier of the record is named `uuid` when the platform publishes it under that name.
- The optional fields are omitted with the spread when the payload is built (`...(serviceId ? { serviceId } : {})`); an absent field means "keep the current value" in an update, and "no value" in a creation.
- No classes, no getters and no setters.

## Queries

```typescript
// src/app/catalog/application/queries/catalog-queries.ts
/**
 * CatalogPage is a page of a listing.
 */
export interface CatalogPage<T> {
  /** The records of the page. It is never empty by contract. */
  readonly items: readonly T[];
  /** The number of the page, starting at one. */
  readonly page: number;
  /** The number of pages of the listing. */
  readonly totalPages: number;
  /** The number of records that match the query. */
  readonly total: number;
}

/**
 * ListWorkUnitsQuery asks for a page of the work units.
 */
export interface ListWorkUnitsQuery {
  /** Case-insensitive substring matched in the code or name. */
  readonly search?: string;
  readonly status?: FilterableCatalogStatus;
  readonly serviceId?: string;
  readonly limit?: number;
  /** The number of the requested page, starting at one. */
  readonly page?: number;
}
```

## Rules

- The file groups the queries of the context: `<context>-queries.ts`.
- The name states the read: `List…Query`, `Find…Query`, `Verify…Query`.
- The paging is always `limit` + `page`, and the page starts at one.
- The generic page shape (`CatalogPage<T>`, `EmployeePage<T>`) lives in the query file of the context and is reused by every listing of that context.
- The filters of the context are shared: declare a `…Criteria` interface and let the specialized criteria extend it.
- The queries never modify the state.

## Checklist

- [ ] Every command and query is a `readonly` interface.
- [ ] Every field carries a short JSDoc.
- [ ] The commands hold the intent and the raw values, not the domain objects.
- [ ] The listing uses `limit`/`page` and the page starts at one.
- [ ] The file name ends with `-commands.ts` or `-queries.ts`.
