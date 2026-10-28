import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GetCertificateFileQueryService,
  GetServiceTemplatePreviewQueryService,
  GetServiceTemplateQueryService,
  ListCertificateQueueQueryService,
  ListCertificatesQueryService,
} from '../../../application/query-services/certificate-query-services';
import {
  AnnulCertificateCommandService,
  IssueCertificateCommandService,
  RestoreServiceTemplateCommandService,
  SaveServiceTemplateCommandService,
} from '../../../application/command-services/certificate-command-services';
import { CERTIFICATE_SERVICE_RESOLVER } from '../../../infrastructure/acl/catalog-service.acl';
import { CertificatesPage } from './certificates.page';
import { IssuedCertificateRow } from '../../components/certificate-history/certificate-history';

class EditorPage extends CertificatesPage {
  showEditor() {
    this.activateTab('contenido');
  }
  leaveEditor() {
    this.activateTab('pendientes');
  }
  chooseService(id: string) {
    this.selectService(id);
  }
  changeBody(body: string) {
    this.onTemplateBodyChanged(body);
  }
  get url() {
    return this.editorPreviewUrl();
  }
  viewCertificate(row: IssuedCertificateRow) {
    this.view(row);
  }
  downloadCertificate(row: IssuedCertificateRow) {
    return this.download(row);
  }
}

function setup() {
  const open = vi.fn();
  const getFile = vi.fn();
  const requests: { signal: AbortSignal; resolve: (file: Blob) => void; body: string }[] = [];
  const preview = vi.fn(
    (_service: string, body: string, signal: AbortSignal) =>
      new Promise<Blob>((resolve) => {
        requests.push({ signal, resolve, body });
      }),
  );
  const emptyPage = { items: [], page: 1, total: 0, totalPages: 0 };
  const injector = Injector.create({
    providers: [
      ...[
        MatDialog,
        MatSnackBar,
        GetCertificateFileQueryService,
        AnnulCertificateCommandService,
        IssueCertificateCommandService,
        RestoreServiceTemplateCommandService,
        SaveServiceTemplateCommandService,
      ].map((provide) => ({ provide, useValue: {} })),
      { provide: MatDialog, useValue: { open } },
      { provide: GetCertificateFileQueryService, useValue: { execute: getFile } },
      { provide: DomSanitizer, useValue: { bypassSecurityTrustResourceUrl: (url: string) => url } },
      { provide: ListCertificateQueueQueryService, useValue: { execute: async () => emptyPage } },
      { provide: ListCertificatesQueryService, useValue: { execute: async () => emptyPage } },
      {
        provide: GetServiceTemplateQueryService,
        useValue: { execute: async () => ({ body: 'initial', tokens: [] }) },
      },
      { provide: GetServiceTemplatePreviewQueryService, useValue: { execute: preview } },
      {
        provide: CERTIFICATE_SERVICE_RESOLVER,
        useValue: {
          listServices: async () => [],
          resolveServiceNames: async () => new Map(),
        },
      },
    ],
  });
  const page = runInInjectionContext(injector, () => new EditorPage());
  page.ngOnInit();
  return { page, preview, requests, open, getFile, destroy: () => injector.destroy() };
}

async function flush() {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('acceso al PDF anulado', () => {
  it('no abre el visor ni pide el archivo aunque se invoque la acción directamente', async () => {
    const { page, open, getFile, destroy } = setup();
    const row: IssuedCertificateRow = {
      certificateId: 'internal',
      certificateCode: 'MLS-7K9D2Q8M5P',
      workerName: 'Ana López',
      dni: '12345678',
      position: 'Operaria',
      workUnit: 'Obra',
      workUnitCode: 'OB-1',
      issuedAt: '2026-10-16T12:00:00Z',
      status: 'ANNULLED',
      serviceName: 'Servicio',
    };
    page.viewCertificate(row);
    await page.downloadCertificate(row);
    expect(open).not.toHaveBeenCalled();
    expect(getFile).not.toHaveBeenCalled();
    destroy();
  });
});

describe('vista previa del editor', () => {
  it('no genera PDFs mientras el editor está oculto', async () => {
    const { page, preview, destroy } = setup();
    page.chooseService('service');
    await flush();
    expect(preview).not.toHaveBeenCalled();
    destroy();
  });

  it('cancela inmediatamente al escribir y solo muestra la última respuesta tras la espera', async () => {
    vi.useFakeTimers();
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:latest');
    const { page, preview, requests, destroy } = setup();
    page.chooseService('service');
    page.showEditor();
    await flush();
    expect(requests).toHaveLength(1);
    page.changeBody('new');
    expect(requests[0].signal.aborted).toBe(true);
    requests[0].resolve(new Blob(['stale']));
    await flush();
    expect(create).not.toHaveBeenCalled();
    page.changeBody('latest');
    await vi.advanceTimersByTimeAsync(400);
    expect(preview).toHaveBeenCalledTimes(2);
    expect(requests[1].body).toBe('latest');
    requests[1].resolve(new Blob(['latest']));
    await flush();
    expect(page.url).toBe('blob:latest');
    destroy();
  });

  it('cancela al cambiar de pestaña o destruir y libera la URL', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:editor');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const { page, requests, destroy } = setup();
    page.chooseService('service');
    page.showEditor();
    await flush();
    requests[0].resolve(new Blob(['PDF']));
    await flush();
    page.leaveEditor();
    expect(page.url).toBeNull();
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:editor');
    page.showEditor();
    expect(requests).toHaveLength(2);
    destroy();
    expect(requests[1].signal.aborted).toBe(true);
    requests[1].resolve(new Blob(['late']));
    await flush();
    expect(page.url).toBeNull();
  });
});
