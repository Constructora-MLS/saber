import { DOCUMENT } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  imports: [
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  selector: 'app-home-page',
  styleUrl: './home-page.scss',
  templateUrl: './home-page.html',
})
export class HomePage {
  private readonly document = inject(DOCUMENT);

  protected readonly activeSection = signal('inicio');
  protected readonly isDarkMode = signal(false);
  protected readonly navigation = [
    { id: 'inicio', label: 'Inicio', icon: 'space_dashboard' },
    { id: 'componentes', label: 'Componentes', icon: 'widgets' },
    { id: 'tokens', label: 'Tokens', icon: 'palette' },
  ];
  protected readonly paletteTokens = [
    { name: 'Primario', value: '--mat-sys-primary', className: 'primary' },
    { name: 'Terciario', value: '--mat-sys-tertiary', className: 'tertiary' },
    { name: 'Superficie', value: '--mat-sys-surface-container', className: 'surface' },
    { name: 'Contenedor', value: '--mat-sys-secondary-container', className: 'container' },
    { name: 'Error', value: '--mat-sys-error', className: 'error' },
  ];
  protected readonly principles = [
    { icon: 'palette', label: 'Color con intención', text: 'El contraste guía la atención.' },
    { icon: 'interests', label: 'Formas con carácter', text: 'Las siluetas también comunican.' },
    { icon: 'motion_photos_on', label: 'Movimiento útil', text: 'Cada transición da contexto.' },
  ];

  constructor() {
    const theme = this.readThemePreference();
    this.isDarkMode.set(theme === 'dark');
    this.document.documentElement.dataset['theme'] = theme;
  }

  protected markActiveSection(section: string): void {
    this.activeSection.set(section);
  }

  protected toggleTheme(): void {
    const theme = this.isDarkMode() ? 'light' : 'dark';
    this.isDarkMode.set(theme === 'dark');
    this.document.documentElement.dataset['theme'] = theme;

    try {
      this.document.defaultView?.localStorage.setItem('saber-theme', theme);
    } catch {
      // The theme remains usable if browser storage is unavailable.
    }
  }

  private readThemePreference(): 'light' | 'dark' {
    try {
      const storedTheme = this.document.defaultView?.localStorage.getItem('saber-theme');
      if (storedTheme === 'light' || storedTheme === 'dark') {
        return storedTheme;
      }
    } catch {
      // Fall back to the operating-system preference when storage is unavailable.
    }

    return this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
}
