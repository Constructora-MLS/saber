import '@angular/compiler';
import { FormBuilder } from '@angular/forms';
import { Injector, runInInjectionContext } from '@angular/core';
import { SimpleChange } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { RecoveryLinkForm } from './recovery-link-form.component';

class Form extends RecoveryLinkForm {
  get fields() {
    return this.form;
  }
  get address() {
    return this.form.getRawValue().email;
  }
  get dirty() {
    return this.form.controls.email.dirty;
  }
  fill(email: string) {
    this.form.setValue({ email });
  }
  /**
   * type writes the address as the member does: the control of the form
   * becomes dirty.
   */
  type(email: string) {
    this.form.controls.email.setValue(email);
    this.form.controls.email.markAsDirty();
  }
  send() {
    return this.submit();
  }
  /**
   * prefill delivers the address of the page to the form, the same way that
   * the page does when it binds the address of the session.
   */
  prefill(email: string) {
    this.ngOnChanges({ email: new SimpleChange(undefined, email, true) });
  }
  /**
   * reject delivers the rejection of the platform to the form, the same way
   * that the page does when it binds the message to the field.
   */
  reject(message: string) {
    this.ngOnChanges({ emailError: new SimpleChange(null, message, false) });
  }
  /**
   * forget takes the rejection of the platform out of the form, the same way
   * that the page does when it starts another attempt.
   */
  forget() {
    this.ngOnChanges({
      emailError: new SimpleChange('El correo electrónico no es válido.', null, false),
    });
  }
}

describe('RecoveryLinkForm', () => {
  function setup() {
    const injector = Injector.create({
      providers: [{ provide: FormBuilder, useValue: new FormBuilder() }],
    });
    const form = runInInjectionContext(injector, () => new Form());
    // The output is a signal: the tests read the values that it published.
    const published: unknown[] = [];
    form.request.subscribe((command) => published.push(command));
    return { form, published };
  }

  it('no entrega la dirección cuando el formulario está vacío', () => {
    const { form, published } = setup();

    form.send();

    expect(published).toHaveLength(0);
    expect(form.fields.invalid).toBe(true);
  });

  it('no entrega una dirección que no es un correo', () => {
    const { form, published } = setup();

    form.fill('not-an-email');
    form.send();

    expect(published).toHaveLength(0);
  });

  it('entrega la dirección que el usuario escribió', () => {
    const { form, published } = setup();

    form.fill('admin@akame.local');
    form.send();

    expect(published).toEqual([{ email: 'admin@akame.local' }]);
  });

  it('prellena el control con la dirección que la página le da', () => {
    const { form } = setup();

    form.prefill('admin@akame.local');

    expect(form.address).toBe('admin@akame.local');
  });

  it('no escribe la dirección de la página sobre lo que el usuario escribió', () => {
    const { form } = setup();

    form.type('otra@akame.local');
    form.prefill('admin@akame.local');

    expect(form.address).toBe('otra@akame.local');
  });

  it('escribe el rechazo de la plataforma en el control del correo', () => {
    const { form } = setup();

    form.fill('admin@akame.local');
    form.reject('El correo electrónico no es válido.');

    // The control carries the rejection, so the field is in the error state
    // of Material and the message is in the DOM, next to the address.
    expect(form.fields.controls.email.hasError('server')).toBe(true);
    expect(form.fields.controls.email.getError('server')).toBe(
      'El correo electrónico no es válido.',
    );
    expect(form.fields.controls.email.touched).toBe(true);
    expect(form.fields.controls.email.invalid).toBe(true);
  });

  it('quita el rechazo de la plataforma cuando la página empieza otro intento', () => {
    const { form } = setup();

    form.fill('admin@akame.local');
    form.reject('El correo electrónico no es válido.');
    form.forget();

    expect(form.fields.controls.email.hasError('server')).toBe(false);
    expect(form.fields.controls.email.valid).toBe(true);
  });

  it('deja enviar otra dirección después de un rechazo de la plataforma', () => {
    const { form, published } = setup();

    form.fill('admin@akame.local');
    form.reject('El correo electrónico no es válido.');
    form.send();

    expect(published).toEqual([{ email: 'admin@akame.local' }]);
  });
});
