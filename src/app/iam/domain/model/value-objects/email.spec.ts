import { describe, expect, it } from 'vitest';
import { EMAIL_MAX_LENGTH, Email } from './email';

describe('Email', () => {
  it('normaliza la dirección en minúsculas', () => {
    expect(Email.create('  Admin@Akame.Local ')).toBe('admin@akame.local');
  });

  it('rechaza una dirección que no es una dirección', () => {
    for (const raw of ['', '   ', 'admin', 'admin@akame', 'admin @akame.local']) {
      expect(() => Email.create(raw)).toThrow();
    }
  });

  it('rechaza una dirección más larga que el límite', () => {
    const raw = `${'a'.repeat(EMAIL_MAX_LENGTH)}@akame.local`;

    expect(() => Email.create(raw)).toThrow();
  });
});
