---
name: angular-ddd
description: "Implement and review DDD bounded contexts in Saber, the Angular frontend of the MLS platform: value objects, aggregates, commands, queries, command/query services, gateways, REST contracts, ACLs, pages and components. Use before every code change in src/app, and whenever a bounded context, feature, page, dialog, or use case is added, changed, or reviewed."
---

# Angular DDD in Saber

Saber is the Angular frontend of the MLS platform. It consumes the `akame` backend through its REST API and organizes its code as bounded contexts written with Domain-Driven Design.

Every context lives under `src/app/<context>/` and follows the same four layers:

```text
src/app/<context>/
  domain/model/value-objects/   # branded primitives with parse*/restore*
  domain/model/aggregates/      # aggregate roots
  domain/model/errors/          # errors of the ubiquitous language
  application/commands/         # intentions that change the state
  application/queries/          # requests for information
  application/command-services/ # write use cases
  application/query-services/   # read use cases
  application/session/          # signal stores of the session (when the context owns one)
  infrastructure/contracts/     # OpenAPI request/response types
  infrastructure/gateways/      # HTTP communication
  infrastructure/errors/        # translation of the API failures
  infrastructure/acl/           # anti-corruption layer of another context
  infrastructure/http/          # interceptors and shared HTTP plumbing
  presentation/pages/           # routed orchestrators (*.page.ts)
  presentation/components/      # presentational components and dialogs
  presentation/guards/          # route guards
  presentation/layouts/         # shells of the applications
```

`src/app/shared/` holds what genuinely belongs to every context: the problem details envelope, the catalog search helpers, and the reusable presentation components.

## Core rules

1. **The domain never imports Angular.** `domain/` holds pure TypeScript: no `@angular/core`, no `HttpClient`, no signals, no router.
2. **The presentation never imports the infrastructure.** A page or a component talks to `application/` services only. It never injects `HttpClient` nor a gateway.
3. **The application layer never imports the infrastructure contracts.** Commands and queries speak the language of the domain; the gateway translates them into the wire format.
4. **No DTO classes and no mapper classes.** Contracts are `interface`/`type` declarations with `readonly` fields. Transformations are pure functions or the `restore`/`create` factories of the value objects.
5. **No repositories.** The remote API is an external system: it is reached through an **infrastructure gateway**. Reactive client state lives in **application stores** built with signals.
6. **No `NgModule`.** Every component is standalone; `imports` lists only what the template needs.
7. **`inject()` over constructor injection.** Use `inject()` in services, guards, components, and interceptors.
8. **Signals first.** Use `signal`, `computed`, `input()`, `output()`. Keep `Observable` only at the HTTP boundary and bridge with `firstValueFrom` or `toSignal`.
9. **Built-in control flow.** Use `@if`, `@for`, `@switch` in templates; the legacy `*ngIf`/`*ngFor` directives are forbidden.
10. **The errors of the domain are not the errors of the API.** The domain throws `<Context>ValidationError`; the gateway translates an HTTP failure into `<Context>ApiError`; the presentation maps both into a message the worker can read.
11. **Every failure of the API is a problem details (RFC 9457).** Parse it with `parseProblem` from `src/app/shared/infrastructure/http/problem.ts` and never leak the raw payload into the interface.
12. **Never navigate before the promise resolves.** Await the use case, handle the failure, and only then navigate.
13. **One aggregate per file, one use case per service.** A command service does one thing: it validates the command with the domain and calls the gateway.
14. **Comments and identifiers in English, the copy of the interface in Spanish.** The platform speaks Spanish to the worker; the code speaks English.

## Build order

Follow the order — load each reference only when you reach that step.

| # | Step | Reference |
|---|------|-----------|
| 1 | Value objects (branded primitives, validated) | [references/value-objects.md](references/value-objects.md) |
| 2 | Domain errors | [references/domain-errors.md](references/domain-errors.md) |
| 3 | Aggregates | [references/aggregates.md](references/aggregates.md) |
| 4 | Commands and queries | [references/commands-and-queries.md](references/commands-and-queries.md) |
| 5 | Application services (command/query services, signal stores) | [references/application-services.md](references/application-services.md) |
| 6 | Infrastructure gateways | [references/infrastructure-gateways.md](references/infrastructure-gateways.md) |
| 7 | REST contracts and API failures | [references/rest-contracts.md](references/rest-contracts.md) |
| 9 | Pages and orchestration | [references/pages-and-orchestration.md](references/pages-and-orchestration.md) |
| 10 | Components, dialogs and forms | [references/components-and-forms.md](references/components-and-forms.md) |
| 11 | Cross-context access (ACL) | [references/acl-cross-context.md](references/acl-cross-context.md) |
| 12 | Tests | [references/testing.md](references/testing.md) |

## Checklists

Before finishing a change in a context, verify:

- [ ] The domain layer imports nothing from `@angular/*`.
- [ ] The presentation layer imports no gateway and no `HttpClient`.
- [ ] Every command has a command service, and every query has a query service.
- [ ] Every gateway method returns a domain model, never a resource type.
- [ ] Every contract type mirrors the OpenAPI schema of the backend.
- [ ] Every value object has a `parse*` factory that validates and a `restore*` factory that trusts the backend.
- [ ] The templates use `@if`/`@for`/`@switch` and the components use `input()`/`output()`.
- [ ] The failure messages are shown to the worker in Spanish and never expose a raw payload.
- [ ] The specs of the touched layers are added or updated and `bun run test` passes.
