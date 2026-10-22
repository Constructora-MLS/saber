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
