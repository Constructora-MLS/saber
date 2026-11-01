# Cross-context access (ACL)

Two bounded contexts never import each other. When the Employees context needs the catalog of work units, it goes through an **anti-corruption layer** that translates the model of the provider into the model of the consumer.

## Where the ACL lives

Location: `src/app/<consumer-context>/infrastructure/acl/`

The layer belongs to the **consumer**: it is the consumer that decides what it needs from the other context, and it owns the translation.

```typescript
// src/app/employees/infrastructure/acl/catalog-reference.acl.ts
export interface WorkUnitReference {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly serviceName: string;
  readonly availability: CatalogAvailability;
}

export interface CatalogReferenceResolver {
  resolveWorkUnits(workUnitIds: readonly string[]): Promise<ReadonlyMap<string, WorkUnitReference>>;
  listWorkUnits(search?: string): Promise<readonly WorkUnitReference[]>;
}

export const CATALOG_REFERENCE_RESOLVER = new InjectionToken<CatalogReferenceResolver>(
  'CATALOG_REFERENCE_RESOLVER',
  {
    providedIn: 'root',
    factory: () => inject(CatalogReferenceAcl),
  },
);

@Injectable({ providedIn: 'root' })
export class CatalogReferenceAcl implements CatalogReferenceResolver {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  async resolveWorkUnits(
    workUnitIds: readonly string[],
  ): Promise<ReadonlyMap<string, WorkUnitReference>> {
    // …
  }
}
```

## Rules

- **The interface is expressed in the language of the consumer.** `WorkUnitReference` is not the `WorkUnit` of the catalog: it carries only what the consumer needs, with the names of the consumer.
- **The token is the seam.** The consumer injects `CATALOG_REFERENCE_RESOLVER`, never the implementation and never the gateway of the other context. The token makes the substitution possible in the tests.
- **The implementation is private to the ACL.** It declares the resources of the provider inside the file when the consumer does not need them elsewhere.
- **The failure is isolated.** The ACL translates the failure of the provider into a failure of the consumer, so a page of the consumer never shows a raw error of another context.
- **The direction is one way.** The Catalog context does not know that the Employees context exists.
- **The batch is bounded.** When the ACL resolves many identifiers at once, it caps the size of the request (`MAX_IDS_PER_REQUEST`) and it splits the call.

## When the provider is a shared helper

Some collaborations are pure functions shared by several contexts, not a context of their own: `src/app/shared/application/queries/catalog-search.ts` with `normalizeCatalogSearch` is one of them. A shared helper holds no state, no gateway and no contract of its own; it is the pure normalization that several contexts agree on.

## Checklist

- [ ] The consumer does not import the domain, the gateway or the store of the other context.
- [ ] The interface of the ACL is written in the language of the consumer.
- [ ] The token is the only thing that the consumer injects.
- [ ] The failure of the provider is translated into a failure of the consumer.
