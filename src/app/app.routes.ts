import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'personal' },
  {
    path: 'personal',
    title: 'Personal',
    loadComponent: () =>
      import('./personal/interfaces/pages/personal-page/personal-page').then(
        (module) => module.PersonalPage,
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
  { path: '**', redirectTo: 'personal' },
];
