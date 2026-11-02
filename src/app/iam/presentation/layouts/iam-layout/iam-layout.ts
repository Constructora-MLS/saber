import { Component } from '@angular/core';
import { NavigationItem } from '../../../../shared/presentation/components/app-sidebar/app-sidebar';
import { AppLayout } from '../../../../shared/presentation/layouts/app-layout/app-layout';

/**
 * IamLayout is the shell of the Administration context.
 *
 * The context only declares its module and its sections: the shell, the
 * sidebar and the switcher of applications are the shared ones.
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
  protected readonly navigation: readonly NavigationItem[] = [
    { label: 'Usuarios', icon: 'person', path: '/users' },
    { label: 'Grupos', icon: 'groups', path: '/groups' },
  ];
}
