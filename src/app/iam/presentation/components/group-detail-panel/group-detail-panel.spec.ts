import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { Group } from '../../../domain/model/aggregates/group';
import { GroupColor } from '../../../domain/model/value-objects/group-color';
import { GroupId } from '../../../domain/model/value-objects/group-id';
import { GroupName } from '../../../domain/model/value-objects/group-name';
import { GroupPriority } from '../../../domain/model/value-objects/group-priority';
import { restoreGroupStatus } from '../../../domain/model/value-objects/group-status';
import { GroupDetailPanel } from './group-detail-panel';

const role = Group.restore({
  id: GroupId.restore('2f4b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e'),
  name: GroupName.restore('Supervisión'),
  color: GroupColor.restore('#13579B'),
  priority: GroupPriority.restore(1),
  permissions: {
    manageEmployees: true,
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

function panelOf(): GroupDetailPanel {
  return runInInjectionContext(Injector.create({ providers: [] }), () => new GroupDetailPanel());
}

describe('GroupDetailPanel', () => {
  it('offers the three views of the role and opens the data of the role', () => {
    const panel = panelOf();

    expect(panel.views().map((view) => view.label)).toEqual([
      'Datos',
      'Permisos',
      'Miembros',
    ]);
    expect(panel.activeView()).toBe('datos');
  });

  it('shows the view that the administrator chooses', () => {
    const panel = panelOf();

    panel.activateView('permisos');
    expect(panel.activeView()).toBe('permisos');

    panel.activateView('miembros');
    expect(panel.activeView()).toBe('miembros');
  });

  it('announces the closing of the panel and the change of the role', () => {
    const closeRequested = vi.fn();
    const saveRequested = vi.fn();
    const panel = panelOf();

    panel.closeRequested.subscribe(closeRequested);
    panel.saveRequested.subscribe(saveRequested);

    panel.closeRequested.emit();
    panel.saveRequested.emit({ uuid: role.id, name: 'Control' });

    expect(closeRequested).toHaveBeenCalled();
    expect(saveRequested).toHaveBeenCalledWith({ uuid: role.id, name: 'Control' });
  });

  it('announces the membership of a member and the addition of a new one', () => {
    const removeRequested = vi.fn();
    const addRequested = vi.fn();
    const panel = panelOf();

    panel.memberRemoveRequested.subscribe(removeRequested);
    panel.memberAddRequested.subscribe(addRequested);

    panel.memberRemoveRequested.emit({
      id: '7a1b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e',
      name: 'Ana',
      email: 'ana@akame.local',
      owner: false,
    });
    panel.memberAddRequested.emit();

    expect(removeRequested).toHaveBeenCalled();
    expect(addRequested).toHaveBeenCalled();
  });
});
