import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    // A QR opens this route directly, outside the HR navigation shell.
    path: 'verify/:code',
    title: 'Certificado de trabajo',
    loadComponent: () =>
      import('./certificates/presentation/pages/credential-page/credential.page').then(
        (module) => module.CredentialPage,
      ),
  },
  // Keep QR links in previously issued PDFs working.
  { path: 'verificar/:code', pathMatch: 'full', redirectTo: 'verify/:code' },
  {
    path: '',
    loadComponent: () =>
      import('./shared/presentation/layouts/rrhh-layout/rrhh-layout').then(
        (module) => module.RrhhLayout,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'employees' },
      {
        path: 'employees',
        title: 'Personal',
        loadComponent: () =>
          import('./employees/presentation/pages/employees-page/employees.page').then(
            (module) => module.EmployeesPage,
          ),
      },
      {
        path: 'employees/:employeeId/assignments',
        title: 'Asignaciones',
        loadComponent: () =>
          import('./employees/presentation/pages/employee-assignments-page/employee-assignments.page').then(
            (module) => module.EmployeeAssignmentsPage,
          ),
      },
      {
        path: 'certificates',
        title: 'Certificados',
        loadComponent: () =>
          import('./certificates/presentation/pages/certificates-page/certificates.page').then(
            (module) => module.CertificatesPage,
          ),
      },
      {
        path: 'catalog',
        title: 'Catálogos',
        loadComponent: () =>
          import('./catalog/presentation/pages/catalog-page/catalog.page').then(
            (module) => module.CatalogPage,
          ),
      },
      { path: '**', redirectTo: 'employees' },
    ],
  },
];
