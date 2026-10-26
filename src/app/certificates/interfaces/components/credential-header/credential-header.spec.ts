import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { CredentialHeader } from './credential-header';

function setup() {
  return runInInjectionContext(Injector.create({ providers: [] }), () => new CredentialHeader());
}

describe('header de la credencial pública', () => {
  it('muestra la identidad de la constructora y el título del documento', () => {
    const header = setup();
    expect(header.company()).toBe('Constructora MLS S.A.C.');
    expect(header.title()).toBe('Certificado de trabajo');
    expect(header.subtitle()).toContain('autenticidad');
  });
});
