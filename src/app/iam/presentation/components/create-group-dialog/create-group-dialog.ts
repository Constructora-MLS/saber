import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CreateGroupCommandService } from '../../../application/command-services/group-command-services';
import { Group } from '../../../domain/model/aggregates/group';
import {
  GROUP_NAME_MAX_LENGTH,
  GROUP_NAME_MIN_LENGTH,
} from '../../../domain/model/value-objects/group-name';
import { GroupColorPicker } from '../group-color-picker/group-color-picker';
import { groupNameLengthValidator } from '../group-form/group-name-validator';
import { describeGroupFailure } from '../../pages/group-failures';
import { FieldCounter } from '../../../../shared/presentation/components/field-counter/field-counter';

/** The color that a group carries when it is registered. */
const DEFAULT_GROUP_COLOR = '#007F64';

/**
 * CreateGroupDialog registers a group in the hierarchy.
 *
 * The dialog asks only for the name and the color: the permissions of the
 * group are granted once it exists, because the platform validates them
 * against the hierarchy that the group joins.
 */
@Component({
  imports: [
    FieldCounter,
    GroupColorPicker,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  selector: 'app-create-group-dialog',
  styleUrl: './create-group-dialog.scss',
  templateUrl: './create-group-dialog.html',
})
export class CreateGroupDialog {
  private readonly formBuilder = inject(FormBuilder);
  private readonly createGroup = inject(CreateGroupCommandService);
  private readonly dialogRef = inject<MatDialogRef<CreateGroupDialog, Group | undefined>>(MatDialogRef);

  /** The shortest name that a group accepts. */
  protected readonly nameMinLength = GROUP_NAME_MIN_LENGTH;
  /** The limit of the name of a group. */
  protected readonly nameMaxLength = GROUP_NAME_MAX_LENGTH;

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [groupNameLengthValidator()]],
    color: [
      DEFAULT_GROUP_COLOR,
      [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)],
    ],
  });

  /** The color that the group carries right now. */
  protected readonly color = signal(DEFAULT_GROUP_COLOR);
  /** Whether the registration is running. */
  protected readonly submitting = signal(false);
  /** The message of the failure of the registration. */
  protected readonly errorMessage = signal<string | null>(null);

  /** selectColor applies the tone that the worker chose. */
  protected selectColor(color: string): void {
    this.color.set(color);
    this.form.controls.color.setValue(color);
    this.form.controls.color.markAsDirty();
  }

  /** cancel closes the dialog without registering the group. */
  protected cancel(): void {
    this.dialogRef.close(undefined);
  }

  /**
   * submit registers the group.
   *
   * The dialog stays open when the platform refuses the group, so the
   * worker can correct the name without starting over.
   */
  protected async submit(): Promise<void> {
    if (this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const values = this.form.getRawValue();
    try {
      const group = await this.createGroup.execute({
        name: values.name.trim(),
        color: values.color,
      });
      this.dialogRef.close(group);
    } catch (error) {
      this.errorMessage.set(describeGroupFailure(error, 'No se pudo crear el grupo').message);
    } finally {
      this.submitting.set(false);
    }
  }
}
