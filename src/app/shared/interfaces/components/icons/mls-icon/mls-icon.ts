import { Component, input } from '@angular/core';

@Component({
  selector: 'app-mls-icon',
  templateUrl: './mls-icon.html',
  styleUrl: './mls-icon.scss',
})
export class MlsIcon {
  readonly size = input<string | number>('2rem');
  readonly label = input<string | null>(null);
}
