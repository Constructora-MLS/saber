// Package certificatetemplateeditor edits the certificate of a service.
//
// The editor is presentational: it renders the template of the service and
// the vocabulary that the platform accepts, and it announces the intention
// of the worker through its outputs. It never talks to the API.
// package certificatetemplateeditor

import { Component, computed, ElementRef, input, output, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { CertificateServiceReference } from '../../../domain/services/certificate-service-resolver';
import { TEMPLATE_MAX_LENGTH } from '../../../domain/model/value-objects/template';
import { FieldCounter } from '../../../../shared/interfaces/components/field-counter/field-counter';

/**
 * CertificateTemplateEditor edits the text of the certificate of a service.
 */
@Component({
  imports: [
    FieldCounter,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
  ],
  selector: 'app-certificate-template-editor',
  styleUrl: './certificate-template-editor.scss',
  templateUrl: './certificate-template-editor.html',
})
export class CertificateTemplateEditor {
  /** The services of the catalog, as the editor offers them. */
  readonly services = input.required<readonly CertificateServiceReference[]>();
  /** The service whose template is edited. */
  readonly serviceId = input('');
  /** The text of the template. */
  readonly body = input('');
  /** The vocabulary that the platform accepts in the template. */
  readonly tokens = input<readonly string[]>([]);
  /** Whether the editor is waiting for the template. */
  readonly loading = input(false);
  /** Whether the platform is saving the template. */
  readonly saving = input(false);
  /** The failure that prevented the consultation or the saving. */
  readonly failure = input<string | null>(null);

  /** Another service was chosen. */
  readonly serviceSelected = output<string>();
  /** The text of the template changed. */
  readonly bodyChanged = output<string>();
  /** The template was saved. */
  readonly saveRequested = output<void>();
  /** The restoration of the template was requested. */
  readonly restoreRequested = output<void>();

  private readonly editor = viewChild<ElementRef<HTMLTextAreaElement>>('editor');

  /** The limit of the text of the certificate. */
  protected readonly bodyMaxLength = TEMPLATE_MAX_LENGTH;

  /**
   * The number of characters of the text of the certificate.
   *
   * The platform counts the characters by code point, so the counter counts
   * them the same way.
   */
  protected readonly bodyLength = computed(() => [...this.body()].length);

  /**
   * Whether the text of the certificate is longer than the limit.
   */
  protected readonly bodyTooLong = computed(() => this.bodyLength() > this.bodyMaxLength);

  /**
   * selectService asks for another service.
   */
  protected selectService(serviceId: string): void {
    this.serviceSelected.emit(serviceId);
  }

  /**
   * onBodyChanged announces the new text of the template.
   */
  protected onBodyChanged(body: string): void {
    this.bodyChanged.emit(body);
  }

  /**
   * insertToken writes a placeholder of the vocabulary in the template.
   *
   * The placeholder is written where the cursor is, so the worker keeps the
   * text that surrounds it.
   */
  protected insertToken(token: string): void {
    const editor = this.editor()?.nativeElement;
    if (!editor) {
      this.bodyChanged.emit(`${this.body()} {${token}}`);
      return;
    }

    const start = editor.selectionStart ?? this.body().length;
    const end = editor.selectionEnd ?? start;
    const placeholder = `{${token}}`;
    const body = `${this.body().slice(0, start)}${placeholder}${this.body().slice(end)}`;

    this.bodyChanged.emit(body);

    const caret = start + placeholder.length;
    queueMicrotask(() => {
      editor.focus();
      editor.setSelectionRange(caret, caret);
    });
  }
}
