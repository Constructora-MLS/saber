import { Component } from '@angular/core';
import { NavigationItem } from '../../components/app-sidebar/app-sidebar';
import { APPLICATION_CATALOG } from '../../components/app-switcher/application-catalog';
import { AppLayout } from '../app-layout/app-layout';

/**
 * RrhhLayout is the shell of the Human Resources context.
 *
 * The context only declares its module and its sections: the shell, the
 * sidebar and the switcher of applications are the shared ones. The
 * sections come from the catalog of the applications, so the navigation and
 * the routes of the platform cannot drift apart.
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
  protected readonly navigation: readonly NavigationItem[] =
    APPLICATION_CATALOG.find((application) => application.id === 'human-resources')?.sections ?? [];
}
