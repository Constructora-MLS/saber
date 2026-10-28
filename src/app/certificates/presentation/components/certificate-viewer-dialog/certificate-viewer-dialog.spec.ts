import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GetCertificateFileQueryService,
  GetCertificatePreviewQueryService,
} from '../../../application/query-services/certificate-query-services';
import { CertificateViewerDialog } from './certificate-viewer-dialog';

class Viewer extends CertificateViewerDialog {
  closeDialog(): void {
    this.close();
  }
  get url() {
    return this.documentUrl();
  }
  get error() {
    return this.failure();
  }
}

function setup(execute: (id: string, signal?: AbortSignal) => Promise<Blob>) {
  const close = vi.fn();
  const injector = Injector.create({
    providers: [
      {
        provide: MAT_DIALOG_DATA,
        useValue: { kind: 'preview', assignmentId: 'assignment', workerName: 'Ana' },
      },
      { provide: MatDialogRef, useValue: { close } },
      { provide: GetCertificateFileQueryService, useValue: { execute } },
      { provide: GetCertificatePreviewQueryService, useValue: { execute } },
      { provide: DomSanitizer, useValue: { bypassSecurityTrustResourceUrl: (url: string) => url } },
    ],
  });
  return { viewer: runInInjectionContext(injector, () => new Viewer()), close };
}

afterEach(() => vi.restoreAllMocks());

describe('ciclo de vida del visor PDF', () => {
  it('libera la URL al cerrar y no la libera dos veces al destruir', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pdf');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const { viewer, close } = setup(async () => new Blob(['PDF']));
    await vi.waitFor(() => expect(viewer.url).toBe('blob:pdf'));
    viewer.closeDialog();
    viewer.ngOnDestroy();
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:pdf');
    expect(viewer.url).toBeNull();
    expect(close).toHaveBeenCalledOnce();
  });

  it('cancela al destruir y no crea URLs para respuestas tardías', async () => {
    const create = vi.spyOn(URL, 'createObjectURL');
    let resolve!: (file: Blob) => void;
    let signal: AbortSignal | undefined;
    const { viewer } = setup((_id, requestSignal) => {
      signal = requestSignal;
      return new Promise<Blob>((complete) => {
        resolve = complete;
      });
    });
    viewer.ngOnDestroy();
    expect(signal?.aborted).toBe(true);
    resolve(new Blob(['late PDF']));
    await Promise.resolve();
    expect(create).not.toHaveBeenCalled();
    expect(viewer.url).toBeNull();
    expect(viewer.error).toBeNull();
  });

  it('libera la URL también al destruir sin pulsar Cerrar', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pdf');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const { viewer } = setup(async () => new Blob(['PDF']));
    await vi.waitFor(() => expect(viewer.url).toBe('blob:pdf'));
    viewer.ngOnDestroy();
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:pdf');
  });
});
