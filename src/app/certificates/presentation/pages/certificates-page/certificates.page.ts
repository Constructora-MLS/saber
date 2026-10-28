// Package certificatespage orchestrates the certificates of the platform.
//
// The page is the frontend controller of the bounded context: it reads the
// queue of the assignments through the use cases, opens the PDF preview,
// issues certificates and edits the content of every service. It never talks
// to the API directly.
// package certificatespage

import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
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
import { CertificateQueueItem } from '../../../application/queries/certificate-queries';
import { Certificate } from '../../../domain/model/aggregates/certificate';
import {
  CERTIFICATE_STATUS_FILTER,
  certificateStatusFilterLabel,
  certificateStatusOf,
  CertificateStatusFilter,
} from '../../../domain/model/value-objects/certificate-status';
import { CERTIFICATE_PAGE_SIZE } from '../../../domain/model/value-objects/listing';
import { CertificateSnapshot } from '../../../domain/model/value-objects/certificate-snapshot';
import { CertificateApiError } from '../../../infrastructure/errors/certificate-api.error';
import {
  CertificateServiceReference,
  CERTIFICATE_SERVICE_RESOLVER,
} from '../../../infrastructure/acl/catalog-service.acl';
import {
  CertificateHistory,
  IssuedCertificateRow,
} from '../../components/certificate-history/certificate-history';
import {
  CertificateQueue,
  PendingCertificateRow,
} from '../../components/certificate-queue/certificate-queue';
import { CertificateTemplateEditor } from '../../components/certificate-template-editor/certificate-template-editor';
import { CertificateViewerDialog } from '../../components/certificate-viewer-dialog/certificate-viewer-dialog';
import { firstValueFrom } from 'rxjs';
import { Paginator } from '../../../../shared/presentation/components/paginator/paginator';
import {
  CatalogOption,
  CatalogSearchSelect,
} from '../../../../shared/presentation/components/catalog-search-select/catalog-search-select';
import { IssueCertificateDialog } from '../../components/issue-certificate-dialog/issue-certificate-dialog';
import { RestoreTemplateDialog } from '../../components/restore-template-dialog/restore-template-dialog';
import { AnnulCertificateDialog } from '../../components/annul-certificate-dialog/annul-certificate-dialog';

/**
 * CertificatesTab is the view of the certificates that is shown.
 */
type CertificatesTab = 'pendientes' | 'emitidos' | 'contenido';

/**
 * CertificateLoadFailure is the failure of the consultation of the
 * certificates.
 *
 * The headline names what happened and the detail tells the worker what to
 * do about it, so the interface never shows a bare technical message.
 */
interface CertificateLoadFailure {
  readonly title: string;
  readonly message: string;
}

/**
 * CertificatesTabDefinition describes one of the views of the certificates.
 */
interface CertificatesTabDefinition {
  readonly id: CertificatesTab;
  readonly label: string;
  readonly icon: string;
  readonly title: string;
  readonly subtitle: string;
  readonly recordsLabel: string;
}

/**
 * PREVIEW_DELAY is the time that the writing of the editor waits before
 * the platform renders the preview of the document.
 */
const PREVIEW_DELAY = 400;

/**
 * CertificatesPage orchestrates the certificates of the platform.
 *
 * The page shows the queue of the assignments that are waiting for a
 * certificate, the history of the certificates that were issued and the
 * editor of the content of every service. It reads and changes them through
 * the use cases and it never talks to the API directly.
 */
@Component({
  imports: [
    CatalogSearchSelect,
    Paginator,
    CertificateHistory,
    CertificateQueue,
    CertificateTemplateEditor,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  selector: 'app-certificates-page',
  styleUrl: './certificates.page.scss',
  templateUrl: './certificates.page.html',
})
export class CertificatesPage implements OnInit {
  private readonly dialog = inject(MatDialog);
  private listingRequest = 0;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  protected readonly pendingPage = signal(1);
  protected readonly historyPage = signal(1);
  protected readonly pendingTotalPages = signal(0);
  protected readonly historyTotalPages = signal(0);
  protected readonly page = computed(() =>
    this.activeTab() === 'pendientes' ? this.pendingPage() : this.historyPage(),
  );
  protected readonly totalPages = computed(() =>
    this.activeTab() === 'pendientes' ? this.pendingTotalPages() : this.historyTotalPages(),
  );
  private readonly snackBar = inject(MatSnackBar);

  private readonly listQueue = inject(ListCertificateQueueQueryService);
  private readonly listCertificates = inject(ListCertificatesQueryService);
  private readonly getFile = inject(GetCertificateFileQueryService);
  private readonly getTemplate = inject(GetServiceTemplateQueryService);
  private readonly saveServiceTemplate = inject(SaveServiceTemplateCommandService);
  private readonly restoreServiceTemplate = inject(RestoreServiceTemplateCommandService);
  private readonly annulCertificate = inject(AnnulCertificateCommandService);
  private readonly issueCertificate = inject(IssueCertificateCommandService);
  private readonly services = inject(CERTIFICATE_SERVICE_RESOLVER);
  private readonly getPreview = inject(GetServiceTemplatePreviewQueryService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  /** The pending preview of the editor is cancelled once, when the page goes away. */
  private previewTimer: ReturnType<typeof setTimeout> | null = null;
  private previewRequest: AbortController | null = null;
  private destroyed = false;

  /** The view of the certificates that is shown. */
  protected readonly activeTab = signal<CertificatesTab>('pendientes');

  /** The term of the search of the listing. */
  protected readonly searchTerm = signal('');
  /** The service that the listing is filtered by. */
  protected readonly serviceFilter = signal('');
  /**
   * The state that the search of the certificates is filtered by.
   *
   * The search shows the certificates in force by default, because a worker
   * looks for the certificate that certifies the labour period.
   */
  protected readonly statusFilter = signal<CertificateStatusFilter>('ISSUED');
  /** The unit of work that the history is filtered by. */
  protected readonly workUnitFilter = signal('');
  /** The units of work that the filter offers. */
  protected readonly workUnitOptions = signal<readonly CatalogOption[]>([]);
  /** Whether the catalog is answering the search of units of work. */
  protected readonly loadingWorkUnits = signal(false);
  /** The failure that prevented the search of units of work. */
  protected readonly workUnitsError = signal<string | null>(null);

  /** The certificates of the platform that the search shows. */
  protected readonly certificates = signal<readonly Certificate[]>([]);

  /** The queue of the assignments that may receive a certificate. */
  protected readonly queue = signal<readonly CertificateQueueItem[]>([]);
  /** The name of the services of the queue. */
  protected readonly serviceNames = signal<ReadonlyMap<string, string>>(new Map());

  /** Whether the page is waiting for the answer of the platform. */
  protected readonly loading = signal(false);
  /** Whether an assignment is currently being issued. */
  protected readonly issuing = signal(false);
  /** The failure that prevented the consultation. */
  protected readonly loadFailure = signal<CertificateLoadFailure | null>(null);

  /** The services of the catalog, as the editor offers them. */
  protected readonly catalogServices = signal<readonly CertificateServiceReference[]>([]);
  /** The service whose template is edited. */
  protected readonly selectedServiceId = signal('');
  /** The text of the template of the selected service. */
  protected readonly templateBody = signal('');
  /** The vocabulary that the platform accepts in the template. */
  protected readonly templateTokens = signal<readonly string[]>([]);
  /** Whether the editor is waiting for the template. */
  protected readonly templateLoading = signal(false);
  /** Whether the platform is saving the template. */
  protected readonly templateSaving = signal(false);
  /** The failure of the editor of the template. */
  protected readonly templateFailure = signal<string | null>(null);

  /** The preview of the document that the text of the editor would produce. */
  protected readonly editorPreviewUrl = signal<SafeResourceUrl | null>(null);
  /** The failure of the preview of the editor. */
  protected readonly editorPreviewFailure = signal<string | null>(null);

  /** The address of the preview of the editor, for its replacement. */
  private editorPreviewAddress: string | null = null;

  /**
   * The views of the certificates.
   */
  protected readonly tabs: readonly CertificatesTabDefinition[] = [
    {
      id: 'pendientes',
      label: 'Pendientes',
      icon: 'pending_actions',
      title: 'Certificados',
      subtitle: 'Asignaciones cesadas que aún no tienen certificado.',
      recordsLabel: 'Asignaciones pendientes de certificado',
    },
    {
      id: 'emitidos',
      label: 'Historial',
      icon: 'history',
      title: 'Historial de certificados',
      subtitle: 'Consulta los certificados de la plataforma y descarga su PDF.',
      recordsLabel: 'Certificados',
    },
    {
      id: 'contenido',
      label: 'Editor',
      icon: 'edit_document',
      title: 'Editor de certificados',
      subtitle: 'El texto del certificado de cada servicio.',
      recordsLabel: 'Contenido por servicio',
    },
  ];

  /**
   * The view that is shown.
   */
  protected readonly activeTabDefinition = computed(
    () => this.tabs.find((tab) => tab.id === this.activeTab()) ?? this.tabs[0],
  );

  /**
   * The assignments that are waiting for a certificate.
   *
   * An assignment that already has a certificate in force is not waiting
   * for one anymore: it is in the history.
   */
  protected readonly pendingRows = computed<readonly PendingCertificateRow[]>(() =>
    this.queue().map((item) => this.toPendingRow(item)),
  );

  /**
   * The certificates that the search shows.
   *
   * The state of the certificate is the filter of the search, and it is
   * applied by the platform: the listing holds every certificate that
   * matches it.
   */
  protected readonly issuedRows = computed<readonly IssuedCertificateRow[]>(() =>
    this.certificates().map((certificate) => this.toIssuedRow(certificate)),
  );

  /**
   * The filters of the search of the certificates.
   */
  protected readonly statusFilters = CERTIFICATE_STATUS_FILTER;

  /**
   * The label of a filter of the search.
   */
  protected statusFilterLabel(filter: CertificateStatusFilter): string {
    return certificateStatusFilterLabel(filter);
  }

  /**
   * The services that the queue offers as a filter.
   */
  protected readonly serviceOptions = computed(() => {
    const names = this.serviceNames();
    const options = new Map<string, string>();

    for (const item of this.queue()) {
      const serviceId = item.assignment.serviceId;
      options.set(serviceId, names.get(serviceId) ?? 'Sin nombre');
    }

    for (const service of this.catalogServices()) options.set(service.id, service.name);

    return [...options.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((left, right) => left.name.localeCompare(right.name, 'es'));
  });

  /**
   * ngOnInit loads the queue of the certificates and the services of the
   * catalog.
   */
  ngOnInit(): void {
    // The pending preview is cancelled once, when the page goes away: the
    // callback is not registered on every keystroke.
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.listingRequest++;
      if (this.searchTimer !== null) clearTimeout(this.searchTimer);
      this.cancelEditorPreview();
      if (this.editorPreviewAddress) {
        URL.revokeObjectURL(this.editorPreviewAddress);
        this.editorPreviewAddress = null;
      }
    });

    void this.reload();
    void this.loadServices();
  }

  /**
   * activateTab shows another view of the certificates.
   */
  protected activateTab(tab: CertificatesTab): void {
    this.activeTab.set(tab);

    if (tab === 'emitidos') {
      // The units of work of the filter are read once, so the selector
      // offers them as soon as the history is shown.
      if (this.workUnitOptions().length === 0) {
        void this.searchWorkUnits('');
      }
      return;
    }

    if (tab !== 'contenido') {
      this.cancelEditorPreview();
      this.setEditorPreview(null);
      return;
    }
    if (this.templateLoading()) return;

    if (!this.selectedServiceId() && this.catalogServices().length > 0) {
      this.selectService(this.catalogServices()[0].id);
      return;
    }

    void this.loadEditorPreview();
  }

  /**
   * onSearchChanged filters the listing with the term of the worker.
   */
  protected onSearchChanged(value: string): void {
    this.searchTerm.set(value);
    this.pendingPage.set(1);
    this.historyPage.set(1);
    // Invalidate in-flight results immediately, before the debounce finishes.
    this.listingRequest++;
    if (this.searchTimer !== null) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.searchTimer = null;
      void this.reload();
    }, 300);
  }

  /**
   * clearSearch empties the search of the listing.
   */
  protected clearSearch(): void {
    if (this.searchTerm().length === 0) {
      return;
    }
    this.onSearchChanged('');
  }

  /**
   * onServiceChanged filters the queue by service.
   */
  protected onServiceChanged(serviceId: string): void {
    this.serviceFilter.set(serviceId);
    this.pendingPage.set(1);
    void this.reload();
  }

  /**
   * searchWorkUnits reads the units of work that match the term.
   *
   * The catalog is not read entirely: the selector asks only for the units
   * of work that match what the worker writes.
   */
  protected async searchWorkUnits(term: string): Promise<void> {
    this.loadingWorkUnits.set(true);
    this.workUnitsError.set(null);

    try {
      const workUnits = await this.services.listWorkUnits(term);
      this.workUnitOptions.set(
        workUnits.map((workUnit) => ({
          id: workUnit.code,
          label: workUnit.name,
          detail: workUnit.code,
        })),
      );
    } catch {
      this.workUnitOptions.set([]);
      this.workUnitsError.set('No se pudieron leer las unidades de trabajo.');
    } finally {
      this.loadingWorkUnits.set(false);
    }
  }

  /**
   * onWorkUnitChanged filters the history by unit of work.
   */
  protected onWorkUnitChanged(code: string): void {
    this.workUnitFilter.set(code);
    this.historyPage.set(1);
    void this.reload();
  }

  /**
   * onStatusFilterChanged filters the search of the certificates by state.
   *
   * The filter is applied by the platform, so the search asks again for the
   * certificates that match it.
   */
  protected onStatusFilterChanged(filter: CertificateStatusFilter): void {
    this.statusFilter.set(filter);
    this.historyPage.set(1);
    void this.reload();
  }

  /**
   * retry consults the queue again.
   */
  protected goToPage(page: number): void {
    if (
      this.loading() ||
      this.issuing() ||
      page < 1 ||
      page > this.totalPages() ||
      page === this.page()
    )
      return;
    if (this.activeTab() === 'pendientes') this.pendingPage.set(page);
    else this.historyPage.set(page);
    void this.reload();
  }

  protected retry(): void {
    void this.reload();
  }

  /**
   * preview opens the PDF that the platform would archive for an assignment.
   */
  protected preview(row: PendingCertificateRow): void {
    this.dialog.open(CertificateViewerDialog, {
      data: {
        kind: 'preview',
        assignmentId: row.assignmentId,
        workerName: row.workerName,
      },
      width: '52rem',
      maxWidth: '96vw',
    });
  }

  /**
   * issue asks the platform to render and archive the certificate without
   * redirecting away from the queue.
   */
  protected async issue(row: PendingCertificateRow): Promise<void> {
    if (this.issuing()) {
      return;
    }

    this.issuing.set(true);

    try {
      const confirmed = await firstValueFrom(
        this.dialog
          .open<IssueCertificateDialog, { workerName: string }, boolean>(IssueCertificateDialog, {
            data: { workerName: row.workerName },
            width: '34rem',
            maxWidth: '92vw',
          })
          .afterClosed(),
      );

      if (confirmed !== true) {
        return;
      }

      await this.issueCertificate.execute({ assignmentId: row.assignmentId });
      this.notify(`Certificado de ${row.workerName} emitido.`);
      await this.reload();
    } catch (error) {
      this.notify(this.describe(error).message);
    } finally {
      this.issuing.set(false);
    }
  }

  /**
   * view opens the document of an issued certificate.
   */
  protected view(row: IssuedCertificateRow): void {
    if (row.status !== 'ISSUED') return;
    this.dialog.open(CertificateViewerDialog, {
      data: {
        kind: 'issued',
        certificateId: row.certificateId,
        certificateCode: row.certificateCode,
        workerName: row.workerName,
      },
      width: '52rem',
      maxWidth: '96vw',
    });
  }

  /**
   * download asks the platform for the PDF of a certificate and hands it to
   * the browser.
   */
  protected async download(row: IssuedCertificateRow): Promise<void> {
    if (row.status !== 'ISSUED') return;
    try {
      const file = await this.getFile.execute(row.certificateId);
      const url = URL.createObjectURL(file);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Certificado - ${row.workerName}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      this.notify(this.describe(error).message);
    }
  }

  /**
   * annul opens the dialog that annuls an issued certificate.
   *
   * The annulment is the way of correcting a certificate that was issued by
   * mistake: the history and the file of the issuance are kept and the
   * assignment may be deleted afterwards.
   */
  private async applyAnnulment(certificateId: string, reason: string): Promise<void> {
    try {
      await this.annulCertificate.execute({ certificateId, reason });
      this.notify('Certificado anulado.');
      await this.reload();
    } catch (error) {
      this.notify(this.describe(error).message);
    }
  }

  /**
   * verify opens the public trace of a certificate.
   *
   * The page is the answer of the platform to the QR of the document, so it
   * opens in a new tab: the worker keeps the listing of the certificates.
   */
  protected verify(row: IssuedCertificateRow): void {
    window.open('/verify/' + encodeURIComponent(row.certificateCode), '_blank', 'noopener');
  }

  protected annul(row: IssuedCertificateRow): void {
    this.dialog
      .open(AnnulCertificateDialog, {
        data: { workerName: row.workerName },
        width: '34rem',
        maxWidth: '92vw',
      })
      .afterClosed()
      .subscribe((reason) => {
        if (!reason) {
          return;
        }

        void this.applyAnnulment(row.certificateId, reason);
      });
  }

  /**
   * selectService asks for the template of another service.
   */
  protected selectService(serviceId: string): void {
    this.cancelEditorPreview();
    this.setEditorPreview(null);
    this.editorPreviewFailure.set(null);
    this.selectedServiceId.set(serviceId);
    void this.loadTemplate(serviceId);
  }

  /**
   * onTemplateBodyChanged keeps the text that the worker is writing and
   * asks for the preview of the document that it would produce.
   */
  protected onTemplateBodyChanged(body: string): void {
    this.templateBody.set(body);
    this.schedulePreview();
  }

  /**
   * schedulePreview asks for the preview of the document that the text of
   * the editor would produce.
   *
   * The preview waits until the writing settles, so the platform renders
   * the document once and not on every keystroke.
   */
  private cancelEditorPreview(): void {
    if (this.previewTimer !== null) {
      clearTimeout(this.previewTimer);
      this.previewTimer = null;
    }
    this.previewRequest?.abort();
    this.previewRequest = null;
  }

  private schedulePreview(): void {
    this.cancelEditorPreview();

    this.previewTimer = setTimeout(() => {
      this.previewTimer = null;
      void this.loadEditorPreview();
    }, PREVIEW_DELAY);
  }

  /**
   * loadEditorPreview renders the document of the template that is being
   * written.
   */
  private async loadEditorPreview(): Promise<void> {
    this.cancelEditorPreview();
    if (this.destroyed || this.activeTab() !== 'contenido') return;
    const serviceId = this.selectedServiceId();
    if (!serviceId) {
      this.setEditorPreview(null);
      return;
    }

    const request = new AbortController();
    this.previewRequest = request;
    try {
      const file = await this.getPreview.execute(serviceId, this.templateBody(), request.signal);
      if (request.signal.aborted) return;
      this.editorPreviewFailure.set(null);
      this.setEditorPreview(URL.createObjectURL(file));
    } catch (error) {
      if (!request.signal.aborted) this.editorPreviewFailure.set(this.describe(error).message);
    } finally {
      if (this.previewRequest === request) this.previewRequest = null;
    }
  }

  /**
   * setEditorPreview shows the preview of the editor.
   */
  private setEditorPreview(address: string | null): void {
    if (this.editorPreviewAddress) {
      URL.revokeObjectURL(this.editorPreviewAddress);
    }

    this.editorPreviewAddress = address;
    this.editorPreviewUrl.set(
      address ? this.sanitizer.bypassSecurityTrustResourceUrl(address) : null,
    );
  }

  /**
   * restoreTemplate asks the platform for the default template of the
   * service.
   *
   * The default belongs to the platform, so the client asks for it and never
   * carries a copy of it.
   */
  protected restoreTemplate(): void {
    const serviceId = this.selectedServiceId();
    const serviceName = this.catalogServices().find((service) => service.id === serviceId)?.name;
    if (!serviceId) {
      return;
    }

    this.dialog
      .open(RestoreTemplateDialog, {
        data: { serviceName: serviceName ?? 'este servicio' },
        width: '32rem',
        maxWidth: '92vw',
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }

        void this.restore(serviceId);
      });
  }

  /**
   * restore replaces the template of the service with the default one.
   */
  private async restore(serviceId: string): Promise<void> {
    this.templateSaving.set(true);
    this.templateFailure.set(null);

    try {
      const template = await this.restoreServiceTemplate.execute({ serviceId });
      this.templateBody.set(template.body);
      this.templateTokens.set(template.tokens);
      this.notify('Contenido restablecido.');
      await this.loadEditorPreview();
    } catch (error) {
      this.templateFailure.set(this.describe(error).message);
    } finally {
      this.templateSaving.set(false);
    }
  }

  /**
   * saveTemplate asks the platform for the replacement of the template.
   */
  protected async saveTemplate(): Promise<void> {
    const serviceId = this.selectedServiceId();
    if (!serviceId) {
      return;
    }

    this.templateSaving.set(true);
    this.templateFailure.set(null);

    try {
      const template = await this.saveServiceTemplate.execute({
        serviceId,
        body: this.templateBody(),
      });
      this.templateBody.set(template.body);
      this.templateTokens.set(template.tokens);
      this.notify('Contenido del certificado guardado.');
      await this.loadEditorPreview();
    } catch (error) {
      this.templateFailure.set(this.describe(error).message);
    } finally {
      this.templateSaving.set(false);
    }
  }

  /**
   * reload brings the queue of the certificates again.
   *
   * The queue is read every time the page is shown, so a certificate that
   * was just issued is in the listing without reloading the browser.
   */
  private async reload(): Promise<void> {
    const request = ++this.listingRequest;
    this.loading.set(true);
    this.loadFailure.set(null);

    try {
      const [queue, history] = await Promise.all([
        this.listQueue.execute({
          page: this.pendingPage(),
          search: this.searchTerm(),
          serviceId: this.serviceFilter(),
        }),
        this.listCertificates.execute({
          page: this.historyPage(),
          search: this.searchTerm(),
          workUnitCode: this.workUnitFilter(),
          status: certificateStatusOf(this.statusFilter()),
          limit: CERTIFICATE_PAGE_SIZE,
        }),
      ]);
      if (request !== this.listingRequest) return;

      // An issuance or annulment can remove the last row of the current page.
      const pendingPage = Math.max(1, Math.min(this.pendingPage(), queue.totalPages));
      const historyPage = Math.max(1, Math.min(this.historyPage(), history.totalPages));
      if (pendingPage !== this.pendingPage() || historyPage !== this.historyPage()) {
        this.pendingPage.set(pendingPage);
        this.historyPage.set(historyPage);
        await this.reload();
        return;
      }

      const names = await this.resolveServiceNames([
        ...queue.items.map((item) => item.assignment.serviceId),
        ...history.items.map((certificate) => certificate.serviceId),
      ]);
      if (request !== this.listingRequest) return;
      this.queue.set(queue.items);
      this.certificates.set(history.items);
      this.pendingTotalPages.set(queue.totalPages);
      this.historyTotalPages.set(history.totalPages);
      this.serviceNames.set(names);
    } catch (error) {
      if (request === this.listingRequest) this.loadFailure.set(this.describe(error));
    } finally {
      if (request === this.listingRequest) this.loading.set(false);
    }
  }

  /**
   * loadServices reads the services of the catalog.
   */
  private async loadServices(): Promise<void> {
    try {
      const services = await this.services.listServices();
      this.catalogServices.set(services);

      if (!this.selectedServiceId() && services.length > 0) {
        this.selectService(services[0].id);
      }
    } catch {
      this.catalogServices.set([]);
    }
  }

  /**
   * loadTemplate reads the template of a service.
   */
  private async loadTemplate(serviceId: string): Promise<void> {
    this.templateLoading.set(true);
    this.templateFailure.set(null);

    try {
      const template = await this.getTemplate.execute(serviceId);
      if (this.destroyed || this.selectedServiceId() !== serviceId) return;
      this.templateBody.set(template.body);
      this.templateTokens.set(template.tokens);
      await this.loadEditorPreview();
    } catch (error) {
      if (!this.destroyed && this.selectedServiceId() === serviceId) {
        this.templateFailure.set(this.describe(error).message);
      }
    } finally {
      if (!this.destroyed && this.selectedServiceId() === serviceId)
        this.templateLoading.set(false);
    }
  }

  /**
   * resolveServiceNames asks the catalog for the names of the given
   * services.
   *
   * The catalog is not the owner of this listing, so a failure of the
   * catalog only leaves the badge without a name.
   */
  private async resolveServiceNames(
    serviceIds: readonly string[],
  ): Promise<ReadonlyMap<string, string>> {
    try {
      return await this.services.resolveServiceNames([...new Set(serviceIds)]);
    } catch {
      return new Map();
    }
  }

  /**
   * toPendingRow presents an assignment of the queue.
   */
  private toPendingRow(item: CertificateQueueItem): PendingCertificateRow {
    const snapshot = item.assignment.snapshot;

    return {
      assignmentId: item.assignment.assignmentId,
      workerName: snapshot.fullName,
      dni: snapshot.dni,
      position: snapshot.position,
      workUnit: snapshot.workUnit,
      workUnitCode: snapshot.workUnitCode,
      startDate: snapshot.startDate,
      endDate: snapshot.endDate,
      serviceName: this.serviceNameOf(snapshot, item.assignment.serviceId),
    };
  }

  /**
   * toIssuedRow presents an issued certificate.
   */
  private toIssuedRow(certificate: Certificate): IssuedCertificateRow {
    const snapshot = certificate.snapshot;

    return {
      certificateId: certificate.id.value,
      certificateCode: certificate.code.value,
      workerName: snapshot.fullName,
      dni: snapshot.dni,
      position: snapshot.position,
      workUnit: snapshot.workUnit,
      workUnitCode: snapshot.workUnitCode,
      issuedAt: certificate.issuedAt,
      status: certificate.status,
      serviceName: this.serviceNameOf(snapshot, certificate.serviceId),
    };
  }

  /**
   * serviceNameOf returns the name of the service of a certificate.
   *
   * The archived name is the one that the certificate wrote, so it comes
   * first: the catalog only answers when the certificate was issued before
   * the platform archived the name of the service.
   */
  private serviceNameOf(snapshot: CertificateSnapshot, serviceId: string): string | null {
    return snapshot.service || this.serviceNames().get(serviceId) || null;
  }

  /**
   * describe turns a failure into the state the interfaces show.
   *
   * The state names what happened, so the worker knows whether the service
   * is down, whether the platform rejected the operation or whether the
   * answer was not understood.
   */
  private describe(error: unknown): CertificateLoadFailure {
    if (error instanceof CertificateApiError) {
      if (error.status === 0) {
        return {
          title: 'No se pudo conectar con el servidor',
          message:
            'El servicio de certificados no respondió. Verifica que el servidor esté activo e inténtalo nuevamente.',
        };
      }

      if (error.code === 'invalid_template') {
        return {
          title: 'El contenido del certificado no es válido',
          message:
            'El texto debe usar las variables disponibles entre llaves, como {nombres}, y ninguna otra.',
        };
      }

      if (error.status >= 500) {
        return {
          title: 'El servicio de certificados no está disponible',
          message: 'El servidor falló al responder. Inténtalo nuevamente en unos instantes.',
        };
      }

      if (error.code === 'unexpected_error') {
        return {
          title: 'No se pudieron cargar los certificados',
          message:
            'La plataforma no devolvió una respuesta válida. Inténtalo nuevamente en unos instantes.',
        };
      }

      return {
        title: 'No se pudieron cargar los certificados',
        message: error.detail,
      };
    }

    return {
      title: 'No se pudieron cargar los certificados',
      message:
        'Ocurrió un problema inesperado al consultar los certificados. Inténtalo nuevamente.',
    };
  }

  /**
   * notify shows the outcome of an action.
   */
  private notify(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
  }
}
