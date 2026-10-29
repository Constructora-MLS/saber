import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * AppSwitcherOption is an application as the switcher shows it.
 *
 * The status tells whether the application is already available or it is
 * still coming, and isCurrent tells whether the application owns the
 * section that is open right now.
 */
export interface AppSwitcherOption {
  readonly label: string;
  readonly icon: string;
  readonly path: string | null;
  readonly status: 'active' | 'soon';
  readonly isCurrent: boolean;
  readonly dividerAfter?: boolean;
}

@Component({
  imports: [MatIconModule],
  selector: 'app-switcher',
  styleUrl: './app-switcher.scss',
  templateUrl: './app-switcher.html',
  host: {
    role: 'menu',
    'aria-label': 'Aplicaciones',
  },
})
export class AppSwitcher {
  readonly applications = input.required<readonly AppSwitcherOption[]>();
  readonly applicationSelected = output<AppSwitcherOption>();
}
