import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { GroupMemberRow, GroupMembers } from './group-members';
import { filterGroupMembers } from './group-members-model';

function membersOf(count: number): GroupMemberRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `7a1b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5${index}`,
    name: `Persona ${index + 1}`,
    email: `persona${index + 1}@akame.local`,
    owner: false,
  }));
}

function panelOf(): GroupMembers {
  return runInInjectionContext(Injector.create({ providers: [] }), () => new GroupMembers());
}

describe('GroupMembers', () => {
  it('announces the removal of a member and the addition of a new one', () => {
    const removeRequested = vi.fn();
    const addRequested = vi.fn();
    const members = panelOf();

    members.removeRequested.subscribe(removeRequested);
    members.addRequested.subscribe(addRequested);

    const member = membersOf(1)[0];
    members.removeRequested.emit(member);
    members.addRequested.emit();

    expect(removeRequested).toHaveBeenCalledWith(member);
    expect(addRequested).toHaveBeenCalled();
  });

  it('announces the page of the members that the administrator wants', () => {
    const pageRequested = vi.fn();
    const members = panelOf();

    members.pageRequested.subscribe(pageRequested);
    members.pageRequested.emit(3);

    expect(pageRequested).toHaveBeenCalledWith(3);
  });

  it('filters the members of the role with the term of the search', () => {
    const members = [
      { id: '1', name: 'Ana Quispe', email: 'ana@akame.local', owner: false },
      { id: '2', name: 'Luis Ramos', email: 'luis@akame.local', owner: false },
    ];

    expect(filterGroupMembers(members, 'quIS').map((member) => member.name)).toEqual([
      'Ana Quispe',
    ]);
    expect(filterGroupMembers(members, 'luis@akame').map((member) => member.id)).toEqual(['2']);
    expect(filterGroupMembers(members, '  ')).toHaveLength(2);
    expect(filterGroupMembers(members, 'nadie')).toEqual([]);
  });
});
