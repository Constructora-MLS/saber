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
    // The public address of a certificate: the QR of the document carries
    // it, so a person that scans the code reads the trace of the
    // certificate.
    path: 'verificar/:code',
    title: 'Verificación de certificado',
    loadComponent: () =>
      import(
        './certificates/interfaces/pages/certificate-verification-page/certificate-verification-page'
      ).then((module) => module.CertificateVerificationPage),
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
