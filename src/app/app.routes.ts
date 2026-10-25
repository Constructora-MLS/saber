import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'employees' },
  {
    path: 'employees',
    title: 'Personal',
    loadComponent: () =>
      import('./employees/interfaces/pages/employees-page/employees-page').then(
        (module) => module.EmployeesPage,
      ),
  },
  {
    // The record of a worker lives inside Personal, so its address hangs
    // from the section that owns it. The page itself belongs to the
    // Assignments context: the address is a decision of the navigation and
    // the bounded contexts never depend on it.
    path: 'employees/:employeeId/assignments',
    title: 'Asignaciones',
    loadComponent: () =>
      import('./employees/interfaces/pages/employee-assignments-page/employee-assignments-page').then(
        (module) => module.EmployeeAssignmentsPage,
      ),
  },
  {
    path: 'certificates',
    title: 'Certificados',
    loadComponent: () =>
      import('./certificates/interfaces/pages/certificates-page/certificates-page').then(
        (module) => module.CertificatesPage,
      ),
  },
  {
    // The certificate is reviewed and issued from the assignment that
    // receives it, so its address carries the assignment.
    path: 'certificates/assignment/:assignmentId',
    title: 'Revisar certificado',
    loadComponent: () =>
      import('./certificates/interfaces/pages/certificate-review-page/certificate-review-page').then(
        (module) => module.CertificateReviewPage,
      ),
  },
  {
    path: 'catalog',
    title: 'Catálogos',
    loadComponent: () =>
      import('./catalog/interfaces/pages/catalog-page/catalog-page').then(
        (module) => module.CatalogPage,
      ),
  },
  { path: '**', redirectTo: 'employees' },
];
