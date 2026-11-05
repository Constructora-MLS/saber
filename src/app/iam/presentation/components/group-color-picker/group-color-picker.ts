import { Component, computed, input, output } from '@angular/core';

/**
 * The tones that a group takes by default.
 *
 * The palette is the identity of the platform: the worker recognizes the
 * groups by their color, so the offered tones are the ones of the brand.
 */
export const GROUP_COLOR_PRESETS: readonly string[] = [
  '#007F64',
  '#0057B8',
  '#F26B3A',
  '#7C4DFF',
  '#C2185B',
  '#00838F',
  '#5D4037',
  '#455A64',
];

/** The counter that gives every picker the identifier of its own label. */
let nextPickerId = 0;

/**
 * GroupColorPicker chooses the color that identifies a group.
 *
 * The component is presentational: it shows the tone that the group
 * carries and it announces the tone that the worker chooses. The palette
 * offers the tones of the brand and the gray tone that opens the picker of
 * the browser is the escape for the worker that needs another tone.
 */
@Component({
  selector: 'app-group-color-picker',
  styleUrl: './group-color-picker.scss',
  templateUrl: './group-color-picker.html',
})
export class GroupColorPicker {
  /** The tone that the group carries right now. */
  readonly color = input.required<string>();
  /** The name that the worker reads above the palette. */
  readonly label = input('Color del grupo');
  /** The tone that the worker chose. */
  readonly colorChange = output<string>();

  /** The tones that the worker chooses from. */
  protected readonly presets = GROUP_COLOR_PRESETS;
  /** The identifier that associates the label with the palette. */
  protected readonly labelId = `group-color-picker-${++nextPickerId}`;
  /** Whether the tone of the group is one that the palette offers. */
  protected readonly customTone = computed(() => !this.presets.includes(this.color()));

  /** select announces one of the tones of the palette. */
  protected select(color: string): void {
    this.colorChange.emit(color);
  }

  /** onPicked announces the tone that the native picker shows. */
  protected onPicked(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.colorChange.emit(value.toUpperCase());
  }
}
