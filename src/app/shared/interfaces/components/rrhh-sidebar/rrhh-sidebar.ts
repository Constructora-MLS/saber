import { Component, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';
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

  protected readonly applications: readonly AppSwitcherOption[] = [
    { label: 'Recursos Humanos', icon: 'groups', status: 'active', dividerAfter: true },
    { label: 'Administración', icon: 'admin_panel_settings', status: 'soon' },
    { label: 'Logística', icon: 'local_shipping', status: 'soon' },
    { label: 'Inventario', icon: 'inventory_2', status: 'soon' },
  ];

  protected readonly navigation: readonly RrhhNavigationItem[] = [
    { label: 'Personal', icon: 'badge', path: '/personal' },
    { label: 'Certificados', icon: 'description', path: null },
    { label: 'Catálogos', icon: 'list_alt', path: '/catalog' },
  ];

  protected toggleCollapsed(): void {
    this.isCollapsed.update((isCollapsed) => !isCollapsed);
    this.collapsedChange.emit(this.isCollapsed());
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
    }
  }
}
