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
