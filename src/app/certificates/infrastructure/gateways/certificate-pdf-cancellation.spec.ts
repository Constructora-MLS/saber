import '@angular/compiler';
import { HttpClient } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { Observable } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '../../../api.config';
import { CertificateId } from '../../domain/model/value-objects/certificate-id';
import { CertificateGateway as CertificateHttpGateway } from './certificate.gateway';

describe('cancelación HTTP de PDFs', () => {
  function setup() {
    const unsubscribe = vi.fn();
    const subscribe = vi.fn();
    const response = new Observable<Blob>(() => {
      subscribe();
      return unsubscribe;
    });
    const injector = Injector.create({
      providers: [
        { provide: API_BASE_URL, useValue: '/api/v1' },
        { provide: HttpClient, useValue: { get: () => response, post: () => response } },
      ],
    });
    const gateway = runInInjectionContext(injector, () => new CertificateHttpGateway());
    return { gateway, unsubscribe, subscribe };
  }

  it.each(['file', 'public', 'assignment', 'template'] as const)(
    'desuscribe la petición %s al cancelar',
    async (kind) => {
      const { gateway, unsubscribe, subscribe } = setup();
      const controller = new AbortController();
      const result =
        kind === 'file'
          ? gateway.downloadCertificateFile(CertificateId.restore('id'), controller.signal)
          : kind === 'public'
            ? gateway.downloadPublicCertificateFile('MLS-7K9D2Q8M5P', controller.signal)
            : kind === 'assignment'
              ? gateway.previewCertificate('id', controller.signal)
              : gateway.previewServiceTemplate('id', 'body', controller.signal);
      const rejection = expect(result).rejects.toMatchObject({ name: 'AbortError' });
      expect(subscribe).toHaveBeenCalledOnce();
      controller.abort();
      await rejection;
      expect(unsubscribe).toHaveBeenCalledOnce();
    },
  );

  it('no inicia una petición que ya fue cancelada', async () => {
    const { gateway, subscribe } = setup();
    const controller = new AbortController();
    controller.abort();
    await expect(gateway.previewCertificate('id', controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(subscribe).not.toHaveBeenCalled();
  });
});
