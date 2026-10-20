# Saber

Starter de aplicación creado con Angular 22, Angular Material y una capa visual propia inspirada en Material 3 Expressive. Incluye iconos Material alojados localmente, tema claro/oscuro, navegación adaptable y una galería de componentes y tokens.

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
bun run test    # pruebas unitarias con Vitest
bun run watch   # compilación de desarrollo en modo watch
```

## Estructura inicial

```text
src/
├── app/
│   ├── features/studio/pages/home-page/  # página de muestra
│   ├── app.config.ts                     # configuración standalone
│   └── app.routes.ts                     # rutas lazy-loaded
├── index.html
└── styles.scss                           # tema M3, tokens y estilos globales
```
