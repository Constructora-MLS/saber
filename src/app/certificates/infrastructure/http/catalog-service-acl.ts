// Package http holds the anti-corruption layer that reads the services of
// the Catalog bounded context.
//
// The adapter consumes the published contract of the other context, never
// its internals, so the Certificates context stays independent of it.
// package http

import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../api.config';
import {
  CATALOG_SELECTOR_PAGE_SIZE,
  normalizeCatalogSearch,
} from '../../../shared/application/queries/catalog-search';
import {
  CertificateWorkUnitReference,
  CertificateServiceReference,
  CertificateServiceResolver,
} from '../../domain/services/certificate-service-resolver';

/**
 * The published representation of a service.
 *
 * It is the part of the contract of the Catalog context that the
 * Certificates context needs: the identifier and the name of the service
 * whose template the certificates use.
 */
interface ServiceResource {
  readonly uuid: string;
  readonly name: string;
}

/**
 * The highest number of identifiers that a resolution asks for at once.
 *
 * The platform caps the page at a hundred records, so a resolution of more
 * identifiers is asked in several pages.
 */
const MAX_IDS_PER_REQUEST = 100;

/**
 * The size of the page of services that the editor shows.
 */
const SERVICE_PAGE_SIZE = 100;

/**
 * CatalogServiceAcl resolves the services that the Certificates context
 * points at.
 *
 * The adapter never keeps a copy of the catalog: every read asks the
 * platform for the page it needs.
 */
@Injectable()
export class CatalogServiceAcl implements CertificateServiceResolver {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  async listWorkUnits(search?: string): Promise<readonly CertificateWorkUnitReference[]> {
    let params = new HttpParams().set('limit', CATALOG_SELECTOR_PAGE_SIZE).set('page', 1);
    const term = normalizeCatalogSearch(search);
    if (term) params = params.set('search', term);
    // Do not filter by ACTIVE: historical certificates may refer to inactive works.
    const page = await firstValueFrom(
      this.http.get<{
        readonly items: readonly { readonly code: string; readonly name: string }[];
      }>(`${this.baseUrl}/work-units`, { params }),
    );
    return page.items.map(({ code, name }) => ({ code, name }));
  }

  /**
   * resolveServiceNames returns the name of every given service.
   */
  async resolveServiceNames(serviceIds: readonly string[]): Promise<ReadonlyMap<string, string>> {
    const names = new Map<string, string>();

    for (let index = 0; index < serviceIds.length; index += MAX_IDS_PER_REQUEST) {
      const records = await this.read(serviceIds.slice(index, index + MAX_IDS_PER_REQUEST));

      for (const record of records) {
        names.set(record.uuid, record.name);
      }
    }

    return names;
  }

  /**
   * listServices returns the services of the catalog.
   */
  async listServices(): Promise<readonly CertificateServiceReference[]> {
    const records = await this.read([]);

    return records
      .map((record) => ({ id: record.uuid, name: record.name }))
      .sort((left, right) => left.name.localeCompare(right.name, 'es'));
  }

  /**
   * read asks the platform for a known set of services, or for the first
   * page of them when the set is empty.
   */
  private async read(serviceIds: readonly string[]): Promise<readonly ServiceResource[]> {
    let params = new HttpParams().set('limit', String(SERVICE_PAGE_SIZE));
    if (serviceIds.length > 0) {
      params = params.set('ids', serviceIds.join(','));
    }

    const page = await firstValueFrom(
      this.http.get<{ readonly items: readonly ServiceResource[] }>(`${this.baseUrl}/services`, {
        params,
      }),
    );

    return page.items;
  }
}
