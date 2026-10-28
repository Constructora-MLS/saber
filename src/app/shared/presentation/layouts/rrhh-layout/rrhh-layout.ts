import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RrhhSidebar } from '../../components/rrhh-sidebar/rrhh-sidebar';

/** Private HR navigation shell. Public verification routes do not use it. */
@Component({
  imports: [RouterOutlet, RrhhSidebar],
  selector: 'app-rrhh-layout',
  styleUrl: './rrhh-layout.scss',
  templateUrl: './rrhh-layout.html',
})
export class RrhhLayout {
  protected readonly isSidebarCollapsed = signal(false);

  protected onSidebarCollapsedChange(collapsed: boolean): void {
    this.isSidebarCollapsed.set(collapsed);
  }
}
