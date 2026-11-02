import '@angular/compiler';
import { FormBuilder } from '@angular/forms';
import { Injector, runInInjectionContext } from '@angular/core';
import { SimpleChange } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { ResetPasswordForm } from './reset-password-form.component';

class Form extends ResetPasswordForm {
  get fields() {
    return this.form;
  }
  get visible() {
    return this.showPassword();
  }
  get visibleConfirmation() {
    return this.showConfirmation();
  }
  get confirmationMismatch() {
    return super.mismatch;
  }
  fill(password: string, confirmation: string) {
    this.form.setValue({ password, confirmation });
  }
  /**
   * type writes the password as the member does: the control of the form
   * becomes dirty.
   */
  type(password: string) {
    this.form.controls.password.setValue(password);
    this.form.controls.password.markAsDirty();
  }
  send() {
    return this.submit();
  }
  toggle() {
    return this.togglePassword();
  }
  revealConfirmation() {
    return this.toggleConfirmation();
  }
  /**
   * reject delivers the rejection of the platform to the form, the same way
   * that the page does when it binds the message to the field.
   */
  reject(message: string) {
    this.ngOnChanges({ passwordError: new SimpleChange(null, message, false) });
  }
  /**
   * forget takes the rejection of the platform out of the form, the same way
   * that the page does when it starts another attempt.
   */
  forget() {
    this.ngOnChanges({
      passwordError: new SimpleChange('La contraseña no es válida.', null, false),
    });
  }
}

describe('ResetPasswordForm', () => {
  function setup() {
    const injector = Injector.create({
      providers: [{ provide: FormBuilder, useValue: new FormBuilder() }],
    });
    const form = runInInjectionContext(injector, () => new Form());
    // The output is a signal: the tests read the values that it published.
    const published: unknown[] = [];
    form.save.subscribe((value) => published.push(value));
    return { form, published };
  }

  it('no entrega la contraseña cuando la confirmación no coincide', () => {
    const { form, published } = setup();

    form.fill('a-long-enough-password', 'another-long-enough-password');
    form.send();

    expect(published).toHaveLength(0);
    expect(form.fields.hasError('passwordMismatch')).toBe(true);
  });

  it('no entrega una contraseña que no llega al límite del dominio', () => {
    const { form, published } = setup();

    form.fill('short', 'short');
    form.send();

    expect(published).toHaveLength(0);
  });

  it('entrega solamente la contraseña cuando el formulario es válido', () => {
    const { form, published } = setup();

    form.fill('a-long-enough-password', 'a-long-enough-password');
    form.send();

    expect(published).toEqual([{ password: 'a-long-enough-password' }]);
  });

  it('muestra y oculta la contraseña y su confirmación', () => {
    const { form } = setup();

    expect(form.visible).toBe(false);
    form.toggle();
    expect(form.visible).toBe(true);
    form.toggle();
    expect(form.visible).toBe(false);

    expect(form.visibleConfirmation).toBe(false);
    form.revealConfirmation();
    expect(form.visibleConfirmation).toBe(true);
  });

  it('marca el formulario como tocado cuando la confirmación no coincide', () => {
    const { form } = setup();

    form.fill('a-long-enough-password', 'another-long-enough-password');
    form.send();

    expect(form.fields.controls.confirmation.touched).toBe(true);
    expect(form.confirmationMismatch).toBe(true);
  });

  it('escribe el rechazo de la plataforma en el control de la contraseña', () => {
    const { form } = setup();

    // The password is valid for the browser and the platform rejects it: the
    // message has to reach the member anyway.
    form.fill('a-long-enough-password', 'a-long-enough-password');
    form.reject('La contraseña debe tener entre 12 y 30 caracteres.');

    // The control carries the rejection, so the field is in the error state
    // of Material and the message is in the DOM, next to the password.
    expect(form.fields.controls.password.hasError('server')).toBe(true);
    expect(form.fields.controls.password.getError('server')).toBe(
      'La contraseña debe tener entre 12 y 30 caracteres.',
    );
    expect(form.fields.controls.password.touched).toBe(true);
    expect(form.fields.controls.password.dirty).toBe(true);
    expect(form.fields.controls.password.invalid).toBe(true);
  });

  it('deja enviar otra contraseña después de un rechazo de la plataforma', () => {
    const { form, published } = setup();

    form.fill('a-long-enough-password', 'a-long-enough-password');
    form.reject('La contraseña debe tener entre 12 y 30 caracteres.');
    form.send();

    expect(published).toEqual([{ password: 'a-long-enough-password' }]);
  });

  it('quita el rechazo de la plataforma cuando el usuario escribe otra contraseña', () => {
    const { form } = setup();

    form.fill('a-long-enough-password', 'a-long-enough-password');
    form.reject('La contraseña debe tener entre 12 y 30 caracteres.');
    form.type('another-long-enough-password');

    expect(form.fields.controls.password.hasError('server')).toBe(false);
    expect(form.fields.controls.password.valid).toBe(true);
  });

  it('quita el rechazo de la plataforma cuando la página empieza otro intento', () => {
    const { form } = setup();

    form.fill('a-long-enough-password', 'a-long-enough-password');
    form.reject('La contraseña debe tener entre 12 y 30 caracteres.');
    form.forget();

    expect(form.fields.controls.password.hasError('server')).toBe(false);
    expect(form.fields.controls.password.valid).toBe(true);
  });
});
