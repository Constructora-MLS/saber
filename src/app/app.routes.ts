import { CanMatchFn, Routes } from '@angular/router';
import { authGuard } from './iam/presentation/guards/auth.guard';

const isAdministrationRoute: CanMatchFn = (_route, segments) =>
  ['users', 'groups', 'permissions'].includes(segments[0]?.path ?? '');

/**
 * isPublicRoute reports whether a URL of the application belongs to a route
 * that answers without a session.
 *
 * The public flows of the platform — the sign in, the acceptance of an
 * invitation and the verification of a certificate — answer without a
 * credential, so a death of the credential must not interrupt them.
 */
export function isPublicRoute(url: string): boolean {
  return PUBLIC_ROUTE_PATHS.some((path) => matchesPath(url, path));
}

/**
 * matchesPath reports whether a URL of the browser belongs to a path of a
 * route.
 *
 * The parameters of the path — the code of a certificate — match any
 * segment, and the comparison ignores the query string of the URL.
 */
function matchesPath(url: string, path: string): boolean {
  const segments = url
    .split('?')[0]
    .split('/')
    .filter((segment) => segment.length > 0);
  const pattern = path.split('/').filter((segment) => segment.length > 0);

  if (pattern.length > segments.length) {
    return false;
  }

  return pattern.every((segment, index) => segment.startsWith(':') || segment === segments[index]);
}

export const routes: Routes = [
  {
    // The sign in is the only way into the platform, so it answers without a
    // session.
    path: 'sign-in',
    title: 'Iniciar sesión',
    data: { public: true },
    loadComponent: () =>
      import('./iam/presentation/pages/sign-in-page/sign-in.page').then(
        (module) => module.SignInPage,
      ),
  },
  {
    // The acceptance of an invitation is public: the invited member arrives
    // from the email and it has no session yet.
    path: 'accept-invitation',
    title: 'Aceptar invitación',
    data: { public: true },
    loadComponent: () =>
      import('./iam/presentation/pages/accept-invitation-page/accept-invitation.page').then(
        (module) => module.AcceptInvitationPage,
      ),
  },
  {
    // The recovery of the password is public: the member that forgot it
    // may have no session, and the link of the email arrives in a browser
    // that never signed in.
    path: 'forgot-password',
    title: 'Recuperar contraseña',
    data: { public: true },
    loadComponent: () =>
      import('./iam/presentation/pages/forgot-password-page/forgot-password.page').then(
        (module) => module.ForgotPasswordPage,
      ),
  },
  {
    // The path of this route is the one that the link of the email points
    // to: {FRONTEND_PUBLIC_URL}/reset-password?token=… . The link is built
    // by the backend (akame/internal/iam/application/commandservices/
    // token_link.go), so the path and the name of the query parameter must
    // not be "corrected" here: the browser reads the token from the
    // parameter "token" and removes it from the address bar right away.
    path: 'reset-password',
    title: 'Restablecer contraseña',
    data: { public: true },
    loadComponent: () =>
      import('./iam/presentation/pages/reset-password-page/reset-password.page').then(
        (module) => module.ResetPasswordPage,
      ),
  },
  {
    // The configuration of the account of the user.
    path: 'settings',
    title: 'Configuración',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./iam/presentation/pages/settings-page/settings.page').then(
        (module) => module.SettingsPage,
      ),
  },
  {
    // A QR opens this route directly, outside the HR navigation shell.
    // The verification of a certificate is public: any person can read a
    // certificate without signing in.
    path: 'verify/:code',
    title: 'Certificado de trabajo',
    data: { public: true },
    loadComponent: () =>
      import('./certificates/presentation/pages/credential-page/credential.page').then(
        (module) => module.CredentialPage,
      ),
  },
  // Keep QR links in previously issued PDFs working.
  {
    path: 'verificar/:code',
    pathMatch: 'full',
    redirectTo: 'verify/:code',
    data: { public: true },
  },
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
      {
        // The permissions of a role are configured in their own page: the
        // administrator grants the capabilities of the platform to a role
        // without leaving the hierarchy of the roles.
        path: 'permissions/:groupId',
        title: 'Permisos',
        loadComponent: () =>
          import('./iam/presentation/pages/permissions-page/permissions.page').then(
            (module) => module.PermissionsPage,
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

/**
 * PUBLIC_ROUTE_PATHS are the paths of the routes that answer without a
 * session.
 *
 * The list is read from the routes themselves: a route declares that it is
 * public and the presentation that navigates on a death of the credential
 * reads the same source, so the public flows of the platform are declared
 * once and never drift apart.
 */
export const PUBLIC_ROUTE_PATHS: readonly string[] = routes
  .filter((route) => route.data?.['public'] === true)
  .map((route) => route.path)
  .filter((path): path is string => path !== undefined);
