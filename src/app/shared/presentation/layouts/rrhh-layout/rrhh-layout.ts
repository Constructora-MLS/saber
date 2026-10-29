import { Component } from '@angular/core';
import { NavigationItem } from '../../components/app-sidebar/app-sidebar';
import { AppLayout } from '../app-layout/app-layout';

/**
 * RrhhLayout is the shell of the Human Resources context.
 *
 * The context only declares its module and its sections: the shell, the
 * sidebar and the switcher of applications are the shared ones.
 */
@Component({
  imports: [AppLayout],
  selector: 'app-rrhh-layout',
  template: `
    <app-layout
      moduleLabel="Recursos Humanos"
      currentApplicationId="human-resources"
      [navigation]="navigation"
    />
  `,
})
export class RrhhLayout {
  protected readonly navigation: readonly NavigationItem[] = [
    { label: 'Personal', icon: 'badge', path: '/employees' },
    { label: 'Certificados', icon: 'description', path: '/certificates' },
    { label: 'Catálogo', icon: 'list_alt', path: '/catalog' },
  ];
}
