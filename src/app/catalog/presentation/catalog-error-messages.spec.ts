import { describe, expect, it } from 'vitest';
import { CatalogApiError } from '../infrastructure/errors/catalog-api.error';
import { catalogApiErrorMessage, catalogFieldErrors } from './catalog-error-messages';

describe('catalogApiErrorMessage', () => {
  it.each([
    [409, 'work_unit_code_already_exists', 'El código de la unidad de trabajo ya está en uso.'],
    [404, 'not_found', 'El registro ya no existe o no está disponible.'],
    [409, 'service_in_use', 'No se puede eliminar el servicio porque tiene unidades de trabajo asociadas.'],
    [409, 'regime_in_use', 'No se puede eliminar el régimen porque está asignado a empleados.'],
    [503, 'database_unavailable', 'La base de datos no está disponible. Inténtalo nuevamente en unos instantes.'],
  ])('traduce %s/%s sin exponer el detalle del backend', (status, code, expected) => {
    const error = new CatalogApiError(status, code, 'English backend detail');
    expect(catalogApiErrorMessage(error, 'fallback')).toBe(expected);
  });

  it('obtiene los mensajes de validación mediante messageOfField', () => {
    const error = new CatalogApiError(400, 'validation_error', 'English detail', [
      { field: 'name', message: 'El nombre ya está ocupado.' },
    ]);

    expect(catalogFieldErrors(error, ['name', 'description'])).toEqual({
      name: 'El nombre ya está ocupado.',
    });
  });
});
