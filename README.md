# Saber

Starter de aplicación creado con Angular 22, Angular Material y una capa visual propia inspirada en Material 3 Expressive. Incluye iconos Material Symbols alojados localmente, tema claro/oscuro, navegación adaptable y el menú lateral de Recursos Humanos.

> Angular Material proporciona los componentes Material 3; la dirección Expressive (paleta, formas, jerarquía tipográfica y movimiento) se aplica en el tema SCSS y en la interfaz de ejemplo.

## Requisitos

- Node.js 22 o posterior
- Bun 1.3 o posterior

## Desarrollo

```bash
bun install
cp .env.template .env
bun run start
```

Abre <http://localhost:4200/>. El servidor de desarrollo recarga la aplicación al guardar cambios.

## Comandos

```bash
bun run start   # servidor de desarrollo
bun run build   # compilación de producción
bun run watch   # compilación de desarrollo en modo watch
```

## Catálogos (bounded context)

La página `/catalog` implementa el contexto delimitado de **Catálogos** del backend Go
(`akame`), siguiendo DDD:

```text
src/app/catalog/
  domain/model/value-objects/   # CatalogName, Description, UnitCode, CatalogStatus
  domain/model/aggregates/       # Service, Position, Regime, WorkUnit
  domain/model/errors/           # CatalogValidationError
  domain/repositories/           # puertos de los registros (ServiceRepository, …)
  application/commands/          # comandos de creación
  application/queries/           # consultas de listado
  application/command-services/  # casos de uso de escritura
  application/query-services/    # casos de uso de lectura
  infrastructure/http/           # adaptador HTTP (contrato OpenAPI + problem details)
  infrastructure/catalog.providers.ts
  interfaces/components/         # tabla y diálogos de registro
  interfaces/pages/catalog-page/ # orquestación de la página
```

Vistas disponibles: **Servicios** (nueva opción para registrar servicios), **Unidades de
Trabajo**, **Cargos** y **Regímenes**. Cada vista lista los registros del catálogo y abre el
diálogo que los registra contra la API real (`POST /api/v1/services`, `/work-units`,
`/positions`, `/regimes`).

## Autenticación (bounded context IAM)

El contexto delimitado de **IAM** del backend Go (`akame`) protege la plataforma.
Saber implementa el inicio de sesión, la renovación de la sesión y la verificación
del usuario, y protege las rutas privadas con un guard:

```text
src/app/iam/
  domain/model/value-objects/   # Email, Password, AuthIdentity, UserId, UserStatus
  domain/model/errors/           # AuthValidationError
  domain/model/aggregates/       # PlatformUser
  application/commands/          # SignInCommand, InviteUserCommand, DisableUserCommand
  application/command-services/  # SignInCommandService, InviteUserCommandService, DisableUserCommandService
  application/queries/           # ListUsersQuery y la normalización de la búsqueda
  application/query-services/    # ListUsersQueryService
  application/session/           # AuthSessionStore (señales) y AuthSession
  infrastructure/contracts/      # contrato REST del API de IAM
  infrastructure/errors/         # AuthApiError y UserApiError (problem details)
  infrastructure/gateways/       # AuthGateway (sign-in, refresh, verify) y UserGateway
  infrastructure/http/           # authInterceptor (cabecera Bearer)
  presentation/components/       # SignInForm, AcceptInvitationForm, UserTable y los diálogos
  presentation/guards/           # authGuard
  presentation/pages/sign-in-page/
  presentation/pages/accept-invitation-page/  # Aceptar la invitación (pública)
  presentation/pages/settings-page/  # Configuración de la cuenta
  presentation/pages/users-page/     # Administración · Usuarios
```

- **Sign-in:** `POST /api/v1/auth/sign-in` con el correo y la contraseña. La respuesta
  lleva el access token y la cookie `akame_refresh` (HttpOnly) que el navegador envía
  sola.
- **Refresh:** `POST /api/v1/auth/refresh` renueva la sesión con la cookie. El guard la
  llama cuando la página no tiene un access token en memoria, así que una recarga no
  obliga a volver a iniciar sesión. La renovación se comparte entre navegaciones
  simultáneas: el token nunca se rota dos veces por la misma sesión.
- **Verify:** `GET /api/v1/auth/verify` con el access token devuelve la identidad del
  usuario (`uuid`, `email`, `firstName`, `lastName`).
- **Protección:** `authGuard` protege las rutas de RR. HH. y de Administración. Sin una
  sesión válida el usuario va a `/sign-in` y, después de iniciar sesión, entra a la
  portada de la plataforma.
- **Excepción pública:** `/verify/:code` (la verificación de un certificado) y
  `/sign-in` no están protegidas: el QR de un certificado se abre sin credenciales.
- **Validación:** el formulario usa los componentes de Material 3 (`mat-form-field`,
  `matInput`, `matButton`) y los límites viven en el dominio (`Email` hasta 254
  caracteres, `Password` entre 8 y 128). El contador compartido (`FieldCounter`)
  muestra el límite de cada campo. La contraseña se puede mostrar con el botón
  del ojo.
- **Perfil del lateral:** el sidebar muestra el ícono de usuario y solo el
  primer nombre del usuario autenticado, que lee de la sesión publicada por IAM.
- **Configuración:** los tres puntos del perfil llevan a `/settings`, la página
  de configuración de la cuenta. Su botón **Cerrar sesión** llama a
  `POST /api/v1/auth/logout`, olvida la sesión en el navegador y vuelve al
  inicio de sesión. Los fallos se avisan con la notificación de Material
  (`MatSnackBar` con la acción "Cerrar"), el mismo patrón que el resto de la
  plataforma.
- **Usuarios (Administración):** la página `/users` lista las cuentas de acceso con
  `GET /api/v1/users` (búsqueda por nombre o correo, filtro por estado `active` o
  `pending` y paginación numerada), invita a una persona con
  `POST /api/v1/users/invitations` (solo pide el correo: los nombres y la contraseña
  los elige la persona invitada al aceptar) y borra una cuenta con
  `DELETE /api/v1/users/{uuid}`, que la borra lógicamente y cierra sus sesiones. La
  acción vive en el menú de tres puntos de cada fila, igual que en Personal y en
  Catálogos, y el diálogo de borrado exige confirmar, porque la operación cierra
  las sesiones activas de la cuenta. El listado se vuelve a leer cuando la pestaña
  recupera el foco, para que la cuenta invitada muestre su nuevo estado en cuanto
  la persona acepta la invitación.
- **Aceptar invitación:** la ruta `/accept-invitation` es pública, como el inicio de
  sesión, porque la persona invitada llega desde el correo. La página lee el
  correo de la invitación con `GET /api/v1/invitations/{token}` (sin consumirla) y
  lo muestra en el texto de la invitación ("Invitación válida para el correo
  ..."), nunca como un campo del formulario: el correo lo pone la plataforma y no
  se puede cambiar. La persona escribe sus nombres, sus apellidos y su contraseña
  (12 a 30 caracteres) y activa la cuenta con
  `POST /api/v1/invitations/{token}/accept`. La invitación es de un solo uso: si
  venció o ya se usó, la página lo avisa y ofrece el inicio de sesión.

El access token vive **solo en la memoria** del navegador: nunca se escribe en el
almacenamiento local. El interceptor añade la cabecera `Authorization: Bearer` a las
peticiones privadas y no la añade a las rutas públicas (sign-in, refresh, la
verificación pública de certificados y la aceptación de una invitación).

## Variables de entorno

Copia `.env.template` a `.env` y configura `API_PROXY_TARGET` con la dirección del backend.
`proxy.conf.cjs` carga esa variable mediante **dotenv** y reenvía las llamadas de `/api/**`.
La ruta `/api/v1` permanece en `src/app/api.config.ts`.

Las variables del entorno tienen prioridad sobre `.env`. El archivo `.env` se excluye
de Git; `.env.template` sí se versiona. No se generan archivos ni se incorporan las
variables del proxy al navegador. Reinicia el servidor de desarrollo tras cambiar `.env`.

El proxy de Angular solo se usa en desarrollo. En producción, configura el proxy
equivalente para `/api` en tu servidor web.

### Verificación de certificados

El QR abre la página de Saber `/verify/MLS-…`, que consulta a Akame en
`/api/v1/certificates/verify/MLS-…`. En el `.env` de **Akame**, configura
`PUBLIC_BASE_URL` con la dirección pública de **Saber** (local: `http://localhost:4200`).
No confundas esta dirección con `API_PROXY_TARGET`, que apunta al backend.
En producción, el servidor web debe servir `index.html` al abrir directamente
`/verify/:code` y reenviar `/api/**` a Akame. Los PDF ya archivados conservan
la URL que tenían al emitirse; `/verificar/:code` redirige a `/verify/:code` para
mantener los QR anteriores.

La ruta pública carga `CredentialPage` (`certificates/interfaces/pages/credential-page`)
sin el layout ni el sidebar de RR. HH. Un código ausente o anulado muestra el
mismo mensaje de certificado inexistente; la respuesta pública no contiene motivo
ni fecha de anulación. La fecha y el motivo se conservan en el backend para
auditoría, sin columnas adicionales en el frontend. El historial muestra el estado
y bloquea Visualizar/Descargar para los anulados. La API también bloquea el acceso al PDF,
aunque se invoque la URL directamente.

Para los vigentes, `CredentialPage` muestra el PDF y permite descargarlo o
compartir el enlace público (menú nativo del dispositivo o copia al portapapeles).
El PDF se consulta por código en `/api/v1/certificates/verify/:code/file`, sin UUID;
cada descarga vuelve a comprobar la vigencia. La anulación sigue solicitando
un motivo obligatorio, reservado a la auditoría interna.
