import { Component, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { IsActiveMatchOptions, RouterLink, RouterLinkActive } from '@angular/router';
import { AppSwitcher, AppSwitcherOption } from '../app-switcher/app-switcher';
import { MlsIcon } from '../icons/mls-icon/mls-icon';

interface RrhhNavigationItem {
  readonly label: string;
  readonly icon: string;
  readonly path: string | null;
}

@Component({
  imports: [AppSwitcher, MlsIcon, MatIconModule, RouterLink, RouterLinkActive],
  selector: 'app-rrhh-sidebar',
  styleUrl: './rrhh-sidebar.scss',
  templateUrl: './rrhh-sidebar.html',
  host: {
    '[class.is-collapsed]': 'isCollapsed()',
    '[class.is-drawer-open]': 'isDrawerOpen()',
    '(document:keydown.escape)': 'onEscape($event)',
  },
})
export class RrhhSidebar {
  readonly moduleLabel = input('Recursos Humanos');
  readonly userInitials = input('UA');
  readonly userName = input('Usuario actual');
  readonly userRole = input('Cuenta de RR. HH.');
  readonly collapsedChange = output<boolean>();

  protected readonly isCollapsed = signal(false);
  protected readonly isAppSwitcherOpen = signal(false);
  protected readonly isCompact = signal(false);
  protected readonly isDrawerOpen = signal(false);

  /**
   * activeLinkOptions decides when a navigation item is the current one.
   *
   * The item is decided by the path alone, so the menu keeps the page
   * selected no matter what the pages write in the address of the browser.
   */
  protected readonly activeLinkOptions: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'ignored',
    fragment: 'ignored',
    matrixParams: 'ignored',
  };

  protected readonly applications: readonly AppSwitcherOption[] = [
    { label: 'Recursos Humanos', icon: 'groups', status: 'active', dividerAfter: true },
    { label: 'Administración', icon: 'admin_panel_settings', status: 'soon' },
    { label: 'Logística', icon: 'local_shipping', status: 'soon' },
    { label: 'Inventario', icon: 'inventory_2', status: 'soon' },
  ];

  protected readonly navigation: readonly RrhhNavigationItem[] = [
    { label: 'Personal', icon: 'badge', path: '/employees' },
    { label: 'Certificados', icon: 'description', path: '/certified' },
    { label: 'Catálogo', icon: 'list_alt', path: '/catalog' },
  ];

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    const compactQuery = window.matchMedia('(max-width: 60rem)');
    this.isCompact.set(compactQuery.matches);
    compactQuery.addEventListener('change', (event) => {
      this.isCompact.set(event.matches);
      if (!event.matches) {
        this.closeDrawer();
      }
    });
  }

  protected menuLabel(): string {
    if (this.isCompact()) {
      return this.isDrawerOpen() ? 'Cerrar menú' : 'Abrir menú';
    }

    return this.isCollapsed() ? 'Expandir menú lateral' : 'Minimizar menú lateral';
  }

  protected toggleMenu(): void {
    if (this.isCompact()) {
      this.isDrawerOpen.update((isOpen) => !isOpen);
      return;
    }

    this.toggleCollapsed();
  }

  protected toggleCollapsed(): void {
    this.isCollapsed.update((isCollapsed) => !isCollapsed);
    this.collapsedChange.emit(this.isCollapsed());
  }

  protected closeDrawer(): void {
    this.isDrawerOpen.set(false);
  }

  protected toggleAppSwitcher(): void {
    this.isAppSwitcherOpen.update((isOpen) => !isOpen);
  }

  protected closeAppSwitcher(): void {
    this.isAppSwitcherOpen.set(false);
  }

  protected onApplicationSelected(application: AppSwitcherOption): void {
    if (application.status === 'active') {
      this.closeAppSwitcher();
    }
  }

  protected onEscape(event: Event): void {
    if (event instanceof KeyboardEvent && event.key === 'Escape') {
      this.closeAppSwitcher();
      this.closeDrawer();
    }
  }
}
