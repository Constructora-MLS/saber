import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UpdateGroupCommand } from '../../../application/commands/group-commands';
import { AuthSessionStore } from '../../../application/session/auth-session.store';
import { Group } from '../../../domain/model/aggregates/group';
import {
  EffectivePermissions,
  mayEditPermission,
} from '../../../domain/model/value-objects/effective-permissions';
import {
  GROUP_PERMISSION_KEYS,
  GroupPermissionKey,
} from '../../../domain/model/value-objects/group-permissions';
import {
  closedPermissionKeys,
  createGroupUpdateCommand,
  GroupRoleFormValues,
  hasPendingGroupChanges,
  withoutUnauthorizedChanges,
} from './group-role-form-model';
import {
  GROUP_NAME_MAX_LENGTH,
  GROUP_NAME_MIN_LENGTH,
} from '../../../domain/model/value-objects/group-name';
import { GroupColorPicker } from '../group-color-picker/group-color-picker';
import {
  GROUP_PERMISSION_OPTIONS,
  GroupPermissionOption,
} from '../group-form/group-permission-options';
import { groupNameLengthValidator } from '../group-form/group-name-validator';
import { FieldCounter } from '../../../../shared/presentation/components/field-counter/field-counter';

/**
 * GroupRoleView is the part of the role that the form shows.
 *
 * The form keeps the values of every part of the role, so the administrator
 * moves between the views without losing what he wrote. The view of the
 * members does not edit the role: the form only keeps its values alive.
 */
export type GroupRoleView = 'datos' | 'permisos' | 'miembros';

/**
 * GroupRoleForm configures the data and the permissions of a role.
 *
 * The form is presentational: it renders the role that the platform
 * published and it announces the changes of the administrator. It never
 * talks to the API.
 */
@Component({
  imports: [
    FieldCounter,
    GroupColorPicker,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
  ],
  selector: 'app-group-role-form',
  styleUrl: './group-role-form.scss',
  templateUrl: './group-role-form.html',
})
export class GroupRoleForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly session = inject(AuthSessionStore);

  /** The role that is being configured. */
  readonly group = input.required<Group>();
  /** The part of the role that the form shows. */
  readonly view = input.required<GroupRoleView>();
  /** A localized failure while saving the role. */
  readonly saveFailure = input<string | null>(null);
  /** Whether an update request is in progress. */
  readonly busy = input(false);

  /** The partial edit was requested. */
  readonly saveRequested = output<UpdateGroupCommand>();
  /** The form has a net change from the role that the platform published. */
  readonly pendingChangesChange = output<boolean>();

  /** All the permissions of the role, in the order they are offered. */
  protected readonly permissionOptions: readonly GroupPermissionOption[] = GROUP_PERMISSION_OPTIONS;

  /**
   * The permissions that the member that edits the role holds.
   *
   * The platform only lets a member change the permissions that they hold
   * themselves, so the switches of the permissions that they do not hold
   * are closed. The platform remains the authority: the closed switch is the
   * reflection of a rule that the platform enforces.
   */
  private readonly actorPermissions = this.session.permissions;

  /** The backend limits names to the same boundaries as the form. */
  protected readonly nameMinLength = GROUP_NAME_MIN_LENGTH;
  protected readonly nameMaxLength = GROUP_NAME_MAX_LENGTH;

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [groupNameLengthValidator()]],
    color: ['#000000', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
    manageEmployees: false,
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
    return hasPendingGroupChanges(this.group(), this.permittedValues());
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.formRevision.update((revision) => revision + 1);
      this.lockCapabilities();
      this.pendingChangesChange.emit(this.hasPendingChanges());
    });

    effect(() => {
      // The effect follows the role that is being configured and nothing
      // else: the state of the form and the state of the member are read
      // without being tracked, so a change of the busy state or a refresh
      // of the permissions never takes back the edits of the administrator.
      const group = this.group();
      untracked(() => {
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
    });

    effect(() => {
      if (this.busy()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
        this.lockCapabilities();
      }
    });

    effect(() => {
      // The permissions of the member are read again when they change, so
      // a permission that was revoked closes its switch and takes back the
      // change that the member made with it.
      const actor = this.actorPermissions();
      this.resetUnauthorizedChanges(actor);
      this.lockCapabilities();
    });
  }

  /**
   * mayChange reports whether the member may change the switch of a
   * permission.
   *
   * A member may only enable or disable the permissions that they hold
   * themselves, so the switches of the permissions that they do not hold
   * are closed, whether the role grants them or not.
   */
  protected mayChange(option: GroupPermissionOption): boolean {
    return mayEditPermission(this.actorPermissions(), option.key);
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

    this.saveRequested.emit(createGroupUpdateCommand(this.group(), this.permittedValues()));
  }

  /**
   * permittedValues returns the values of the form without the changes that
   * the member may not make.
   *
   * A member may only change the permissions that they hold themselves: a
   * change of a permission that they lost while they were editing is
   * dropped, so the platform never receives a change that it would refuse
   * and the change that they are allowed to make survives.
   */
  private permittedValues(): GroupRoleFormValues {
    return withoutUnauthorizedChanges(
      this.group(),
      this.form.getRawValue(),
      this.actorPermissions(),
    );
  }

  /**
   * resetUnauthorizedChanges returns the switches of the permissions that
   * the member lost to the value that the role holds.
   *
   * The member may only change the permissions that they hold themselves, so
   * a change that they lost the authority for is taken back and the form
   * does not show a change that the platform would refuse.
   *
   * Only the permissions that the member does not hold are taken back: the
   * switches that the busy state or the administrator of the role close are
   * not changes of the member.
   *
   * The state that the form derives is read again only when a switch really
   * changed: the pending changes and the access to every resource follow the
   * form, and the parent is told that the pending changes changed.
   */
  private resetUnauthorizedChanges(actor: EffectivePermissions): void {
    const group = this.group();
    let restored = false;
    for (const key of GROUP_PERMISSION_KEYS) {
      if (mayEditPermission(actor, key)) {
        continue;
      }
      const control = this.form.controls[key];
      if (control.value !== group.permissions[key]) {
        control.setValue(group.permissions[key], { emitEvent: false });
        control.markAsPristine();
        restored = true;
      }
    }

    if (!restored) {
      return;
    }

    this.formRevision.update((revision) => revision + 1);
    this.pendingChangesChange.emit(
      hasPendingGroupChanges(this.group(), this.permittedValues()),
    );
  }

  /**
   * lockCapabilities closes the capabilities that the member may not change.
   *
   * The administrator permission already gives every capability of the
   * platform, so the capabilities that it makes unnecessary are not
   * editable while it is granted. The values of the role are kept: the
   * platform stores the permissions that the role declares.
   *
   * A member may only enable or disable the permissions that they hold
   * themselves, so the switches of the permissions that they do not hold are
   * closed too, whether the role grants them or not.
   */
  private lockCapabilities(): void {
    if (this.busy()) {
      // Every switch is closed while the form is busy: a change that is in
      // flight must not open a switch that the member may not change.
      this.form.disable({ emitEvent: false });
      return;
    }

    const closed = new Set(this.closedKeys());
    for (const option of this.permissionOptions) {
      const control = this.form.controls[option.key];
      if (closed.has(option.key) && control.enabled) {
        control.disable({ emitEvent: false });
      } else if (!closed.has(option.key) && control.disabled) {
        control.enable({ emitEvent: false });
      }
    }
  }

  /**
   * closedKeys returns the permissions whose switch is closed for the
   * member that edits the role.
   */
  private closedKeys(): readonly GroupPermissionKey[] {
    return closedPermissionKeys(
      this.actorPermissions(),
      this.form.controls.administrator.value,
      this.busy(),
    );
  }
}
