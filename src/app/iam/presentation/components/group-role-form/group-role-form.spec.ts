// @vitest-environment jsdom
import '@angular/compiler';
import { signal } from '@angular/core';
import { ɵInputSignalNode as InputSignalNode, ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { SIGNAL } from '@angular/core/primitives/signals';
import { TestBed } from '@angular/core/testing';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AuthSessionStore } from '../../../application/session/auth-session.store';
import { Group } from '../../../domain/model/aggregates/group';
import {
  EFFECTIVE_PERMISSIONS,
  EffectivePermissions,
} from '../../../domain/model/value-objects/effective-permissions';
import { GroupColor } from '../../../domain/model/value-objects/group-color';
import { GroupId } from '../../../domain/model/value-objects/group-id';
import { GroupName } from '../../../domain/model/value-objects/group-name';
import { GroupPriority } from '../../../domain/model/value-objects/group-priority';
import { restoreGroupStatus } from '../../../domain/model/value-objects/group-status';
import { GroupRoleForm } from './group-role-form';

const group = Group.restore({
  id: GroupId.restore('2f4b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e'),
  name: GroupName.restore('Supervisión'),
  color: GroupColor.restore('#13579B'),
  priority: GroupPriority.restore(1),
  permissions: {
    manageEmployees: true,
    manageAssignments: false,
    manageCatalog: false,
    manageCertificates: false,
    manageUsers: true,
    managePermissionsGroups: false,
    administrator: false,
  },
  status: restoreGroupStatus('active'),
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
});

/** The permissions of a member que administra los grupos y los miembros. */
const administratorOfGroups: EffectivePermissions = {
  ...EFFECTIVE_PERMISSIONS,
  managePermissionsGroups: true,
  manageUsers: true,
};

/**
 * publishInput publishes a value in an input signal of the component.
 *
 * La suite corre el componente con el compilador de JIT, que no registra
 * las entradas de señal, así que la entrada se publica por su propia señal.
 */
function publishInput<T>(signal: unknown, value: T): void {
  const node = (signal as { [SIGNAL]: InputSignalNode<T, T> })[SIGNAL];
  node.applyValueToInputSignal(node, value);
}

describe('GroupRoleForm', () => {
  beforeAll(async () => {
    // La suite corre sin navegador, así que el entorno de las pruebas es el
    // de la plataforma: es el entorno que tiene el planificador de los
    // efectos y las pruebas ejecutan a mano el trabajo pendiente.
    const { BrowserTestingModule, platformBrowserTesting } =
      await import('@angular/platform-browser/testing');
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

    // Las plantillas externas de los componentes se resuelven con una
    // plantilla vacía: la suite lee el comportamiento del formulario y no su
    // marcado.
    await resolveComponentResources(async () => '');
  });

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  /**
   * setup construye el formulario con los permisos del miembro que edita
   * el rol.
   */
  function setup(permissions: EffectivePermissions = administratorOfGroups) {
    const actor = signal(permissions);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthSessionStore,
          useValue: { permissions: actor.asReadonly() },
        },
      ],
    });

    const fixture = TestBed.createComponent(GroupRoleForm);
    publishInput(fixture.componentInstance.group, group);
    publishInput(fixture.componentInstance.view, 'permisos');
    fixture.detectChanges();
    TestBed.tick();

    const pending: boolean[] = [];
    fixture.componentInstance.pendingChangesChange.subscribe((value) => pending.push(value));

    const form = fixture.componentInstance as unknown as {
      form: { controls: Record<string, { value: unknown }> };
      hasPendingChanges(): boolean;
      fullAccess(): boolean;
    };

    return { fixture, actor, pending, form };
  }

  it('no pierde la edición del nombre cuando el formulario se ocupa', () => {
    const { fixture, form, pending } = setup();

    fixture.componentInstance.form.controls.name.setValue('Control');
    fixture.detectChanges();

    publishInput(fixture.componentInstance.busy, true);
    fixture.detectChanges();
    TestBed.tick();

    expect(form.form.controls['name']?.value).toBe('Control');
    expect(form.hasPendingChanges()).toBe(true);
    expect(pending).not.toContain(false);
  });

  it('no pierde la edición del nombre cuando los permisos del miembro se renuevan', () => {
    const { fixture, actor, form, pending } = setup();

    fixture.componentInstance.form.controls.name.setValue('Control');
    fixture.detectChanges();

    // La plataforma renueva los permisos del miembro y estos son los
    // mismos: el formulario no puede descartar la edición.
    actor.set({ ...administratorOfGroups });
    fixture.detectChanges();
    TestBed.tick();

    expect(form.form.controls['name']?.value).toBe('Control');
    expect(form.hasPendingChanges()).toBe(true);
    expect(pending).not.toContain(false);
  });

  it('recupera solo el cambio del permiso que el miembro perdió', () => {
    const { fixture, actor, form, pending } = setup();

    // El miembro apaga el permiso que tiene y cambia el nombre del rol.
    fixture.componentInstance.form.controls.manageUsers.setValue(false);
    fixture.componentInstance.form.controls.name.setValue('Control');
    fixture.detectChanges();

    // El miembro pierde el permiso mientras edita.
    actor.set({
      ...EFFECTIVE_PERMISSIONS,
      managePermissionsGroups: true,
    });
    fixture.detectChanges();
    TestBed.tick();

    // Solo se recupera el cambio del permiso perdido: el nombre sigue
    // editado y el estado que el formulario deriva está de acuerdo.
    expect(form.form.controls['manageUsers']?.value).toBe(true);
    expect(form.form.controls['name']?.value).toBe('Control');
    expect(form.hasPendingChanges()).toBe(true);
    expect(pending.at(-1)).toBe(true);
  });

  it('recupera el cambio del acceso total y avisa que no hay cambios', () => {
    const { fixture, actor, form, pending } = setup({
      ...EFFECTIVE_PERMISSIONS,
      managePermissionsGroups: true,
      administrator: true,
    });

    // El miembro concede el acceso a cada recurso del rol.
    fixture.componentInstance.form.controls.administrator.setValue(true);
    fixture.detectChanges();
    expect(form.fullAccess()).toBe(true);

    // El miembro pierde el acceso total mientras edita.
    actor.set({
      ...EFFECTIVE_PERMISSIONS,
      managePermissionsGroups: true,
    });
    fixture.detectChanges();
    TestBed.tick();

    // El acceso total vuelve al valor del rol y el formulario ya no dice
    // que hay cambios pendientes.
    expect(form.form.controls['administrator']?.value).toBe(false);
    expect(form.fullAccess()).toBe(false);
    expect(form.hasPendingChanges()).toBe(false);
    expect(pending.at(-1)).toBe(false);
  });
});
