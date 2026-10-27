// Package http holds the adapter that talks to the API of the Catalog
// bounded context.
//
// The gateway is the anti-corruption layer: it translates the published
// contract into the language of the domain.
// package http

import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, firstValueFrom, map, throwError } from 'rxjs';
import { API_BASE_URL } from '../../../api.config';
import {
  CreatePositionRequest,
  CreateRegimeRequest,
  CreateServiceRequest,
  CreateWorkUnitRequest,
  PositionPageResource,
  PositionResource,
  RegimePageResource,
  RegimeResource,
  ServicePageResource,
  ServiceResource,
  UpdatePositionRequest,
  UpdateRegimeRequest,
  UpdateServiceRequest,
  UpdateWorkUnitRequest,
  WorkUnitPageResource,
  WorkUnitResource,
} from './catalog-api.contract';
import { toCatalogApiError } from './catalog-api.error';
import { Position } from '../../domain/model/aggregates/position';
import { Regime } from '../../domain/model/aggregates/regime';
import { Service } from '../../domain/model/aggregates/service';
import { WorkUnit } from '../../domain/model/aggregates/work-unit';
import { CatalogName } from '../../domain/model/value-objects/catalog-name';
import { Description } from '../../domain/model/value-objects/description';
import { UnitCode } from '../../domain/model/value-objects/unit-code';
import {
  CatalogCriteria,
  CatalogPage,
  NewPosition,
  NewRegime,
  NewService,
  NewWorkUnit,
  PositionChanges,
  PositionRepository,
  RegimeChanges,
  RegimeRepository,
  ServiceChanges,
  ServiceRepository,
  WorkUnitChanges,
  WorkUnitCriteria,
  WorkUnitRepository,
} from '../../domain/repositories/catalog-repositories';

/**
 * CatalogHttpGateway is the adapter of the registries of the Catalog bounded
 * context.
 */
@Injectable()
export class CatalogHttpGateway
  implements ServiceRepository, PositionRepository, RegimeRepository, WorkUnitRepository
{
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /**
   * list returns the page of the services that matches the criteria.
   */
  async listServices(criteria: CatalogCriteria): Promise<CatalogPage<Service>> {
    const page = await this.get<ServicePageResource>('/services', this.params(criteria));

    return {
      items: page.items.map((item) => this.toService(item)),
      page: page.page,
      totalPages: page.totalPages,
      total: page.total,
    };
  }

  /**
   * create registers a service in the catalog.
   */
  async createService(service: NewService): Promise<Service> {
    const request: CreateServiceRequest = {
      name: service.name.value,
      ...(service.description ? { description: service.description.value } : {}),
    };
    const created = await this.post<ServiceResource>('/services', request);

    return this.toService(created);
  }

  /**
   * update applies the changes to a service.
   */
  async updateService(changes: ServiceChanges): Promise<Service> {
    const request: UpdateServiceRequest = {
      name: changes.name.value,
      description: changes.description ? changes.description.value : '',
      status: changes.status,
    };
    const updated = await this.patch<ServiceResource>(`/services/${changes.id}`, request);

    return this.toService(updated);
  }

  /**
   * delete logically deletes a service.
   */
  async deleteService(id: string): Promise<void> {
    await this.delete(`/services/${id}`);
  }

  /**
   * list returns the page of the positions that matches the criteria.
   */
  async listPositions(criteria: CatalogCriteria): Promise<CatalogPage<Position>> {
    const page = await this.get<PositionPageResource>('/positions', this.params(criteria));

    return {
      items: page.items.map((item) => this.toPosition(item)),
      page: page.page,
      totalPages: page.totalPages,
      total: page.total,
    };
  }

  /**
   * create registers a position in the catalog.
   */
  async createPosition(position: NewPosition): Promise<Position> {
    const request: CreatePositionRequest = {
      name: position.name.value,
      ...(position.description ? { description: position.description.value } : {}),
    };
    const created = await this.post<PositionResource>('/positions', request);

    return this.toPosition(created);
  }

  /**
   * update applies the changes to a position.
   */
  async updatePosition(changes: PositionChanges): Promise<Position> {
    const request: UpdatePositionRequest = {
      name: changes.name.value,
      description: changes.description ? changes.description.value : '',
      status: changes.status,
    };
    const updated = await this.patch<PositionResource>(`/positions/${changes.id}`, request);

    return this.toPosition(updated);
  }

  /**
   * delete logically deletes a position.
   */
  async deletePosition(id: string): Promise<void> {
    await this.delete(`/positions/${id}`);
  }

  /**
   * list returns the page of the regimes that matches the criteria.
   */
  async listRegimes(criteria: CatalogCriteria): Promise<CatalogPage<Regime>> {
    const page = await this.get<RegimePageResource>('/regimes', this.params(criteria));

    return {
      items: page.items.map((item) => this.toRegime(item)),
      page: page.page,
      totalPages: page.totalPages,
      total: page.total,
    };
  }

  /**
   * create registers a regime in the catalog.
   */
  async createRegime(regime: NewRegime): Promise<Regime> {
    const request: CreateRegimeRequest = {
      name: regime.name.value,
      ...(regime.description ? { description: regime.description.value } : {}),
    };
    const created = await this.post<RegimeResource>('/regimes', request);

    return this.toRegime(created);
  }

  /**
   * update applies the changes to a regime.
   */
  async updateRegime(changes: RegimeChanges): Promise<Regime> {
    const request: UpdateRegimeRequest = {
      name: changes.name.value,
      description: changes.description ? changes.description.value : '',
      status: changes.status,
    };
    const updated = await this.patch<RegimeResource>(`/regimes/${changes.id}`, request);

    return this.toRegime(updated);
  }

  /**
   * delete logically deletes a regime.
   */
  async deleteRegime(id: string): Promise<void> {
    await this.delete(`/regimes/${id}`);
  }

  /**
   * list returns the page of the work units that matches the criteria.
   */
  async listWorkUnits(criteria: WorkUnitCriteria): Promise<CatalogPage<WorkUnit>> {
    const params = this.params(criteria);
    const serviceId = criteria.serviceId;
    const page = await this.get<WorkUnitPageResource>(
      '/work-units',
      serviceId ? params.set('serviceId', serviceId) : params,
    );

    return {
      items: page.items.map((item) => this.toWorkUnit(item)),
      page: page.page,
      totalPages: page.totalPages,
      total: page.total,
    };
  }

  /**
   * create registers a work unit in the catalog.
   */
  async createWorkUnit(workUnit: NewWorkUnit): Promise<WorkUnit> {
    const request: CreateWorkUnitRequest = {
      name: workUnit.name.value,
      serviceId: workUnit.serviceId,
      ...(workUnit.description ? { description: workUnit.description.value } : {}),
    };
    const created = await this.post<WorkUnitResource>('/work-units', request);

    return this.toWorkUnit(created);
  }

  /**
   * update applies the changes to a work unit.
   *
   * The service is only sent when it changes, so a work unit whose service
   * was disabled later can still be modified.
   */
  async updateWorkUnit(changes: WorkUnitChanges): Promise<WorkUnit> {
    const request: UpdateWorkUnitRequest = {
      name: changes.name.value,
      description: changes.description ? changes.description.value : '',
      ...(changes.serviceId ? { serviceId: changes.serviceId } : {}),
      status: changes.status,
    };
    const updated = await this.patch<WorkUnitResource>(`/work-units/${changes.id}`, request);

    return this.toWorkUnit(updated);
  }

  /**
   * delete logically deletes a work unit.
   */
  async deleteWorkUnit(id: string): Promise<void> {
    await this.delete(`/work-units/${id}`);
  }

  /**
   * params builds the query string of a listing.
   */
  private params(criteria: CatalogCriteria): HttpParams {
    let params = new HttpParams();
    if (criteria.search) {
      params = params.set('search', criteria.search);
    }
    if (criteria.status) {
      params = params.set('status', criteria.status);
    }
    if (criteria.limit) {
      params = params.set('limit', criteria.limit);
    }
    if (criteria.page) {
      params = params.set('page', String(criteria.page));
    }
    return params;
  }

  /**
   * get reads a resource of the API.
   */
  private async get<T>(path: string, params: HttpParams): Promise<T> {
    return firstValueFrom(
      this.http
        .get<T>(`${this.baseUrl}${path}`, { params })
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );
  }

  /**
   * post writes a resource of the API.
   */
  private async post<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(
      this.http
        .post<T>(`${this.baseUrl}${path}`, body)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );
  }

  /**
   * patch applies the changes to a resource of the API.
   */
  private async patch<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(
      this.http
        .patch<T>(`${this.baseUrl}${path}`, body)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );
  }

  /**
   * delete removes a resource of the API. The answer of a deletion carries
   * no body.
   */
  private async delete(path: string): Promise<void> {
    await firstValueFrom(
      this.http
        .delete<void>(`${this.baseUrl}${path}`)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );
  }

  /**
   * toFailure translates a failed response into the error of the context.
   */
  private toFailure(error: HttpErrorResponse) {
    return throwError(() => toCatalogApiError(error.status, error.error));
  }

  /**
   * toService rebuilds the service from its published representation.
   */
  private toService(resource: ServiceResource): Service {
    return Service.restore(
      resource.uuid,
      CatalogName.restore(resource.name),
      this.description(resource.description),
      resource.status,
    );
  }

  /**
   * toPosition rebuilds the position from its published representation.
   */
  private toPosition(resource: PositionResource): Position {
    return Position.restore(
      resource.uuid,
      CatalogName.restore(resource.name),
      this.description(resource.description),
      resource.status,
    );
  }

  /**
   * toRegime rebuilds the regime from its published representation.
   */
  private toRegime(resource: RegimeResource): Regime {
    return Regime.restore(
      resource.uuid,
      CatalogName.restore(resource.name),
      this.description(resource.description),
      resource.status,
    );
  }

  /**
   * toWorkUnit rebuilds the work unit from its published representation.
   */
  private toWorkUnit(resource: WorkUnitResource): WorkUnit {
    return WorkUnit.restore(
      resource.uuid,
      UnitCode.restore(resource.code),
      CatalogName.restore(resource.name),
      this.description(resource.description),
      resource.serviceId,
      resource.serviceName,
      resource.status,
    );
  }

  /**
   * description reads the optional description of a published record.
   */
  private description(raw: string | undefined): Description | null {
    if (raw === undefined || raw.trim().length === 0) {
      return null;
    }
    return Description.restore(raw);
  }
}
