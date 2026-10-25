// Package certificatespage orchestrates the certificates of the platform.
//
// The page is the frontend controller of the bounded context: it reads the
// queue of the assignments through the use cases, it opens the page that
// reviews and issues a certificate and it edits the content of the
// certificate of every service. It never talks to the API directly.
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
import { Router } from '@angular/router';
import {
  GetCertificateFileQueryService,
  GetServiceTemplatePreviewQueryService,
  GetServiceTemplateQueryService,
  ListCertificateQueueQueryService,
} from '../../../application/query-services/certificate-query-services';
import {
  AnnulCertificateCommandService,
  RestoreServiceTemplateCommandService,
  SaveServiceTemplateCommandService,
} from '../../../application/command-services/certificate-command-services';
import { CertificateQueueItem } from '../../../application/queries/certificate-queries';
import { Certificate } from '../../../domain/model/aggregates/certificate';
import { CertificateApiError } from '../../../infrastructure/http/certificate-api.error';
import {
  CertificateServiceReference,
  CERTIFICATE_SERVICE_RESOLVER,
} from '../../../domain/services/certificate-service-resolver';
import {
  CertificateHistory,
  IssuedCertificateCard,
} from '../../components/certificate-history/certificate-history';
import {
  CertificateQueue,
  PendingCertificateCard,
} from '../../components/certificate-queue/certificate-queue';
import { CertificateTemplateEditor } from '../../components/certificate-template-editor/certificate-template-editor';
import { CertificateViewerDialog } from '../../components/certificate-viewer-dialog/certificate-viewer-dialog';
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
 * normalize writes a text so that two writings of the same term are the
 * same one.
 *
 * The search of the queue is a search of the platform, so it does not
 * depend on the accents nor on the case of what the worker writes.
 */
function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

/**
 * CertificatesPage orchestrates the certificates of the platform.
 *
 * The page shows the queue of the assignments that are waiting for a
 * certificate, the history of the certificates that were issued and the
 * editor of the content of every service. It reads all of them through the
 * use cases and it never talks to the API directly.
 */
@Component({
  imports: [
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
  styleUrl: './certificates-page.scss',
  templateUrl: './certificates-page.html',
})
export class CertificatesPage implements OnInit {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  private readonly listQueue = inject(ListCertificateQueueQueryService);
  private readonly getFile = inject(GetCertificateFileQueryService);
  private readonly getTemplate = inject(GetServiceTemplateQueryService);
  private readonly saveServiceTemplate = inject(SaveServiceTemplateCommandService);
  private readonly restoreServiceTemplate = inject(RestoreServiceTemplateCommandService);
  private readonly annulCertificate = inject(AnnulCertificateCommandService);
  private readonly services = inject(CERTIFICATE_SERVICE_RESOLVER);
  private readonly getPreview = inject(GetServiceTemplatePreviewQueryService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  /** The pending preview of the editor is cancelled once, when the page goes away. */
  private previewTimer: ReturnType<typeof setTimeout> | null = null;

  /** The view of the certificates that is shown. */
  protected readonly activeTab = signal<CertificatesTab>('pendientes');

  /** The term of the search of the listing. */
  protected readonly searchTerm = signal('');
  /** The service that the listing is filtered by. */
  protected readonly serviceFilter = signal('');
  /** The day the issuance of the listing starts at. */
  protected readonly issuedFrom = signal('');
  /** The day the issuance of the listing ends at. */
  protected readonly issuedTo = signal('');

  /** The queue of the assignments that may receive a certificate. */
  protected readonly queue = signal<readonly CertificateQueueItem[]>([]);
  /** The name of the services of the queue. */
  protected readonly serviceNames = signal<ReadonlyMap<string, string>>(new Map());

  /** Whether the page is waiting for the answer of the platform. */
  protected readonly loading = signal(false);
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
      label: 'Pendientes de emisión',
      icon: 'pending_actions',
      title: 'Certificados',
      subtitle: 'Asignaciones cesadas que aún no tienen certificado.',
      recordsLabel: 'Asignaciones pendientes de certificado',
    },
    {
      id: 'emitidos',
      label: 'Emitidos',
      icon: 'history',
      title: 'Historial de certificados',
      subtitle: 'Consulta los certificados emitidos y descarga su PDF.',
      recordsLabel: 'Certificados emitidos',
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
  protected readonly pendingCards = computed<readonly PendingCertificateCard[]>(() => {
    const term = normalize(this.searchTerm());
    const serviceId = this.serviceFilter();

    return this.pendingItems()
      .filter((item) => !serviceId || item.assignment.serviceId === serviceId)
      .map((item) => this.toPendingCard(item))
      .filter((card) =>
        this.matches(
          [card.workerName, card.dni, card.position, card.workUnit, card.workUnitCode],
          term,
        ),
      );
  });

  /**
   * The certificates that were issued.
   */
  protected readonly issuedCards = computed<readonly IssuedCertificateCard[]>(() => {
    const term = normalize(this.searchTerm());
    const from = this.issuedFrom();
    const to = this.issuedTo();

    return this.queue()
      .flatMap((item) => item.certificates)
      .filter((certificate) => this.withinRange(certificate.issuedAt, from, to))
      .map((certificate) => this.toIssuedCard(certificate))
      .filter((card) =>
        this.matches([card.workerName, card.dni, card.workUnit, card.workUnitCode], term),
      );
  });

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

    return [...options.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((left, right) => left.name.localeCompare(right.name, 'es'));
  });

  /**
   * The number of assignments that are waiting for a certificate.
   */
  protected readonly pendingCount = computed(() => this.pendingItems().length);

  /**
   * ngOnInit loads the queue of the certificates and the services of the
   * catalog.
   */
  ngOnInit(): void {
    // The pending preview is cancelled once, when the page goes away: the
    // callback is not registered on every keystroke.
    this.destroyRef.onDestroy(() => {
      if (this.previewTimer !== null) {
        clearTimeout(this.previewTimer);
        this.previewTimer = null;
      }
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

    if (tab !== 'contenido') {
      return;
    }

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
  }

  /**
   * clearSearch empties the search of the listing.
   */
  protected clearSearch(): void {
    if (this.searchTerm().length === 0) {
      return;
    }
    this.searchTerm.set('');
  }

  /**
   * onServiceChanged filters the queue by service.
   */
  protected onServiceChanged(serviceId: string): void {
    this.serviceFilter.set(serviceId);
  }

  /**
   * onIssuedFromChanged filters the history by the day of the issuance.
   */
  protected onIssuedFromChanged(value: string): void {
    this.issuedFrom.set(value);
  }

  /**
   * onIssuedToChanged filters the history by the day of the issuance.
   */
  protected onIssuedToChanged(value: string): void {
    this.issuedTo.set(value);
  }

  /**
   * retry consults the queue again.
   */
  protected retry(): void {
    void this.reload();
  }

  /**
   * review opens the page that reviews the certificate of an assignment.
   */
  protected review(assignmentId: string): void {
    void this.router.navigate(['/certificates/assignment', assignmentId]);
  }

  /**
   * view opens the document of an issued certificate.
   */
  protected view(card: IssuedCertificateCard): void {
    this.dialog.open(CertificateViewerDialog, {
      data: { certificateId: card.certificateId, workerName: card.workerName },
      width: '52rem',
      maxWidth: '96vw',
    });
  }

  /**
   * download asks the platform for the PDF of a certificate and hands it to
   * the browser.
   */
  protected async download(card: IssuedCertificateCard): Promise<void> {
    try {
      const file = await this.getFile.execute(card.certificateId);
      const url = URL.createObjectURL(file);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Certificado - ${card.workerName}.pdf`;
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
  protected annul(card: IssuedCertificateCard): void {
    this.dialog
      .open(AnnulCertificateDialog, {
        data: { workerName: card.workerName },
        width: '34rem',
        maxWidth: '92vw',
      })
      .afterClosed()
      .subscribe((reason) => {
        if (!reason) {
          return;
        }

        void this.annulCertificate.execute({ certificateId: card.certificateId, reason });
        this.notify('Certificado anulado.');
        void this.reload();
      });
  }

  /**
   * selectService asks for the template of another service.
   */
  protected selectService(serviceId: string): void {
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
  private schedulePreview(): void {
    if (this.previewTimer !== null) {
      clearTimeout(this.previewTimer);
    }

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
    const serviceId = this.selectedServiceId();
    if (!serviceId) {
      this.setEditorPreview(null);
      return;
    }

    try {
      const file = await this.getPreview.execute(serviceId, this.templateBody());
      this.editorPreviewFailure.set(null);
      this.setEditorPreview(URL.createObjectURL(file));
    } catch (error) {
      this.editorPreviewFailure.set(this.describe(error).message);
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
    this.loading.set(true);
    this.loadFailure.set(null);

    try {
      const queue = await this.listQueue.execute();
      this.queue.set(queue.items);

      const names = await this.resolveServiceNames(queue.items);
      this.serviceNames.set(names);

      // The preview of the editor renders the document with the data of a
      // real assignment of the service, so it waits for the queue.
      if (this.activeTab() === 'contenido') {
        await this.loadEditorPreview();
      }
    } catch (error) {
      this.loadFailure.set(this.describe(error));
    } finally {
      this.loading.set(false);
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
      this.templateBody.set(template.body);
      this.templateTokens.set(template.tokens);
      await this.loadEditorPreview();
    } catch (error) {
      this.templateFailure.set(this.describe(error).message);
    } finally {
      this.templateLoading.set(false);
    }
  }

  /**
   * resolveServiceNames asks the catalog for the names of the services of
   * the queue.
   *
   * The catalog is not the owner of this listing, so a failure of the
   * catalog only leaves the badge without a name.
   */
  private async resolveServiceNames(
    items: readonly CertificateQueueItem[],
  ): Promise<ReadonlyMap<string, string>> {
    const serviceIds = [...new Set(items.map((item) => item.assignment.serviceId))];

    try {
      return await this.services.resolveServiceNames(serviceIds);
    } catch {
      return new Map();
    }
  }

  /**
   * pendingItems are the assignments of the queue that are waiting for a
   * certificate.
   *
   * An assignment that already has a certificate in force is not waiting
   * for one anymore: it is in the history.
   */
  private pendingItems(): readonly CertificateQueueItem[] {
    return this.queue().filter(
      (item) => !item.certificates.some((certificate) => certificate.isIssued),
    );
  }

  /**
   * toPendingCard presents an assignment of the queue.
   */
  private toPendingCard(item: CertificateQueueItem): PendingCertificateCard {
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
      serviceName: this.serviceNames().get(item.assignment.serviceId) ?? null,
    };
  }

  /**
   * toIssuedCard presents an issued certificate.
   */
  private toIssuedCard(certificate: Certificate): IssuedCertificateCard {
    const snapshot = certificate.snapshot;

    return {
      certificateId: certificate.id.value,
      workerName: snapshot.fullName,
      dni: snapshot.dni,
      workUnit: snapshot.workUnit,
      workUnitCode: snapshot.workUnitCode,
      issuedAt: certificate.issuedAt,
      status: certificate.status,
      serviceName: this.serviceNames().get(certificate.serviceId) ?? null,
    };
  }

  /**
   * matches reports whether a record matches the term of the search.
   */
  private matches(values: readonly string[], term: string): boolean {
    if (term.length === 0) {
      return true;
    }

    return normalize(values.join(' ')).includes(term);
  }

  /**
   * withinRange reports whether a moment of the issuance is between the two
   * days of the filter.
   */
  private withinRange(issuedAt: string, from: string, to: string): boolean {
    const day = issuedAt.slice(0, 10);

    if (from && day < from) {
      return false;
    }

    if (to && day > to) {
      return false;
    }

    return true;
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
