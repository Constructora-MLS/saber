import '@angular/compiler';
import { FormBuilder } from '@angular/forms';
import { Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { SignInForm } from './sign-in-form.component';

class Form extends SignInForm {
  get fields() {
    return this.form;
  }
  get visible() {
    return this.showPassword();
  }
  fill(email: string, password: string) {
    this.form.setValue({ email, password });
  }
  send() {
    return this.submit();
  }
  toggle() {
    return this.togglePassword();
  }
  recover() {
    this.recoveryRequested.emit();
  }
}

describe('SignInForm', () => {
  function setup() {
    const signIn = vi.fn();
    const injector = Injector.create({
      providers: [{ provide: FormBuilder, useValue: new FormBuilder() }],
    });
    const form = runInInjectionContext(injector, () => new Form());
    // The output is a signal: the tests read the values that it published.
    const published: unknown[] = [];
    form.signIn.subscribe((command) => published.push(command));
    const recovery: unknown[] = [];
    form.recoveryRequested.subscribe(() => recovery.push(true));
    return { form, signIn, published, recovery };
  }

  it('no entrega las credenciales cuando el formulario está vacío', () => {
    const { form, published } = setup();

    form.send();

    expect(published).toHaveLength(0);
    expect(form.fields.invalid).toBe(true);
  });

  it('no entrega un correo que no es una dirección', () => {
    const { form, published } = setup();

    form.fill('not-an-email', 'the-password');
    form.send();

    expect(published).toHaveLength(0);
  });

  it('entrega las credenciales cuando el formulario es válido', () => {
    const { form, published } = setup();

    form.fill('admin@akame.local', 'the-password');
    form.send();

    expect(published).toEqual([{ email: 'admin@akame.local', password: 'the-password' }]);
  });

  it('no entrega una contraseña que no llega al límite del dominio', () => {
    const { form, published } = setup();

    form.fill('admin@akame.local', 'corta');
    form.send();

    expect(published).toHaveLength(0);
  });

  it('muestra y oculta la contraseña del formulario', () => {
    const { form } = setup();

    expect(form.visible).toBe(false);
    form.toggle();
    expect(form.visible).toBe(true);
    form.toggle();
    expect(form.visible).toBe(false);
  });

  it('anuncia que el usuario quiere recuperar su contraseña', () => {
    const { form, recovery } = setup();

    form.recover();

    expect(recovery).toHaveLength(1);
  });
});
