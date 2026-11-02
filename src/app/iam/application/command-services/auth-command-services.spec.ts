import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { AuthGateway } from '../../infrastructure/gateways/auth.gateway';
import { ForgotPasswordCommandService, ResetPasswordCommandService } from './auth-command-services';

const aToken = 'a'.repeat(43);
const aPassword = 'a-long-enough-password';

describe('the command services of the authentication', () => {
  function setup() {
    const forgotPassword = vi.fn().mockResolvedValue(undefined);
    const resetPassword = vi.fn().mockResolvedValue(undefined);
    const signIn = vi.fn().mockResolvedValue({ accessToken: 'the-token', identity: null });
    const injector = Injector.create({
      providers: [{ provide: AuthGateway, useValue: { forgotPassword, resetPassword, signIn } }],
    });

    return {
      forgotPassword: runInInjectionContext(injector, () => new ForgotPasswordCommandService()),
      resetPassword: runInInjectionContext(injector, () => new ResetPasswordCommandService()),
      gateway: { forgotPassword, resetPassword, signIn },
    };
  }

  it('pide el enlace de recuperación con la dirección normalizada', async () => {
    const { forgotPassword, gateway } = setup();

    await forgotPassword.execute({ email: '  Admin@Akame.Local ' });

    expect(gateway.forgotPassword).toHaveBeenCalledWith('admin@akame.local');
  });

  it('no pide el enlace cuando la dirección no es una dirección', async () => {
    const { forgotPassword, gateway } = setup();

    await expect(forgotPassword.execute({ email: 'not-an-email' })).rejects.toThrow(
      expect.objectContaining({ name: 'AuthValidationError', field: 'email' }),
    );
    expect(gateway.forgotPassword).not.toHaveBeenCalled();
  });

  it('no cambia la contraseña cuando el token del enlace no es válido', async () => {
    const { resetPassword, gateway } = setup();

    await expect(
      resetPassword.execute({ token: 'too-short', password: aPassword }),
    ).rejects.toThrow(expect.objectContaining({ name: 'AuthValidationError', field: 'token' }));
    expect(gateway.resetPassword).not.toHaveBeenCalled();
  });

  it('no cambia la contraseña cuando la contraseña no llega al límite del dominio', async () => {
    const { resetPassword, gateway } = setup();

    await expect(resetPassword.execute({ token: aToken, password: 'short' })).rejects.toThrow(
      expect.objectContaining({ name: 'AuthValidationError', field: 'password' }),
    );
    expect(gateway.resetPassword).not.toHaveBeenCalled();
  });

  it('cambia la contraseña con el token del enlace y la contraseña nueva', async () => {
    const { resetPassword, gateway } = setup();

    await resetPassword.execute({ token: aToken, password: aPassword });

    expect(gateway.resetPassword).toHaveBeenCalledWith(aToken, aPassword);
  });

  it('no esconde el fallo del gateway', async () => {
    const { forgotPassword, gateway } = setup();
    gateway.forgotPassword.mockRejectedValue(new Error('the platform is down'));

    await expect(forgotPassword.execute({ email: 'admin@akame.local' })).rejects.toThrow(
      'the platform is down',
    );
  });
});
