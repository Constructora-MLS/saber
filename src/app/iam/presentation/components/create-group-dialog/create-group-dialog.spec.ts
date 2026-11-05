import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { describe, expect, it, vi } from 'vitest';
import { CreateGroupCommandService } from '../../../application/command-services/group-command-services';
import { Group } from '../../../domain/model/aggregates/group';
import { GroupApiError } from '../../../infrastructure/errors/group-api.error';
import { GroupColor } from '../../../domain/model/value-objects/group-color';
import { GroupId } from '../../../domain/model/value-objects/group-id';
import { GroupName } from '../../../domain/model/value-objects/group-name';
import { GroupPriority } from '../../../domain/model/value-objects/group-priority';
import { restoreGroupStatus } from '../../../domain/model/value-objects/group-status';
import { CreateGroupDialog } from './create-group-dialog';

function group(name: string, color: string): Group {
  return Group.restore({
    id: GroupId.restore('2f4b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e'),
    name: GroupName.restore(name),
    color: GroupColor.restore(color),
    priority: GroupPriority.restore(1),
    permissions: {
      manageEmployees: false,
      manageAssignments: false,
      manageCatalog: false,
      manageCertificates: false,
      manageUsers: false,
      managePermissionsGroups: false,
      administrator: false,
    },
    status: restoreGroupStatus('active'),
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  });
}

describe('CreateGroupDialog', () => {
  function setup(
    execute: (command: { name: string; color: string }) => Promise<Group>,
  ) {
    const close = vi.fn();
    const injector = Injector.create({
      providers: [
        { provide: FormBuilder, useValue: new FormBuilder() },
        { provide: CreateGroupCommandService, useValue: { execute } },
        { provide: MatDialogRef, useValue: { close } },
      ],
    });
    const dialog = runInInjectionContext(injector, () => new CreateGroupDialog()) as unknown as {
      form: FormGroup<{
        name: FormControl<string>;
        color: FormControl<string>;
      }>;
      submit(): Promise<void>;
      cancel(): void;
      selectColor(color: string): void;
      errorMessage(): string | null;
      submitting(): boolean;
    };
    return { dialog, close };
  }

  it('registers the group with the name and the color that the worker chose', async () => {
    const created = group('Supervisión', '#007F64');
    const execute = vi.fn().mockResolvedValue(created);
    const { dialog, close } = setup(execute);

    dialog.form.controls.name.setValue('  Supervisión  ');
    await dialog.submit();

    expect(execute).toHaveBeenCalledWith({ name: 'Supervisión', color: '#007F64' });
    expect(close).toHaveBeenCalledWith(created);
  });

  it('applies the tone that the worker chose in the palette', async () => {
    const execute = vi.fn().mockResolvedValue(group('Personal', '#0057B8'));
    const { dialog } = setup(execute);

    dialog.selectColor('#0057B8');
    dialog.form.controls.name.setValue('Personal');
    await dialog.submit();

    expect(dialog.form.controls.color.value).toBe('#0057B8');
    expect(execute).toHaveBeenCalledWith({ name: 'Personal', color: '#0057B8' });
  });

  it('does not register a group with an invalid name', async () => {
    const execute = vi.fn();
    const { dialog, close } = setup(execute);

    dialog.form.controls.name.setValue('a');
    await dialog.submit();

    expect(execute).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    expect(dialog.errorMessage()).toBeNull();
  });

  it('shows the reason of the rejection of the platform and stays open', async () => {
    const execute = vi
      .fn()
      .mockRejectedValue(new GroupApiError(409, 'group_conflict', 'raw backend detail'));
    const { dialog, close } = setup(execute);

    dialog.form.controls.name.setValue('Supervisión');
    await dialog.submit();

    expect(close).not.toHaveBeenCalled();
    expect(dialog.errorMessage()).toContain('El nombre ya está en uso');
    expect(dialog.errorMessage()).not.toContain('raw backend detail');
    expect(dialog.submitting()).toBe(false);
  });

  it('closes the dialog without registering anything when the worker cancels', () => {
    const { dialog, close } = setup(vi.fn());

    dialog.cancel();

    expect(close).toHaveBeenCalledWith(undefined);
  });
});
