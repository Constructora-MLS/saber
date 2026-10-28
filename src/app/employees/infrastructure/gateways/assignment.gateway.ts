import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { API_BASE_URL } from '../../../api.config';
import {
  AssignmentPageResource,
  AssignmentResource,
  AssignmentStatusResource,
  CeaseAssignmentRequest,
  CreateAssignmentRequest,
  UpdateAssignmentRequest,
} from '../contracts/assignment.contract';
import { toAssignmentApiError } from '../errors/assignment-api.error';
import { Assignment } from '../../domain/model/aggregates/assignment';
import { AssignmentDate } from '../../domain/model/value-objects/assignment-date';
import { AssignmentId } from '../../domain/model/value-objects/assignment-id';
import { AssignmentStatus } from '../../domain/model/value-objects/assignment-status';
import { EmployeeId } from '../../domain/model/value-objects/employee-id';
import { PositionId } from '../../domain/model/value-objects/position-id';
import { WorkUnitId } from '../../domain/model/value-objects/work-unit-id';
import {
  AssignmentCriteria,
  AssignmentPage,
} from '../../application/queries/assignment-queries';

export interface NewAssignment {
  readonly employeeId: EmployeeId;
  readonly workUnitId: WorkUnitId;
  readonly positionId: PositionId;
  readonly startDate: AssignmentDate;
}

export interface AssignmentChanges {
  readonly id: AssignmentId;
  readonly workUnitId?: WorkUnitId;
  readonly positionId?: PositionId;
  readonly startDate?: AssignmentDate;
}

export interface AssignmentRepository {
  listAssignments(criteria: AssignmentCriteria): Promise<AssignmentPage<Assignment>>;
  createAssignment(assignment: NewAssignment): Promise<Assignment>;
  updateAssignment(changes: AssignmentChanges): Promise<Assignment>;
  ceaseAssignment(id: AssignmentId, date: AssignmentDate): Promise<Assignment>;
  deleteAssignment(id: AssignmentId): Promise<void>;
}

export const ASSIGNMENT_REPOSITORY = new InjectionToken<AssignmentRepository>(
  'ASSIGNMENT_REPOSITORY',
  {
    providedIn: 'root',
    factory: () => inject(AssignmentGateway),
  },
);

@Injectable({ providedIn: 'root' })
export class AssignmentGateway implements AssignmentRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  async listAssignments(criteria: AssignmentCriteria): Promise<AssignmentPage<Assignment>> {
    const page = await firstValueFrom(
      this.http
        .get<AssignmentPageResource>(`${this.baseUrl}/assignments`, {
          params: this.params(criteria),
        })
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );

    return {
      items: page.items.map((item) => this.toAssignment(item)),
      page: page.page,
      totalPages: page.totalPages,
      total: page.total,
    };
  }

  async createAssignment(assignment: NewAssignment): Promise<Assignment> {
    const request: CreateAssignmentRequest = {
      employeeId: assignment.employeeId.value,
      workUnitId: assignment.workUnitId.value,
      positionId: assignment.positionId.value,
      startDate: assignment.startDate.value,
    };

    const created = await firstValueFrom(
      this.http
        .post<AssignmentResource>(`${this.baseUrl}/assignments`, request)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );

    return this.toAssignment(created);
  }

  async updateAssignment(changes: AssignmentChanges): Promise<Assignment> {
    const request: UpdateAssignmentRequest = {
      ...(changes.workUnitId ? { workUnitId: changes.workUnitId.value } : {}),
      ...(changes.positionId ? { positionId: changes.positionId.value } : {}),
      ...(changes.startDate ? { startDate: changes.startDate.value } : {}),
    };

    const updated = await firstValueFrom(
      this.http
        .patch<AssignmentResource>(`${this.baseUrl}/assignments/${changes.id.value}`, request)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );

    return this.toAssignment(updated);
  }

  async ceaseAssignment(id: AssignmentId, date: AssignmentDate): Promise<Assignment> {
    const request: CeaseAssignmentRequest = { date: date.value };

    const ceased = await firstValueFrom(
      this.http
        .post<AssignmentResource>(`${this.baseUrl}/assignments/${id.value}/cease`, request)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );

    return this.toAssignment(ceased);
  }

  async deleteAssignment(id: AssignmentId): Promise<void> {
    await firstValueFrom(
      this.http
        .delete<void>(`${this.baseUrl}/assignments/${id.value}`)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );
  }

  private params(criteria: AssignmentCriteria): HttpParams {
    let params = new HttpParams().set('employeeId', criteria.employeeId);
    if (criteria.status) {
      params = params.set('status', criteria.status);
    }
    if (criteria.limit) {
      params = params.set('limit', String(criteria.limit));
    }
    if (criteria.page) {
      params = params.set('page', String(criteria.page));
    }
    return params;
  }

  private toFailure(error: HttpErrorResponse) {
    return throwError(() => toAssignmentApiError(error.status, error.error));
  }

  private toAssignment(resource: AssignmentResource): Assignment {
    return Assignment.restore(
      AssignmentId.restore(resource.uuid),
      EmployeeId.restore(resource.employeeId),
      WorkUnitId.restore(resource.workUnitId),
      PositionId.restore(resource.positionId),
      AssignmentDate.restore(resource.startDate),
      resource.endDate ? AssignmentDate.restore(resource.endDate) : null,
      this.status(resource.status),
    );
  }

  private status(raw: AssignmentStatusResource): AssignmentStatus {
    return raw === 'VIGENTE' ? 'VIGENTE' : 'RETIRADO';
  }
}

export { AssignmentGateway as AssignmentHttpGateway };
