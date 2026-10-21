import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RrhhSidebar } from './shared/interfaces/components/rrhh-sidebar/rrhh-sidebar';

@Component({
  imports: [RouterOutlet, RrhhSidebar],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly isSidebarCollapsed = signal(false);

  protected onSidebarCollapsedChange(collapsed: boolean): void {
    this.isSidebarCollapsed.set(collapsed);
  }
}
