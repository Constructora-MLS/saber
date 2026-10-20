import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/studio/pages/home-page/home-page').then((module) => module.HomePage),
  },
  { path: '**', redirectTo: '' },
];
