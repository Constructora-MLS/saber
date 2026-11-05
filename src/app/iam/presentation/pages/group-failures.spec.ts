import { describe, expect, it } from 'vitest';
import { describeGroupFailure } from './group-failures';

describe('describeGroupFailure', () => {
  it('localizes an authority refusal without showing the backend detail', () => {
    const failure = describeGroupFailure(
      Object.assign(new Error('The member is not allowed to perform this action.'), {
        status: 403,
        code: 'forbidden',
      }),
    );

    expect(failure.message).toContain('permisos o la jerarquía');
    expect(failure.message).not.toContain('The member');
  });

  it('describes an order conflict as a refreshable concurrency failure', () => {
    const failure = describeGroupFailure(
      Object.assign(new Error('The hierarchy changed.'), {
        status: 409,
        code: 'group_order_conflict',
      }),
      'No se pudo reordenar',
    );

    expect(failure.title).toBe('No se pudo reordenar');
    expect(failure.message).toContain('otra sesión');
    expect(failure.message).not.toContain('The hierarchy');
  });
});
