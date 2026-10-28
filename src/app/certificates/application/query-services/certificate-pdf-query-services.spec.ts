import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { CertificateGateway } from '../../infrastructure/gateways/certificate.gateway';
import {
  GetCertificateFileQueryService,
  GetCertificatePreviewQueryService,
  GetServiceTemplatePreviewQueryService,
} from './certificate-query-services';

function setup(download = vi.fn(async () => new Blob(['PDF']))) {
  const preview = vi.fn(async () => new Blob(['preview']));
  const templatePreview = vi.fn(async () => new Blob(['template']));
  const injector = Injector.create({
    providers: [
      {
        provide: CertificateGateway,
        useValue: {
          downloadCertificateFile: download,
          previewCertificate: preview,
          previewServiceTemplate: templatePreview,
        },
      },
    ],
  });
  return {
    files: runInInjectionContext(injector, () => new GetCertificateFileQueryService()),
    previews: runInInjectionContext(injector, () => new GetCertificatePreviewQueryService()),
    templates: runInInjectionContext(injector, () => new GetServiceTemplatePreviewQueryService()),
    download,
    preview,
    templatePreview,
  };
}

describe('carga de PDFs', () => {
  it('reutiliza un PDF emitido entre consultas', async () => {
    const { files, download } = setup();
    const first = await files.execute('certificate-1');
    expect(await files.execute('certificate-1')).toBe(first);
    expect(download).toHaveBeenCalledTimes(1);
  });

  it('conserva como máximo cinco PDFs y descarta el menos usado', async () => {
    const { files, download } = setup();
    for (let index = 0; index < 5; index++) await files.execute(`${index}`);
    await files.execute('0');
    await files.execute('5');
    await files.execute('0');
    expect(download).toHaveBeenCalledTimes(6);
    await files.execute('1');
    expect(download).toHaveBeenCalledTimes(7);
  });

  it('limita la memoria total y no guarda PDFs que exceden el límite', async () => {
    const download = vi.fn(async () => new Blob([new Uint8Array(6 * 1024 * 1024)]));
    const { files } = setup(download);
    await files.execute('1');
    await files.execute('2');
    await files.execute('1');
    expect(download).toHaveBeenCalledTimes(3);
    download.mockResolvedValue(new Blob([new Uint8Array(11 * 1024 * 1024)]));
    await files.execute('large');
    await files.execute('large');
    expect(download).toHaveBeenCalledTimes(5);
  });

  it('no guarda errores ni resultados cancelados', async () => {
    const download = vi.fn(async () => new Blob(['PDF']));
    const { files } = setup(download);
    download.mockRejectedValueOnce(new Error('Network error'));
    await expect(files.execute('1')).rejects.toThrow('Network error');
    const controller = new AbortController();
    download.mockImplementationOnce(async () => {
      controller.abort();
      return new Blob(['late PDF']);
    });
    await expect(files.execute('1', controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    await files.execute('1');
    expect(download).toHaveBeenCalledTimes(3);
    await expect(files.execute('1', controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('propaga la cancelación y no cachea vistas previas modificables', async () => {
    const { previews, templates, preview, templatePreview } = setup();
    const signal = new AbortController().signal;
    await previews.execute('assignment', signal);
    await previews.execute('assignment', signal);
    await templates.execute('service', 'body', signal);
    expect(preview).toHaveBeenCalledTimes(2);
    expect(preview).toHaveBeenLastCalledWith('assignment', signal);
    expect(templatePreview).toHaveBeenCalledWith('service', 'body', signal);
  });
});
