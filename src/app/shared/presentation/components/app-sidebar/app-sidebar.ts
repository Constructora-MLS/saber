import { Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { IsActiveMatchOptions, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AppSwitcher, AppSwitcherOption } from '../app-switcher/app-switcher';
import { APPLICATION_CATALOG } from '../app-switcher/application-catalog';
import { MlsIcon } from '../icons/mls-icon/mls-icon';

/**
 * NavigationItem is a section of the navigation of a context.
 *
 * The path is null when the section is not available yet.
 */
export interface NavigationItem {
  readonly label: string;
  readonly icon: string;
  readonly path: string | null;
}

/**
 * AppSidebar is the lateral navigation of the platform.
 *
 * The same component serves every context: the context gives the name of its
 * module, its sections and the application that owns it, and the sidebar
 * draws the same header, the same switcher and the same user profile in
 * every one of them.
 */
@Component({
  imports: [AppSwitcher, MlsIcon, MatIconModule, RouterLink, RouterLinkActive],
  selector: 'app-sidebar',
  styleUrl: './app-sidebar.scss',
  templateUrl: './app-sidebar.html',
  host: {
    '[class.is-collapsed]': 'isCollapsed()',
    '[class.is-drawer-open]': 'isDrawerOpen()',
    '(document:keydown.escape)': 'onEscape($event)',
  },
})
export class AppSidebar {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  /** The name of the module that owns the sidebar. */
  readonly moduleLabel = input.required<string>();
  /** The sections of the module. */
  readonly navigation = input.required<readonly NavigationItem[]>();
  /** The id of the application that owns the module. */
  readonly currentApplicationId = input.required<string>();
  readonly userInitials = input('UA');
  readonly userName = input('Usuario actual');
  readonly userRole = input('Cuenta de RR. HH.');
  readonly collapsedChange = output<boolean>();

  protected readonly isCollapsed = signal(false);
  protected readonly isAppSwitcherOpen = signal(false);
  protected readonly isCompact = signal(false);
  protected readonly isDrawerOpen = signal(false);

  /**
   * The applications of the platform, with the one of the current module
   * marked as the current application.
   *
   * The application is recognized by its id and not by its path, because the
   * sections of an application can live in more than one route.
   */
  protected readonly applications = computed<readonly AppSwitcherOption[]>(() =>
    APPLICATION_CATALOG.map(({ id, ...application }) => ({
      ...application,
      isCurrent: id === this.currentApplicationId(),
    })),
  );

  /**
   * activeLinkOptions decides when a navigation item is the current one.
   *
   * The item is decided by the path alone, so the menu keeps the item of the
   * page selected no matter what the pages write in the address of the
   * browser. The paths are matched as a subset, so a section keeps its item
   * selected while a page of the section is open: the record of a worker
   * lives inside Personal, so Personal stays selected on it.
   */
  protected readonly activeLinkOptions: IsActiveMatchOptions = {
    paths: 'subset',
    queryParams: 'ignored',
    fragment: 'ignored',
    matrixParams: 'ignored',
  };

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    const compactQuery = window.matchMedia('(max-width: 60rem)');
    this.isCompact.set(compactQuery.matches);
    const onChange = (event: MediaQueryListEvent) => {
      this.isCompact.set(event.matches);
      if (!event.matches) {
        this.closeDrawer();
      }
    };
    compactQuery.addEventListener('change', onChange);
    this.destroyRef.onDestroy(() => compactQuery.removeEventListener('change', onChange));
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

  /**
   * Opens the application that the user chose in the switcher.
   *
   * The application that is already open is not navigated, so the page that
   * the user is reading is kept, and the applications that are still coming
   * do nothing.
   */
  protected onApplicationSelected(application: AppSwitcherOption): void {
    if (application.status === 'soon') {
      return;
    }

    this.closeAppSwitcher();

    if (!application.isCurrent && application.path) {
      void this.router.navigateByUrl(application.path);
    }
  }

  protected onEscape(event: Event): void {
    if (event instanceof KeyboardEvent && event.key === 'Escape') {
      this.closeAppSwitcher();
      this.closeDrawer();
    }
  }
}
