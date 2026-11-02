# Tests

The suite runs with **Vitest** (`bun run test`) and the specs live next to the file they cover, with the `.spec.ts` suffix.

## Where the spec lives

| Layer | Spec |
|---|---|
| `domain/model/value-objects/` | `*-value-objects.spec.ts` or one spec per value object |
| `domain/model/aggregates/` | one spec per aggregate |
| `application/command-services/` | one spec per service group |
| `application/query-services/` | one spec per service group |
| `infrastructure/gateways/` | one spec per gateway |
| `infrastructure/acl/` | one spec per ACL |
| `presentation/components/` | one spec per component or dialog |
| `presentation/pages/` | one spec per page |

## The rules of a spec

- **Import from vitest**: `import { describe, expect, it } from 'vitest';`.
- **The name of the test states the behavior**: `it('does not let an older result replace the latest search', …)`.
- **The domain is tested without Angular**: the value objects and the aggregates are tested with plain `expect` calls.
- **The infrastructure is tested with a fake `HttpClient`**: build an `Injector.create({ providers: [...] })` and instantiate the gateway inside `runInInjectionContext`.
- **The application and the presentation are tested with fakes of the use cases**: provide a stub object with the `execute` method, and assert what the service published to the caller.
- **The asynchronous races are covered**: a search that starts later must win over an older one; the spec resolves the promises by hand with a `deferred` helper.
- **The failure is asserted, not swallowed**: `await expect(gateway.listServices({ page: 1 })).rejects.toMatchObject({ name: 'CatalogApiError', status: 409, code: '…' })`.

## The shape of a component spec

```typescript
import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { CreateWorkUnitCommandService } from '../../../application/command-services/catalog-command-services';

function setup() {
  const injector = Injector.create({
    providers: [
      { provide: CreateWorkUnitCommandService, useValue: { execute: async () => undefined } },
      { provide: MatDialogRef, useValue: { close: () => undefined } },
    ],
  });
  const dialog = runInInjectionContext(injector, () => new CreateWorkUnitDialog());
  return { dialog };
}
```

- `import '@angular/compiler';` is required when the spec touches a decorated class.
- The `Injector.create` providers replace the real collaborators with the fakes of the test.
- The component is built with `runInInjectionContext(injector, () => new X())`; `TestBed` is not needed for a component that does not render a template.

## The commands of the suite

```sh
bun run test                       # the whole suite
bun run test -- src/app/catalog   # the specs of a context
bunx vitest run --watch            # the suite in watch mode
bun run build                      # the compilation check (types and templates)
```

Run the specs of the touched layers and `bun run build` when the change touches a template, a route or a public signature.
