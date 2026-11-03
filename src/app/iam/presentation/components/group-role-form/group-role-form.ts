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
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UpdateGroupCommand } from '../../../application/commands/group-commands';
import { Group } from '../../../domain/model/aggregates/group';
import {
  createGroupUpdateCommand,
  hasPendingGroupChanges,
} from './group-permissions-form-model';
import {
  GROUP_NAME_MAX_LENGTH,
  GROUP_NAME_MIN_LENGTH,
} from '../../../domain/model/value-objects/group-name';
import { GroupColorPicker } from '../group-color-picker/group-color-picker';
import {
  GROUP_CAPABILITY_PERMISSIONS,
  GROUP_PERMISSION_OPTIONS,
  GroupPermissionOption,
} from '../group-form/group-permission-options';
import { groupNameLengthValidator } from '../group-form/group-name-validator';

/**
 * GroupPermissionsForm configures the data and the permissions of a role.
 *
 * The form is presentational: it renders the role that the platform
 * published and it announces the changes of the administrator. It never
 * talks to the API.
 */
@Component({
  imports: [
    GroupColorPicker,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
  ],
  selector: 'app-group-permissions-form',
  styleUrl: './group-permissions-form.scss',
  templateUrl: './group-permissions-form.html',
})
export class GroupPermissionsForm {
  private readonly formBuilder = inject(FormBuilder);

  /** The role that is being configured. */
  readonly group = input.required<Group>();
  /** A localized failure while saving the role. */
  readonly saveFailure = input<string | null>(null);
  /** Whether an update request is in progress. */
  readonly busy = input(false);

  /** The partial edit was requested. */
  readonly saveRequested = output<UpdateGroupCommand>();
  /** Leaving the form was requested. */
  readonly cancelRequested = output<void>();
  /** The form has a net change from the role that the platform published. */
  readonly pendingChangesChange = output<boolean>();

  /** All the permissions of the role, in the order they are offered. */
  protected readonly permissionOptions: readonly GroupPermissionOption[] = GROUP_PERMISSION_OPTIONS;
  /** The capabilities that the role grants, each one with its own name. */
  protected readonly capabilityOptions: readonly GroupPermissionOption[] =
    GROUP_CAPABILITY_PERMISSIONS;

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
  private focusedGroupId: string | null = null;

  /** The color that the role carries right now. */
  protected readonly color = signal('#000000');

  /** Whether the role grants the access to every resource of the platform. */
  protected readonly fullAccess = computed(() => {
    this.formRevision();
    return this.form.controls.administrator.value;
  });
  /** Whether any current value differs from the published role. */
  protected readonly hasPendingChanges = computed(() => {
    this.formRevision();
    return hasPendingGroupChanges(this.group(), this.form.getRawValue());
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.formRevision.update((revision) => revision + 1);
      this.lockCapabilities();
      this.pendingChangesChange.emit(this.hasPendingChanges());
    });

    effect(() => {
      const group = this.group();
      this.form.reset(
        {
          name: group.name,
          color: group.color,
          ...group.permissions,
        },
        { emitEvent: false },
      );
      this.color.set(group.color);
      this.lockCapabilities();
      this.formRevision.update((revision) => revision + 1);
      this.pendingChangesChange.emit(false);
      if (this.focusedGroupId !== group.id) {
        this.nameInput()?.nativeElement.focus();
        this.focusedGroupId = group.id;
      }
    });

    effect(() => {
      if (this.busy()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
        this.lockCapabilities();
      }
    });
  }

  /** selectColor applies the tone that the worker chose. */
  protected selectColor(color: string): void {
    this.color.set(color);
    this.form.controls.color.setValue(color);
    this.form.controls.color.markAsDirty();
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
      }
      return;
    }

    this.saveRequested.emit(createGroupUpdateCommand(this.group(), this.form.getRawValue()));
  }

  /**
   * lockCapabilities closes the capabilities when the role grants the
   * access to every resource.
   *
   * The administrator permission already gives every capability of the
   * platform, so the capabilities that it makes unnecessary are not
   * editable while it is granted. The values of the role are kept: the
   * platform stores the permissions that the role declares.
   */
  private lockCapabilities(): void {
    const locked = this.form.controls.administrator.value;
    for (const option of this.capabilityOptions) {
      const control = this.form.controls[option.key];
      if (locked && control.enabled) {
        control.disable({ emitEvent: false });
      } else if (!locked && control.disabled) {
        control.enable({ emitEvent: false });
      }
    }
  }
}
