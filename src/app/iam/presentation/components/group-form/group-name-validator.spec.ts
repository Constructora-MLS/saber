import '@angular/compiler';
import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { groupNameLengthValidator } from './group-name-validator';

describe('groupNameLengthValidator', () => {
  const validate = groupNameLengthValidator();

  it('accepts the exact backend name-length boundaries by Unicode code point', () => {
    expect(validate(new FormControl('😀'.repeat(2)))).toBeNull();
    expect(validate(new FormControl('😀'.repeat(120)))).toBeNull();
  });

  it('rejects names outside the backend length boundaries', () => {
    expect(validate(new FormControl('a'))).toMatchObject({ minlength: { requiredLength: 2 } });
    expect(validate(new FormControl('😀'.repeat(121)))).toMatchObject({
      maxlength: { requiredLength: 120, actualLength: 121 },
    });
    expect(validate(new FormControl('   '))).toEqual({ required: true });
  });

  it('rejects control characters that the backend refuses', () => {
    expect(validate(new FormControl('Jefes\nObra'))).toEqual({ controlCharacters: true });
  });
});
