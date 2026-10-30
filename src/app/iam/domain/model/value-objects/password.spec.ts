import { describe, expect, it } from 'vitest';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, Password } from './password';

describe('Password', () => {
  it('acepta una contraseña dentro de los límites', () => {
    expect(Password.create('the-password')).toBe('the-password');
    expect(Password.create('a'.repeat(PASSWORD_MAX_LENGTH))).toHaveLength(PASSWORD_MAX_LENGTH);
  });

  it('no normaliza la contraseña: los espacios son parte de ella', () => {
    expect(Password.create(' the-password ')).toBe(' the-password ');
  });

  it('rechaza una contraseña vacía', () => {
    expect(() => Password.create('')).toThrow();
  });

  it('rechaza una contraseña más corta que el límite', () => {
    expect(() => Password.create('a'.repeat(PASSWORD_MIN_LENGTH - 1))).toThrow();
  });

  it('rechaza una contraseña más larga que el límite', () => {
    expect(() => Password.create('a'.repeat(PASSWORD_MAX_LENGTH + 1))).toThrow();
  });
});
