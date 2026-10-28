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

class HistoryPage extends CertificatesPage {
  searchWorks(term: string) {
    return this.searchWorkUnits(term);
  }
  chooseWork(code: string) {
    this.onWorkUnitChanged(code);
  }
  showHistory() {
    this.activateTab('emitidos');
  }
  get works() {
    return this.workUnitOptions();
  }
  get selectedWork() {
    return this.workUnitFilter();
  }
}

function setup() {
  const listCertificates = vi
    .fn()
    .mockResolvedValue({ items: [], page: 1, total: 0, totalPages: 0 });
  const listWorkUnits = vi.fn().mockResolvedValue([
    { code: 'OB-021', name: 'Mejoramiento del puente La Molina' },
    { code: 'OB-022', name: 'Ampliación de la avenida Central' },
  ]);
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
      { provide: DomSanitizer, useValue: { bypassSecurityTrustResourceUrl: (url: string) => url } },
      {
        provide: ListCertificateQueueQueryService,
        useValue: { execute: async () => ({ items: [], page: 1, total: 0, totalPages: 0 }) },
      },
      { provide: ListCertificatesQueryService, useValue: { execute: listCertificates } },
      {
        provide: GetServiceTemplateQueryService,
        useValue: { execute: async () => ({ body: '', tokens: [] }) },
      },
      {
        provide: GetServiceTemplatePreviewQueryService,
        useValue: { execute: async () => new Blob() },
      },
      {
        provide: CERTIFICATE_SERVICE_RESOLVER,
        useValue: {
          listServices: async () => [],
          resolveServiceNames: async () => new Map(),
          listWorkUnits,
        },
      },
    ],
  });
  const page = runInInjectionContext(injector, () => new HistoryPage());
  page.ngOnInit();
  return { page, listCertificates, listWorkUnits };
}

afterEach(() => vi.restoreAllMocks());

describe('filtro por unidad de trabajo del historial', () => {
  it('ofrece solo las unidades de trabajo que el catálogo devuelve para el término', async () => {
    const { page, listWorkUnits } = setup();

    await page.searchWorks('puente');

    expect(listWorkUnits).toHaveBeenCalledWith('puente');
    expect(page.works).toEqual([
      { id: 'OB-021', label: 'Mejoramiento del puente La Molina', detail: 'OB-021' },
      { id: 'OB-022', label: 'Ampliación de la avenida Central', detail: 'OB-022' },
    ]);
  });

  it('ofrece las unidades de trabajo al abrir el historial, sin esperar a que se escriba', async () => {
    const { page, listWorkUnits } = setup();

    page.showHistory();

    await vi.waitFor(() => expect(page.works.length).toBeGreaterThan(0));
    expect(listWorkUnits).toHaveBeenCalledWith('');
  });

  it('filtra el historial por el código de la unidad de trabajo elegida', async () => {
    const { page, listCertificates } = setup();

    page.chooseWork('OB-021');
    await vi.waitFor(() => expect(listCertificates).toHaveBeenCalled());
    expect(page.selectedWork).toBe('OB-021');
    const criteria = listCertificates.mock.calls.at(-1)?.[0];
    expect(criteria.workUnitCode).toBe('OB-021');
  });

  it('deja el historial sin filtro de unidad de trabajo cuando se limpia', async () => {
    const { page, listCertificates } = setup();

    page.chooseWork('OB-021');
    await vi.waitFor(() => expect(listCertificates).toHaveBeenCalled());
    page.chooseWork('');
    await vi.waitFor(() => expect(listCertificates.mock.calls.length).toBeGreaterThan(1));
    expect(page.selectedWork).toBe('');
    expect(listCertificates.mock.calls.at(-1)?.[0].workUnitCode).toBe('');
  });

  it('informa cuando el catálogo no puede leerse', async () => {
    const { page, listWorkUnits } = setup();
    listWorkUnits.mockRejectedValue(new Error('catalog unavailable'));

    await page.searchWorks('puente');

    expect(page.works).toEqual([]);
  });
});
