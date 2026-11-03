import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import {
  CreateGroupCommand,
  UpdateGroupCommand,
} from '../../../application/commands/group-commands';
import { Group } from '../../../domain/model/aggregates/group';
import { GroupPermissionKey } from '../../../domain/model/value-objects/group-permissions';
import { createGroupUpdateCommand, hasPendingGroupChanges } from './group-editor-model';
import {
  GROUP_NAME_MAX_LENGTH,
  GROUP_NAME_MIN_LENGTH,
} from '../../../domain/model/value-objects/group-name';
import { groupNameLengthValidator } from './group-name-validator';

/** GroupPermissionOption gives a group permission its worker-facing label. */
interface GroupPermissionOption {
  readonly key: GroupPermissionKey;
  readonly label: string;
  readonly description: string;
}

/** GroupEditor registers or edits a group using the fields allowed for that operation. */
@Component({
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
  ],
  selector: 'app-group-editor',
  styleUrl: './group-editor.scss',
  templateUrl: './group-editor.html',
})
export class GroupEditor {
  private readonly formBuilder = inject(FormBuilder);

  /** The group details currently being edited. */
  readonly group = input<Group | null>(null);
  /** Whether the form registers a new group instead of editing an existing one. */
  readonly creating = input(false);
  /** Whether the details of the selected group are loading. */
  readonly loading = input(false);
  /** A localized failure while reading the selected group. */
  readonly loadFailure = input<string | null>(null);
  /** A localized failure while saving the selected group. */
  readonly saveFailure = input<string | null>(null);
  /** Whether an update request is in progress. */
  readonly busy = input(false);

  /** A new group registration was requested. */
  readonly createRequested = output<CreateGroupCommand>();
  /** The partial edit was requested. */
  readonly saveRequested = output<UpdateGroupCommand>();
  /** Closing the editor was requested. */
  readonly closeRequested = output<void>();
  /** The form has a net change from its currently loaded group. */
  readonly pendingChangesChange = output<boolean>();
  /** The failed group read should be attempted again. */
  readonly retryRequested = output<void>();

  /** The editable permission switches, in the established IAM vocabulary. */
  protected readonly permissionOptions: readonly GroupPermissionOption[] = [
    {
      key: 'manageEmployees',
      label: 'Administrar personal',
      description: 'Gestionar los registros de personal.',
    },
    {
      key: 'manageAssignments',
      label: 'Administrar asignaciones',
      description: 'Gestionar las asignaciones de trabajo.',
    },
    {
      key: 'manageCatalog',
      label: 'Administrar catálogos',
      description: 'Gestionar los catálogos de la plataforma.',
    },
    {
      key: 'manageCertificates',
      label: 'Administrar certificados',
      description: 'Gestionar los certificados de trabajo.',
    },
    {
      key: 'manageUsers',
      label: 'Administrar usuarios',
      description: 'Gestionar las invitaciones y cuentas.',
    },
    {
      key: 'managePermissionsGroups',
      label: 'Administrar permisos y grupos',
      description: 'Gestionar grupos, permisos y membresías.',
    },
    {
      key: 'administrator',
      label: 'Administrador',
      description: 'Acceso a todos los recursos y funcionalidades.',
    },
  ];

  /** The backend limits names to the same boundaries as the form. */
  protected readonly nameMinLength = GROUP_NAME_MIN_LENGTH;
  protected readonly nameMaxLength = GROUP_NAME_MAX_LENGTH;

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [groupNameLengthValidator()]],
    color: ['#000000', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
    manageEmployees: false,
    manageAssignments: false,
    manageCatalog: false,
    manageCertificates: false,
    manageUsers: false,
    managePermissionsGroups: false,
    administrator: false,
  });

  private readonly formRevision = signal(0);
  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');
  private readonly colorInput = viewChild<ElementRef<HTMLInputElement>>('colorInput');
  private focusedGroupId: string | null = null;
  /** Whether any current value differs from the loaded group. */
  protected readonly hasPendingChanges = computed(() => {
    this.formRevision();
    const group = this.group();
    if (group === null) {
      if (!this.creating()) {
        return false;
      }
      const values = this.form.getRawValue();
      return values.name.trim().length > 0 || values.color.toUpperCase() !== '#000000';
    }
    return hasPendingGroupChanges(group, this.form.getRawValue());
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.formRevision.update((revision) => revision + 1);
      this.pendingChangesChange.emit(this.hasPendingChanges());
    });

    effect(() => {
      const group = this.group();
      const creating = this.creating();
      const values = group
        ? {
            name: group.name,
            color: group.color,
            ...group.permissions,
          }
        : {
            name: '',
            color: '#000000',
            manageEmployees: false,
            manageAssignments: false,
            manageCatalog: false,
            manageCertificates: false,
            manageUsers: false,
            managePermissionsGroups: false,
            administrator: false,
          };
      this.form.reset(values, { emitEvent: false });
      this.formRevision.update((revision) => revision + 1);
      this.pendingChangesChange.emit(false);
      const focusKey = group?.id ?? (creating ? 'create' : null);
      if (focusKey === null) {
        this.focusedGroupId = null;
      } else if (this.focusedGroupId !== focusKey) {
        const input = this.nameInput();
        if (input) {
          input.nativeElement.focus();
          this.focusedGroupId = focusKey;
        }
      }
    });

    effect(() => {
      if (this.busy()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    });
  }

  /** requestClose lets the page preserve unsaved values until confirmed. */
  protected requestClose(): void {
    this.closeRequested.emit();
  }

  /** retry asks the page to fetch this group's details again. */
  protected retry(): void {
    this.retryRequested.emit();
  }

  /** save emits only changed fields, including permission values set to false. */
  protected save(): void {
    if (this.busy()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.form.controls.name.invalid) {
        this.nameInput()?.nativeElement.focus();
      } else if (this.form.controls.color.invalid) {
        this.colorInput()?.nativeElement.focus();
      }
      return;
    }

    const values = this.form.getRawValue();
    if (this.creating()) {
      this.createRequested.emit({ name: values.name, color: values.color });
      return;
    }

    const group = this.group();
    if (group === null) {
      return;
    }
    const command: UpdateGroupCommand = createGroupUpdateCommand(group, values);
    this.saveRequested.emit(command);
  }
}
