# Infrastructure gateways

Location: `src/app/<context>/infrastructure/gateways/`

The gateway is the boundary between the application and the remote API. It owns the HTTP, the URLs, the query parameters and the translation of the wire format into the domain model.

## Rules

- **A gateway, not a repository.** The backend is an external system. Never simulate an in-memory collection with `save()`/`delete()`.
- **Concrete `@Injectable({ providedIn: 'root' })` service.** No interface + `…Impl` pair unless there is a real runtime polymorphism.
- **`inject(HttpClient)` and `inject(API_BASE_URL)`.** The base URL comes from the token of `src/app/api.config.ts`; it is never hardcoded in the gateway.
- **The gateway is stateless.** It never keeps a collection, a cache, or the state of the interface.
- **The methods return the domain model.** The resource types of the contract never escape the gateway.
- **The input of the gateway uses the domain types.** The value objects travel from the command service to the gateway and back.
- **The failures are translated.** Every HTTP call ends with `catchError` and the translation of the response into `<Context>ApiError`.

## Shape

```typescript
// src/app/catalog/infrastructure/gateways/catalog.gateway.ts
@Injectable({ providedIn: 'root' })
export class CatalogGateway {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  async listWorkUnits(criteria: WorkUnitCriteria): Promise<CatalogPage<WorkUnit>> {
    const params = this.params(criteria);
    const serviceId = criteria.serviceId;
    const page = await this.get<WorkUnitPageResource>(
      '/work-units',
      serviceId ? params.set('serviceId', serviceId) : params,
    );

    return {
      items: page.items.map((item) => this.toWorkUnit(item)),
      page: page.page,
      totalPages: page.totalPages,
      total: page.total,
    };
  }

  private async get<T>(path: string, params: HttpParams): Promise<T> {
    return firstValueFrom(
      this.http
        .get<T>(`${this.baseUrl}${path}`, { params })
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );
  }

  private toFailure(error: HttpErrorResponse) {
    return throwError(() => toCatalogApiError(error.status, error.error));
  }

  private toWorkUnit(resource: WorkUnitResource): WorkUnit {
    return WorkUnit.restore(
      resource.uuid,
      UnitCode.restore(resource.code),
      CatalogName.restore(resource.name),
      this.description(resource.description),
      resource.serviceId,
      resource.serviceName,
      resource.status,
    );
  }
}
```

## The private helpers of a gateway

- `get`, `post`, `patch`, `delete`: the four HTTP verbs the platform publishes. Each one wraps `firstValueFrom` and the `catchError` that translates the failure.
- `params(criteria)`: builds the `HttpParams` of a listing, adding a parameter only when it carries a value.
- `toX(resource)`: the translation of a resource into the aggregate, one per aggregate of the context. It uses the `restore` factory of the value objects.
- The optional fields are read defensively: `resource.description === undefined ? null : …`.

## The verbs of the platform

| Intent | Verb |
|---|---|
| Read a listing or a record | `GET` |
| Register a record | `POST` |
| Modify a record | `PATCH` |
| Remove a record | `DELETE` |

The verb and the path come from the OpenAPI contract of the backend (`akame`). When the contract changes, the gateway and the contract file change together.

## Checklist

- [ ] The class is named `<Context>Gateway` and lives in `infrastructure/gateways/`.
- [ ] The base URL comes from `inject(API_BASE_URL)`.
- [ ] Every method returns a domain model, never a resource.
- [ ] Every call translates the failure into `<Context>ApiError`.
- [ ] The gateway holds no state.
