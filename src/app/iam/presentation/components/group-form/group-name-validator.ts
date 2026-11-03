import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import {
  GROUP_NAME_MAX_LENGTH,
  GROUP_NAME_MIN_LENGTH,
} from '../../../domain/model/value-objects/group-name';

/** groupNameLengthValidator mirrors the backend's trimmed Unicode name rules. */
export function groupNameLengthValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = typeof control.value === 'string' ? control.value : '';
    const name = raw.trim();
    if (name.length === 0) {
      return { required: true };
    }

    const length = [...name].length;
    if (length < GROUP_NAME_MIN_LENGTH) {
      return { minlength: { requiredLength: GROUP_NAME_MIN_LENGTH, actualLength: length } };
    }
    if (length > GROUP_NAME_MAX_LENGTH) {
      return { maxlength: { requiredLength: GROUP_NAME_MAX_LENGTH, actualLength: length } };
    }
    if (
      [...name].some((character) => {
        const code = character.codePointAt(0) ?? 0;
        return code < 0x20 || (code >= 0x7f && code <= 0x9f);
      })
    ) {
      return { controlCharacters: true };
    }
    return null;
  };
}
