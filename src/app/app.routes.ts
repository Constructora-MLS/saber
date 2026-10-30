import { CanMatchFn, Routes } from '@angular/router';
import { authGuard } from './iam/presentation/guards/auth.guard';

const isAdministrationRoute: CanMatchFn = (_route, segments) =>
  ['users', 'groups'].includes(segments[0]?.path ?? '');

export const routes: Routes = [
  {
    // The sign in is the only way into the platform, so it answers without a
    // session.
    path: 'sign-in',
    title: 'Iniciar sesión',
    loadComponent: () =>
      import('./iam/presentation/pages/sign-in-page/sign-in.page').then(
        (module) => module.SignInPage,
      ),
  },
  {
    // A QR opens this route directly, outside the HR navigation shell.
    // The verification of a certificate is public: any person can read a
    // certificate without signing in.
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
    // Users and Groups share one route configuration and layout instance, so
    // the administration sidebar keeps its state when switching sections.
    path: '',
    canMatch: [isAdministrationRoute],
    canActivate: [authGuard],
    loadComponent: () =>
      import('./iam/presentation/layouts/iam-layout/iam-layout').then((module) => module.IamLayout),
    children: [
      {
        path: 'users',
        pathMatch: 'full',
        title: 'Usuarios',
        loadComponent: () =>
          import('./iam/presentation/pages/users-page/users.page').then(
            (module) => module.UsersPage,
          ),
      },
      {
        path: 'groups',
        pathMatch: 'full',
        title: 'Grupos',
        loadComponent: () =>
          import('./iam/presentation/pages/groups-page/groups.page').then(
            (module) => module.GroupsPage,
          ),
      },
      { path: '**', redirectTo: '/users' },
    ],
  },
  {
    path: '',
    canActivate: [authGuard],
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
