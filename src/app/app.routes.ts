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
    path: 'certified',
    title: 'Certificados',
    loadComponent: () =>
      import('./certified/interfaces/pages/certified-page/certified-page').then(
        (module) => module.CertifiedPage,
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
