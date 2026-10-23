// Package http holds the adapter that talks to the API of the Assignments
// bounded context.
//
// The gateway is the anti-corruption layer: it translates the published
// contract into the language of the domain.
// package http

import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { API_BASE_URL } from '../../../api.config';
import {
  AssignmentPageResource,
  AssignmentResource,
  AssignmentStatusResource,
  CeaseAssignmentRequest,
  CreateAssignmentRequest,
} from './assignment-api.contract';
import { toAssignmentApiError } from './assignment-api.error';
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
  AssignmentRepository,
  NewAssignment,
} from '../../domain/repositories/assignment-repositories';

/**
 * AssignmentHttpGateway is the adapter of the registry of the assignments.
 */
@Injectable()
export class AssignmentHttpGateway implements AssignmentRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /**
   * listAssignments returns the page of the assignments of a worker that
   * matches the criteria.
   */
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
      nextCursor: page.nextCursor,
    };
  }

  /**
   * createAssignment registers an assignment of a worker.
   */
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

  /**
   * ceaseAssignment closes the labour period of an assignment.
   */
  async ceaseAssignment(id: AssignmentId, date: AssignmentDate): Promise<Assignment> {
    const request: CeaseAssignmentRequest = { date: date.value };

    const ceased = await firstValueFrom(
      this.http
        .post<AssignmentResource>(`${this.baseUrl}/assignments/${id.value}/cease`, request)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );

    return this.toAssignment(ceased);
  }

  /**
   * deleteAssignment logically deletes an assignment. The answer of a
   * deletion carries no body.
   */
  async deleteAssignment(id: AssignmentId): Promise<void> {
    await firstValueFrom(
      this.http
        .delete<void>(`${this.baseUrl}/assignments/${id.value}`)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );
  }

  /**
   * params builds the query string of a listing.
   */
  private params(criteria: AssignmentCriteria): HttpParams {
    let params = new HttpParams().set('employeeId', criteria.employeeId);
    if (criteria.status) {
      params = params.set('status', criteria.status);
    }
    if (criteria.limit) {
      params = params.set('limit', String(criteria.limit));
    }
    if (criteria.cursor) {
      params = params.set('cursor', criteria.cursor);
    }
    return params;
  }

  /**
   * toFailure translates a failed response into the error of the context.
   */
  private toFailure(error: HttpErrorResponse) {
    return throwError(() => toAssignmentApiError(error.status, error.error));
  }

  /**
   * toAssignment rebuilds the assignment from its published representation.
   */
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

  /**
   * status reads the state published for an assignment.
   *
   * A state that the context does not know is reported as retired, so an
   * unknown state never shows an assignment as open.
   */
  private status(raw: AssignmentStatusResource): AssignmentStatus {
    return raw === 'VIGENTE' ? 'VIGENTE' : 'RETIRADO';
  }
}
