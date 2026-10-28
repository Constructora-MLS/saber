import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export interface AppSwitcherOption {
  readonly label: string;
  readonly icon: string;
  readonly status: 'active' | 'soon';
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
