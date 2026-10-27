import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { MatSnackBar } from '@angular/material/snack-bar';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GetPublicCertificateFileQueryService,
  VerifyCertificateQueryService,
} from '../../../application/query-services/verify-certificate-query-service';
import { CertificateVerification } from '../../../domain/model/value-objects/certificate-verification';
import { CertificateSnapshot } from '../../../domain/model/value-objects/certificate-snapshot';
import { CertificateApiError } from '../../../infrastructure/http/certificate-api.error';
import { CredentialPage } from './credential-page';

class Page extends CredentialPage {
  get result() {
    return this.verification();
  }
  get error() {
    return this.failure();
  }
  get busy() {
    return this.loading();
  }
  get url() {
    return this.documentUrl();
  }
  downloadPDF() {
    return this.download();
  }
  shareLink() {
    return this.share();
  }
}

const certificate = CertificateVerification.restore(
  'MLS-7K9D2Q8M5P',
  'ISSUED',
  CertificateSnapshot.restore(new Map()),
  '2026-10-26T12:00:00Z',
);

function setup(result: CertificateVerification | null = certificate) {
  const notify = vi.fn();
  const verify = vi.fn().mockResolvedValue(result);
  const getFile = vi.fn().mockResolvedValue(new Blob(['%PDF-test']));
  const injector = Injector.create({
    providers: [
      { provide: MatSnackBar, useValue: { open: notify } },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ code: certificate.code }) } },
      },
      { provide: VerifyCertificateQueryService, useValue: { execute: verify } },
      { provide: GetPublicCertificateFileQueryService, useValue: { execute: getFile } },
      { provide: DomSanitizer, useValue: { bypassSecurityTrustResourceUrl: (url: string) => url } },
    ],
  });
  const page = runInInjectionContext(injector, () => new Page());
  return { page, verify, getFile, notify };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('credencial pública', () => {
  it('muestra inexistente sin pedir el PDF de un código oculto o ausente', async () => {
    const { page, verify, getFile } = setup(null);
    page.ngOnInit();
    await vi.waitFor(() => expect(page.busy).toBe(false));
    expect(verify).toHaveBeenCalledWith(certificate.code);
    expect(page.result).toBeNull();
    expect(page.error).toBeNull();
    expect(getFile).not.toHaveBeenCalled();
    page.ngOnDestroy();
  });

  it('no muestra detalles internos de un fallo del servicio', async () => {
    const { page, verify } = setup();
    verify.mockRejectedValue(new Error('información privada'));
    page.ngOnInit();
    await vi.waitFor(() => expect(page.busy).toBe(false));
    expect(page.result).toBeNull();
    expect(page.error).toContain('No se pudo consultar');
    expect(page.error).not.toContain('información privada');
    page.ngOnDestroy();
  });

  it('abre el PDF por código y libera la URL al salir', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:credential');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const { page, getFile } = setup();
    page.ngOnInit();
    await vi.waitFor(() => expect(page.busy).toBe(false));
    expect(page.url).toBe('blob:credential');
    expect(getFile).toHaveBeenCalledWith(certificate.code, expect.any(AbortSignal));
    page.ngOnDestroy();
    expect(page.url).toBeNull();
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:credential');
  });

  it('vuelve a comprobar la vigencia al descargar y oculta una anulación posterior', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:credential');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const { page, getFile } = setup();
    page.ngOnInit();
    await vi.waitFor(() => expect(page.busy).toBe(false));
    getFile.mockRejectedValue(new CertificateApiError(404, 'not_found', 'Not Found'));
    await page.downloadPDF();
    expect(getFile).toHaveBeenCalledTimes(2);
    expect(page.result).toBeNull();
    expect(page.url).toBeNull();
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:credential');
    page.ngOnDestroy();
  });

  it('comparte el enlace público con la API nativa cuando está disponible', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:credential');
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share });
    vi.stubGlobal('window', { location: { origin: 'https://saber.example' } });
    const { page } = setup();
    page.ngOnInit();
    await vi.waitFor(() => expect(page.busy).toBe(false));
    await page.shareLink();
    expect(share).toHaveBeenCalledWith({
      title: `Certificado ${certificate.code}`,
      url: `https://saber.example/verify/${certificate.code}`,
    });
    page.ngOnDestroy();
  });

  it('copia el enlace si el navegador no admite compartir', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:credential');
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    vi.stubGlobal('window', { location: { origin: 'https://saber.example' } });
    const { page, notify } = setup();
    page.ngOnInit();
    await vi.waitFor(() => expect(page.busy).toBe(false));
    await page.shareLink();
    expect(writeText).toHaveBeenCalledWith(`https://saber.example/verify/${certificate.code}`);
    expect(notify).toHaveBeenCalledWith('Enlace copiado.', 'Cerrar', { duration: 4000 });
    page.ngOnDestroy();
  });

  it('notifica un fallo al copiar con opción de cerrar', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:credential');
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    vi.stubGlobal('window', { location: { origin: 'https://saber.example' } });
    const { page, notify } = setup();
    page.ngOnInit();
    await vi.waitFor(() => expect(page.busy).toBe(false));
    await page.shareLink();
    expect(notify).toHaveBeenCalledWith(
      'No se pudo compartir el enlace. Puedes copiar la dirección del navegador.',
      'Cerrar',
      { duration: 4000 },
    );
    page.ngOnDestroy();
  });

  it('no notifica cuando el usuario cancela compartir', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:credential');
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError')),
    });
    vi.stubGlobal('window', { location: { origin: 'https://saber.example' } });
    const { page, notify } = setup();
    page.ngOnInit();
    await vi.waitFor(() => expect(page.busy).toBe(false));
    await page.shareLink();
    expect(notify).not.toHaveBeenCalled();
    page.ngOnDestroy();
  });
});
