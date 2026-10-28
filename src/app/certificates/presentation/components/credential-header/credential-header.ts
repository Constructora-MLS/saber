// Package credentialheader shows the identity of Constructora MLS on the
// public verification page of a certificate.
// package credentialheader

import { Component, input } from '@angular/core';
import { MlsIcon } from '../../../../shared/presentation/components/icons/mls-icon/mls-icon';

/**
 * CredentialHeader is the header of the public credential page.
 *
 * The component is presentational and belongs to the verification page
 * only: it shows the emblem and the name of the company, the title of the
 * document and its supporting text. It never talks to the API.
 */
@Component({
  imports: [MlsIcon],
  selector: 'app-credential-header',
  styleUrl: './credential-header.scss',
  templateUrl: './credential-header.html',
})
export class CredentialHeader {
  /** The title of the document that is being verified. */
  readonly title = input('Certificado de trabajo');
  /** The supporting text that explains what the page shows. */
  readonly subtitle = input(
    'Verifica la autenticidad del documento y los datos laborales que registra.',
  );
  /** The name of the company that issues the certificates. */
  readonly company = input('Constructora MLS S.A.C.');
}
