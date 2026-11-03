import { Component } from '@angular/core';
import { NavigationItem } from '../../../../shared/presentation/components/app-sidebar/app-sidebar';
import { APPLICATION_CATALOG } from '../../../../shared/presentation/components/app-switcher/application-catalog';
import { AppLayout } from '../../../../shared/presentation/layouts/app-layout/app-layout';

/**
 * IamLayout is the shell of the Administration context.
 *
 * The context only declares its module and its sections: the shell, the
 * sidebar and the switcher of applications are the shared ones. The
 * sections come from the catalog of the applications, so the navigation and
 * the routes of the platform cannot drift apart.
 */
@Component({
  imports: [AppLayout],
  selector: 'app-iam-layout',
  template: `
    <app-layout
      moduleLabel="Administración"
      currentApplicationId="administration"
      [navigation]="navigation"
    />
  `,
})
export class IamLayout {
  protected readonly navigation: readonly NavigationItem[] =
    APPLICATION_CATALOG.find((application) => application.id === 'administration')?.sections ?? [];
}
