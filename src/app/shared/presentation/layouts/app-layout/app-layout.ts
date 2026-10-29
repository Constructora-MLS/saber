import { Component, input, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppSidebar, NavigationItem } from '../../components/app-sidebar/app-sidebar';

/**
 * AppLayout is the shell of the application.
 *
 * Every context renders the same shell: the lateral navigation and the area
 * of the routed page. The context only gives the name of its module, its
 * sections and the application that owns it.
 */
@Component({
  imports: [RouterOutlet, AppSidebar],
  selector: 'app-layout',
  styleUrl: './app-layout.scss',
  templateUrl: './app-layout.html',
})
export class AppLayout {
  readonly moduleLabel = input.required<string>();
  readonly navigation = input.required<readonly NavigationItem[]>();
  readonly currentApplicationId = input.required<string>();

  protected readonly isSidebarCollapsed = signal(false);

  protected onSidebarCollapsedChange(collapsed: boolean): void {
    this.isSidebarCollapsed.set(collapsed);
  }
}
