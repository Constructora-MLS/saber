# Application services, command services, query services and stores

Location: `src/app/<context>/application/`

The application layer orchestrates the use cases. It is the only layer that knows both the domain (the commands and the queries) and the infrastructure (the gateways).

## One use case per service

A command service executes one command. A query service executes one query. Both are concrete `@Injectable({ providedIn: 'root' })` classes that use `inject()`.

```typescript
// src/app/catalog/application/command-services/catalog-command-services.ts
@Injectable({ providedIn: 'root' })
export class CreateWorkUnitCommandService {
  private readonly gateway = inject(CatalogGateway);

  async execute(command: CreateWorkUnitCommand): Promise<WorkUnit> {
    const name = CatalogName.create(command.name);
    const serviceId = command.serviceId.trim();
    if (serviceId.length === 0) {
      throw new CatalogValidationError('serviceId', 'La unidad de trabajo pertenece a un servicio.');
    }
    const description = this.description(command.description);

    return this.gateway.createWorkUnit({ name, description, serviceId });
  }

  private description(raw: string | null | undefined): Description | null {
    if (raw === null || raw === undefined || raw.trim().length === 0) {
      return null;
    }
    const description = Description.create(raw);
    return isDescriptionEmpty(description) ? null : description;
  }
}
```

```typescript
// src/app/catalog/application/query-services/catalog-query-services.ts
@Injectable({ providedIn: 'root' })
export class ListWorkUnitsQueryService {
  private readonly gateway = inject(CatalogGateway);

  async execute(query: ListWorkUnitsQuery): Promise<CatalogPage<WorkUnit>> {
    const serviceId = query.serviceId?.trim();
    const criteria: WorkUnitCriteria = {
      search: this.search(query.search),
      status: query.status,
      limit: query.limit,
      page: query.page,
      ...(serviceId ? { serviceId } : {}),
    };

    return this.gateway.listWorkUnits(criteria);
  }
}
```

## Rules

- **The file groups the services of the context**: `application/command-services/<context>-command-services.ts` and `application/query-services/<context>-query-services.ts`.
- **The method is `execute`.** `execute(command)` for a command service, `execute(query)` for a query service.
- **The service validates with the domain before the call.** The command carries raw values; the service turns them into value objects and throws a domain error when the invariant is broken.
- **The service never builds a payload.** The payload belongs to the contract, and the contract belongs to the infrastructure.
- **The service returns the domain model**, never the resource of the API.
- **The service never catches the error of the gateway.** The failure travels up to the presentation, which knows how to show it. Normalization of the input (trimming, defaulting) is allowed and belongs here.

## Signal stores

A store owns the reactive state of the client: the session, a listing that is filtered, the selection of a table.

```typescript
// src/app/iam/application/session/auth-session.store.ts
@Injectable({ providedIn: 'root' })
export class AuthSessionStore {
  private readonly gateway = inject(AuthGateway);
  private readonly signInCommand = inject(SignInCommandService);

  private readonly session = signal<AuthSession | null>(null);
  /** The renewal that is already running, so it is never started twice. */
  private pending: Promise<void> | null = null;

  /** The token that authenticates the private requests. */
  readonly accessToken = computed(() => this.session()?.accessToken ?? null);
  /** Whether the browser holds a session. */
  readonly authenticated = computed(() => this.session() !== null);

  async signIn(command: SignInCommand): Promise<void> {
    this.session.set(await this.signInCommand.execute(command));
  }
}
```

## Rules

- The store lives in `application/session/` (or next to the use cases it coordinates) and is named `<Context>Store`.
- The writable signals are `private`; the public surface is `readonly` signals and `computed()`.
- The async methods return a `Promise`, so the caller can await the mutation before navigating.
- The pending work is memoized when it must happen once (a renewal of the session, for instance).
- The store never mutates an object in place: it replaces the value with `set`/`update`.
- The store does not hold the access token in the storage of the browser.

## Shared application helpers

A helper that is genuinely shared by several contexts lives in `src/app/shared/application/` (for instance `shared/application/queries/catalog-search.ts` with `normalizeCatalogSearch`). It stays pure and free of Angular.
