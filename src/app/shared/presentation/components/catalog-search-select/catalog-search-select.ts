// Package catalogsearchselect holds the selector of the records of a
// catalog.
//
// The selector looks for a record among the ones that match a term, so a
// form never offers the whole catalog.
// package catalogsearchselect

import {
  Component,
  DestroyRef,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInput, MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

/**
 * The time the search settles before it is asked to the platform.
 *
 * The catalog is not read on every keystroke: the term settles first.
 */
const SEARCH_DELAY_MS = 300;

/**
 * CatalogOption is a record of a catalog that a selector offers.
 */
export interface CatalogOption {
  /** The identifier of the record. */
  readonly id: string;
  /** The text of the record. */
  readonly label: string;
  /** The secondary text of the record, when it carries one. */
  readonly detail?: string;
  /** Whether the record is the one that the form modifies. */
  readonly current?: boolean;
}

/**
 * CatalogSearchSelect looks for a record of a catalog.
 *
 * The component is presentational: it shows the term, it offers the
 * options that the caller found and it announces the term that the caller
 * must look for. It never talks to the API.
 *
 * The component is a control of a form: the value of the control is the
 * identifier of the chosen record, and the text of the field is the name of
 * the record.
 */
@Component({
  imports: [
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CatalogSearchSelect),
      multi: true,
    },
  ],
  selector: 'app-catalog-search-select',
  styleUrl: './catalog-search-select.scss',
  templateUrl: './catalog-search-select.html',
})
export class CatalogSearchSelect implements ControlValueAccessor {
  /** The label of the field. */
  readonly label = input.required<string>();
  /** The placeholder of the field. */
  readonly placeholder = input('');
  /** The message shown when the record was not chosen. */
  readonly requiredMessage = input('');
  readonly required = input(true);
  readonly clearable = input(false);
  /** The supporting text of the field. */
  readonly hint = input('');
  /** The message shown when no record matches the term. */
  readonly emptyText = input('No hay registros que coincidan con la búsqueda.');
  /** Whether the empty-search message is shown. */
  readonly showEmptyText = input(true);
  /** The options that the selector offers. */
  readonly options = input<readonly CatalogOption[]>([]);
  /** Whether the selector waits for the answer of the platform. */
  readonly loading = input(false);
  /** The failure that prevented the search. */
  readonly error = input<string | null>(null);

  /** The term that the worker types. */
  protected readonly query = signal('');
  /** Whether the worker already used the field. */
  protected readonly touched = signal(false);
  /** Whether the field is disabled. */
  protected readonly disabled = signal(false);
  /** The identifier of the chosen record. */
  protected readonly selected = signal('');

  /**
   * Whether the field shows a failure.
   *
   * The field has no control of its own, so the state of the error is
   * published to the input: the field paints the failure of the selection.
   */
  protected readonly invalid = computed(
    () => this.error() !== null || (this.required() && this.touched() && !this.selected()),
  );

  /** The term that the platform must look for. */
  readonly searched = output<string>();
  /** The identifier of the chosen record, empty when the choice was dropped. */
  readonly chosen = output<string>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly input = viewChild(MatInput);

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.clearTimer());

    // The label of the chosen record is shown as soon as the record is
    // known, so a form that starts with a value shows its name.
    effect(() => {
      this.options();
      this.syncLabel();
    });

    // The field has no control of its own, so the state of the error is
    // published to the input: the field paints the failure of the
    // selection.
    effect(() => {
      const input = this.input();
      if (input) {
        input.errorState = this.invalid();
      }
    });
  }

  /**
   * writeValue shows the record that the form holds.
   */
  writeValue(value: string): void {
    this.selected.set(value ?? '');
    this.syncLabel();
  }

  /**
   * registerOnChange stores the function that publishes the choice.
   */
  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  /**
   * registerOnTouched stores the function that publishes the use of the
   * field.
   */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /**
   * setDisabledState disables the field.
   */
  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  /**
   * onInput looks for the records that match the term.
   */
  protected onInput(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.query.set(term);

    // The term no longer names the chosen record, so the choice is
    // dropped and the worker has to pick one again.
    const option = this.options().find((item) => item.id === this.selected());
    if (this.selected() && (!option || term !== option.label)) {
      this.clearSelection();
    }

    this.schedule(term);
  }

  /**
   * onSelected keeps the identifier of the chosen record.
   */
  protected onSelected(event: MatAutocompleteSelectedEvent): void {
    const id = event.option.value as string;
    const option = this.options().find((item) => item.id === id);
    const label = option?.label ?? '';

    this.selected.set(id);
    this.query.set(label);
    this.write(label);
    this.onChange(id);
    this.onTouched();
    this.chosen.emit(id);
  }

  /**
   * onBlur publishes that the field was used.
   */
  protected clear(): void {
    this.clearTimer();
    this.query.set('');
    this.write('');
    this.clearSelection();
    this.onTouched();
    this.searched.emit('');
  }

  protected onBlur(): void {
    this.touched.set(true);
    this.onTouched();
  }

  /**
   * syncLabel shows the name of the chosen record.
   */
  private syncLabel(): void {
    const id = this.selected();
    if (!id) {
      return;
    }

    const option = this.options().find((item) => item.id === id);
    if (option) {
      this.query.set(option.label);
      this.write(option.label);
    }
  }

  /**
   * write shows the name of the chosen record in the field.
   *
   * The platform writes the identifier of the record in the field when the
   * worker picks one, so the name is written again over it.
   */
  private write(label: string): void {
    const input = this.input();
    if (input) {
      input.value = label;
    }
  }

  /**
   * clearSelection drops the chosen record.
   */
  private clearSelection(): void {
    this.selected.set('');
    this.onChange('');
    this.chosen.emit('');
  }

  /**
   * schedule asks for the records that match the term once it settles.
   */
  private schedule(term: string): void {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      this.searched.emit(term);
    }, SEARCH_DELAY_MS);
  }

  /**
   * clearTimer cancels the pending search.
   */
  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
