import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, firstValueFrom, throwError } from 'rxjs';
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
} from '../contracts/catalog.contract';
import { toCatalogApiError } from '../errors/catalog-api.error';
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
  WorkUnitCriteria,
} from '../../application/queries/catalog-queries';
import { UpdatableCatalogStatus } from '../../domain/model/value-objects/catalog-status';

export interface NewService {
  readonly name: CatalogName;
  readonly description: Description | null;
}

export interface NewPosition {
  readonly name: CatalogName;
  readonly description: Description | null;
}

export interface NewRegime {
  readonly name: CatalogName;
  readonly description: Description | null;
}

export interface NewWorkUnit {
  readonly name: CatalogName;
  readonly description: Description | null;
  readonly serviceId: string;
}

export interface ServiceChanges {
  readonly id: string;
  readonly name: CatalogName;
  readonly description: Description | null;
  readonly status: UpdatableCatalogStatus;
}

export interface PositionChanges {
  readonly id: string;
  readonly name: CatalogName;
  readonly description: Description | null;
  readonly status: UpdatableCatalogStatus;
}

export interface RegimeChanges {
  readonly id: string;
  readonly name: CatalogName;
  readonly description: Description | null;
  readonly status: UpdatableCatalogStatus;
}

export interface WorkUnitChanges {
  readonly id: string;
  readonly name: CatalogName;
  readonly description: Description | null;
  readonly serviceId?: string;
  readonly status: UpdatableCatalogStatus;
}

/**
 * CatalogGateway encapsulates HTTP communication with the Catalog API.
 */
@Injectable({ providedIn: 'root' })
export class CatalogGateway {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  async listServices(criteria: CatalogCriteria): Promise<CatalogPage<Service>> {
    const page = await this.get<ServicePageResource>('/services', this.params(criteria));

    return {
      items: page.items.map((item) => this.toService(item)),
      page: page.page,
      totalPages: page.totalPages,
      total: page.total,
    };
  }

  async createService(service: NewService): Promise<Service> {
    const request: CreateServiceRequest = {
      name: service.name.value,
      ...(service.description ? { description: service.description.value } : {}),
    };
    const created = await this.post<ServiceResource>('/services', request);

    return this.toService(created);
  }

  async updateService(changes: ServiceChanges): Promise<Service> {
    const request: UpdateServiceRequest = {
      name: changes.name.value,
      description: changes.description ? changes.description.value : '',
      status: changes.status,
    };
    const updated = await this.patch<ServiceResource>(`/services/${changes.id}`, request);

    return this.toService(updated);
  }

  async deleteService(id: string): Promise<void> {
    await this.delete(`/services/${id}`);
  }

  async listPositions(criteria: CatalogCriteria): Promise<CatalogPage<Position>> {
    const page = await this.get<PositionPageResource>('/positions', this.params(criteria));

    return {
      items: page.items.map((item) => this.toPosition(item)),
      page: page.page,
      totalPages: page.totalPages,
      total: page.total,
    };
  }

  async createPosition(position: NewPosition): Promise<Position> {
    const request: CreatePositionRequest = {
      name: position.name.value,
      ...(position.description ? { description: position.description.value } : {}),
    };
    const created = await this.post<PositionResource>('/positions', request);

    return this.toPosition(created);
  }

  async updatePosition(changes: PositionChanges): Promise<Position> {
    const request: UpdatePositionRequest = {
      name: changes.name.value,
      description: changes.description ? changes.description.value : '',
      status: changes.status,
    };
    const updated = await this.patch<PositionResource>(`/positions/${changes.id}`, request);

    return this.toPosition(updated);
  }

  async deletePosition(id: string): Promise<void> {
    await this.delete(`/positions/${id}`);
  }

  async listRegimes(criteria: CatalogCriteria): Promise<CatalogPage<Regime>> {
    const page = await this.get<RegimePageResource>('/regimes', this.params(criteria));

    return {
      items: page.items.map((item) => this.toRegime(item)),
      page: page.page,
      totalPages: page.totalPages,
      total: page.total,
    };
  }

  async createRegime(regime: NewRegime): Promise<Regime> {
    const request: CreateRegimeRequest = {
      name: regime.name.value,
      ...(regime.description ? { description: regime.description.value } : {}),
    };
    const created = await this.post<RegimeResource>('/regimes', request);

    return this.toRegime(created);
  }

  async updateRegime(changes: RegimeChanges): Promise<Regime> {
    const request: UpdateRegimeRequest = {
      name: changes.name.value,
      description: changes.description ? changes.description.value : '',
      status: changes.status,
    };
    const updated = await this.patch<RegimeResource>(`/regimes/${changes.id}`, request);

    return this.toRegime(updated);
  }

  async deleteRegime(id: string): Promise<void> {
    await this.delete(`/regimes/${id}`);
  }

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

  async createWorkUnit(workUnit: NewWorkUnit): Promise<WorkUnit> {
    const request: CreateWorkUnitRequest = {
      name: workUnit.name.value,
      serviceId: workUnit.serviceId,
      ...(workUnit.description ? { description: workUnit.description.value } : {}),
    };
    const created = await this.post<WorkUnitResource>('/work-units', request);

    return this.toWorkUnit(created);
  }

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

  async deleteWorkUnit(id: string): Promise<void> {
    await this.delete(`/work-units/${id}`);
  }

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

  private async get<T>(path: string, params: HttpParams): Promise<T> {
    return firstValueFrom(
      this.http
        .get<T>(`${this.baseUrl}${path}`, { params })
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(
      this.http
        .post<T>(`${this.baseUrl}${path}`, body)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );
  }

  private async patch<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(
      this.http
        .patch<T>(`${this.baseUrl}${path}`, body)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );
  }

  private async delete(path: string): Promise<void> {
    await firstValueFrom(
      this.http
        .delete<void>(`${this.baseUrl}${path}`)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );
  }

  private toFailure(error: HttpErrorResponse) {
    return throwError(() => toCatalogApiError(error.status, error.error));
  }

  private toService(resource: ServiceResource): Service {
    return Service.restore(
      resource.uuid,
      CatalogName.restore(resource.name),
      this.description(resource.description),
      resource.status,
    );
  }

  private toPosition(resource: PositionResource): Position {
    return Position.restore(
      resource.uuid,
      CatalogName.restore(resource.name),
      this.description(resource.description),
      resource.status,
    );
  }

  private toRegime(resource: RegimeResource): Regime {
    return Regime.restore(
      resource.uuid,
      CatalogName.restore(resource.name),
      this.description(resource.description),
      resource.status,
    );
  }

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

  private description(raw: string | undefined): Description | null {
    if (raw === undefined || raw.trim().length === 0) {
      return null;
    }
    return Description.restore(raw);
  }
}

// For backwards-compatibility alias
export { CatalogGateway as CatalogHttpGateway };
