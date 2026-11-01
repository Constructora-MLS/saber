# Pages and orchestration

Location: `src/app/<context>/presentation/pages/`

A page is the frontend controller of a bounded context: it reads the listings through the use cases, it opens the dialogs and it reacts to the events of the components. It is the only presentation element that talks to the application layer.

## Shape

```typescript
// src/app/catalog/presentation/pages/catalog-page/catalog.page.ts
@Component({
  imports: [CatalogTable, FormsModule, Paginator, MatDialogModule /* … */],
  selector: 'app-catalog-page',
  styleUrl: './catalog.page.scss',
  templateUrl: './catalog.page.html',
})
export class CatalogPage {
  private readonly listServices = inject(ListServicesQueryService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly loading = signal(false);
  protected readonly records = signal<readonly CatalogRow[]>([]);
  protected readonly errorTitle = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
}
```

## Rules

- **The file is `<name>.page.ts` and the class is `<Name>Page`.** The folder is `<name>-page/`.
- **The page is standalone and lazy loaded.** The route declares it with `loadComponent: () => import('…').then((m) => m.XPage)`.
- **The page injects application services only.** It never injects `HttpClient` and never a gateway.
- **The page owns the state of the view**: the loading flag, the records, the failure, the selected tab, the filters.
- **The state is a signal.** The template binds the signals directly inside `@if`/`@for`.
- **The page reads the route with `input()`** when the route binds the parameters (`withComponentInputBinding`), and it never subscribes to `ActivatedRoute.params` in the constructor.
- **Await before navigating.** A navigation happens after the promise of the use case resolves and the failure was handled.
- **The page maps the failures into copy.** It uses the module `<context>-error-messages.ts` and shows a headline and a detail; it never shows a stack trace nor a raw payload.
- **The page opens the dialogs.** The dialogs live in `presentation/components/` and are opened with `MatDialog`; the dialog returns the command or the intention.

## The route

```typescript
// src/app/app.routes.ts
{
  path: 'catalog',
  title: 'Catálogos',
  canActivate: [authGuard],
  loadComponent: () =>
    import('./catalog/presentation/pages/catalog-page/catalog.page').then(
      (module) => module.CatalogPage,
    ),
}
```

- The routes are declared in `src/app/app.routes.ts`; a context that needs its own shell declares a `presentation/layouts/<context>-layout/`.
- The title of the route is the name of the section, in Spanish.
- The private routes are protected by `authGuard` (`src/app/iam/presentation/guards/auth.guard.ts`).

## Guards and interceptors

- A guard is a functional `CanActivateFn`/`CanMatchFn` in `presentation/guards/`.
- An interceptor is a functional `HttpInterceptorFn` in `infrastructure/http/`; it is registered in `src/app/app.config.ts` with `provideHttpClient(withInterceptors([…]))`.
- The interceptor of the IAM context adds the access token to the private requests of the platform.

## Checklist

- [ ] The class is named `<Name>Page` and lives in `presentation/pages/<name>-page/`.
- [ ] The page injects application services, never a gateway nor `HttpClient`.
- [ ] The state of the view is held in signals.
- [ ] The navigation happens after the awaited use case.
- [ ] The failures are shown as a headline and a message in Spanish.
