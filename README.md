# Saber

Starter de aplicación creado con Angular 22, Angular Material y una capa visual propia inspirada en Material 3 Expressive. Incluye iconos Material Symbols alojados localmente, tema claro/oscuro, navegación adaptable y el menú lateral de Recursos Humanos.

> Angular Material proporciona los componentes Material 3; la dirección Expressive (paleta, formas, jerarquía tipográfica y movimiento) se aplica en el tema SCSS y en la interfaz de ejemplo.

## Requisitos

- Node.js 22 o posterior
- Bun 1.3 o posterior

## Desarrollo

```bash
bun install
bun run start
```

Abre <http://localhost:4200/>. El servidor de desarrollo recarga la aplicación al guardar cambios.

## Comandos

```bash
bun run start   # servidor de desarrollo
bun run build   # compilación de producción
bun run watch   # compilación de desarrollo en modo watch
```

## Estructura inicial

```text
src/
├── app/
│   ├── personal/interfaces/pages/personal-page/  # página de Personal
│   ├── catalog/interfaces/pages/catalog-page/    # página de Catálogos
│   ├── shared/interfaces/components/
│   │   ├── app-switcher/                # selector de aplicaciones
│   │   ├── icons/mls/                   # icono MLS reutilizable
│   │   └── rrhh-sidebar/                # menú lateral de Recursos Humanos
│   ├── app.config.ts                     # configuración standalone
│   └── app.routes.ts                     # rutas lazy-loaded
├── index.html
└── styles.scss                           # tema M3, tokens y estilos globales
```
