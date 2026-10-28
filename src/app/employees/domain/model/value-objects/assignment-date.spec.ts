import { describe, expect, it } from 'vitest';
import { AssignmentDate } from './assignment-date';

describe('AssignmentDate', () => {
  it('restores the actual date for comparisons', () => {
    expect(
      AssignmentDate.restore('2024-02-29').isBefore(AssignmentDate.restore('2024-03-01')),
    ).toBe(true);
    expect(AssignmentDate.restore('2024-03-01').isAfter(AssignmentDate.restore('2024-02-29'))).toBe(
      true,
    );
  });

  it('accepts leap days and rejects invalid restored dates', () => {
    expect(AssignmentDate.create('2024-02-29', 'start').value).toBe('2024-02-29');
    expect(() => AssignmentDate.restore('2023-02-29')).toThrow();
  });
});
