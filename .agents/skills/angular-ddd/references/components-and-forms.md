# Components, dialogs and forms

Location: `src/app/<context>/presentation/components/`

A component renders and captures. It receives its data through inputs and announces its intentions through outputs. It never calls the API, never navigates and never holds the state of the context.

## A presentational component

```typescript
// src/app/catalog/presentation/components/catalog-table/catalog-table.ts
@Component({
  imports: [MatButtonModule, MatIconModule, MatMenuModule, MatProgressSpinnerModule, TableState],
  selector: 'app-catalog-table',
  styleUrl: './catalog-table.scss',
  templateUrl: './catalog-table.html',
})
export class CatalogTable {
  /** The caption of the table, read by the assistive technologies. */
  readonly caption = input.required<string>();
  /** The columns of the table. */
  readonly columns = input.required<readonly CatalogColumn[]>();
  /** The records of the table. */
  readonly rows = input.required<readonly CatalogRow[]>();
  /** Whether the table is waiting for the records. */
  readonly loading = input(false);

  /** The record whose edition was requested. */
  readonly editRequested = output<CatalogRow>();
  /** The record whose deletion was requested. */
  readonly deleteRequested = output<CatalogRow>();
  /** The consultation of the catalog was requested again. */
  readonly retryRequested = output<void>();
}
```

## Rules

- **The file is `<name>.ts` (or `<name>.component.ts`) and the class is `<Name>`.** The folder is `<name>/` with its `.html` and `.scss`.
- **`input()` and `output()` only.** The legacy `@Input()`/`@Output()` decorators are forbidden.
- **The inputs are `readonly` and documented** with a short JSDoc that says what the value means.
- **The component is standalone.** The `imports` array lists exactly what the template uses: the Material modules, the shared components and the child components.
- **The component is presentational.** It does not inject a gateway, a store or the router. When it needs a service (a snack bar, a dialog), it is because the component owns that interaction.
- **The data it renders is a presentation model** declared next to the component (`CatalogRow`, `CatalogColumn`), not the raw aggregate, when the shape of the table differs from the shape of the domain.
- **The shared styles of a family of components live in a partial** (`_catalog-dialog.scss`) imported by the styles of the family.

## A dialog

A dialog collects the data of an intention and closes with the result:

```typescript
// src/app/catalog/presentation/components/create-work-unit-dialog/create-work-unit-dialog.ts
export class CreateWorkUnitDialog {
  readonly data = inject<CreateWorkUnitDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<CreateWorkUnitDialogResult>);
}
```

- The dialog declares the data it receives (`MAT_DIALOG_DATA`) and the result it returns (`MatDialogRef`).
- It validates the form before it closes, and it shows the message of the rejected field next to the input.
- The dialog does not call the use case: it returns the intention and the page executes it.

## A form

- Use the reactive forms (`ReactiveFormsModule`) with `inject(FormBuilder)`.
- The controls carry the validators of the interface; the invariants of the domain are checked by the command service, not by the form.
- On submit, the component emits an explicit command with `output()`; it never triggers the HTTP itself.
- Mark the form as touched before showing the errors, so the worker sees what is wrong.

## Accessibility and layout

- The label of every control is associated with it; the table has a caption read by the assistive technologies.
- The empty state, the loading state and the failure state are three explicit states of the component, not an empty table.
- The styles follow the theme of the platform: the Material components, the local typography and the `_*.scss` partials of the family.

## Checklist

- [ ] The component uses `input()`/`output()` and is standalone.
- [ ] It injects no gateway and no application service unless it owns the interaction.
- [ ] The inputs and the outputs are documented.
- [ ] The dialog declares its data and its result, and it does not call the use case.
- [ ] The form emits a command and does not trigger the HTTP.
