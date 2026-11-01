# Aggregates

Location: `src/app/<context>/domain/model/aggregates/`

An aggregate root is the consistency boundary of a record. In Saber it is a class with a private constructor and two static factories, because the invariants of the creation and the invariants of the restoration are different.

```typescript
// src/app/catalog/domain/model/aggregates/service.ts
export class Service {
  private constructor(
    readonly id: string,
    readonly name: CatalogName,
    readonly description: Description | null,
    readonly status: CatalogStatus,
  ) {}

  /**
   * create builds the service that the platform accepted.
   *
   * The identifier is assigned by the platform, so the aggregate is only
   * built once the registry confirms the creation.
   */
  static create(
    id: string,
    name: CatalogName,
    description: Description | null,
    status: CatalogStatus,
  ): Service {
    return new Service(id, name, description, status);
  }

  /**
   * restore rebuilds the service from its persisted state. It does not
   * re-run the creation rules: the stored record was valid when it was
   * written.
   */
  static restore(
    id: string,
    name: CatalogName,
    description: Description | null,
    status: CatalogStatus,
  ): Service {
    return new Service(id, name, description, status);
  }
}
```

## Rules

- **One aggregate per file**, named after the concept of the context (`service.ts`, `employee.ts`, `certificate.ts`, `platform-user.ts`).
- **Private constructor + static factories.** `create` is used when the platform assigns the identifier; `restore` rebuilds a stored record without re-running the rules.
- **The fields are `readonly`.** The aggregate is immutable.
- **The typed fields use the value objects.** The aggregate never holds a raw `string` where the domain has a branded type.
- **No Angular, no HTTP.** An aggregate is a plain TypeScript class.
- **The aggregate does not fetch.** Reading and writing belong to the gateway; the aggregate only holds the state and the invariants.
- **The JSDoc explains the reason**, not the mechanics: why the identifier is assigned by the platform, why the restoration does not re-run the rules.

## Checklist

- [ ] The class is named after the concept of the context and lives in `domain/model/aggregates/`.
- [ ] The constructor is private and the factories are `create` and `restore`.
- [ ] The fields are `readonly` and use the value objects of the domain.
- [ ] The file imports nothing from `@angular/*`.
