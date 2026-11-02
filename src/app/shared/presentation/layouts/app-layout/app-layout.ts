import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthSessionStore } from '../../../../iam/application/session/auth-session.store';
import { AppSidebar, NavigationItem } from '../../components/app-sidebar/app-sidebar';

/**
 * AppLayout is the shell of the application.
 *
 * Every context renders the same shell: the lateral navigation and the area
 * of the routed page. The context only gives the name of its module, its
 * sections and the application that owns it.
 *
 * The shell reads the published session of the IAM context to name the user
 * in the profile of the sidebar.
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

  private readonly session = inject(AuthSessionStore);

  protected readonly isSidebarCollapsed = signal(false);

  /** The name of the authenticated user, shown in the profile of the sidebar. */
  protected readonly userName = computed(() => {
    const identity = this.session.identity();
    if (!identity) {
      return '';
    }

    const firstName = identity.firstName.trim();
    return firstName || identity.email;
  });

  protected onSidebarCollapsedChange(collapsed: boolean): void {
    this.isSidebarCollapsed.set(collapsed);
  }
}
