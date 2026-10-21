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
    path: 'catalog',
    title: 'Catálogos',
    loadComponent: () =>
      import('./catalog/interfaces/pages/catalog-page/catalog-page').then(
        (module) => module.CatalogPage,
      ),
  },
  { path: '**', redirectTo: 'personal' },
];
