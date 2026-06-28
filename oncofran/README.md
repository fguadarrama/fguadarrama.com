# Sitio profesional de oncología — React + TypeScript + Vite

Mockup estático preparado para GitHub Pages.

## Requisitos implementados

- React + TypeScript con Vite.
- Diseño responsive desktop/mobile desde la primera versión.
- Tipografía de body: Ysabeau desde Google Fonts.
- Tipografía de títulos/secundaria: Cormorant desde Google Fonts.
- Fondo `#F6F2F1` y texto `#062540`.
- Splash/hero inicial inspirado en la referencia proporcionada.
- Toggle inglés/español con detección inicial por idioma del navegador y persistencia en `localStorage`.
- Secciones: biografía, contacto, citas, informes para aseguradoras, preguntas frecuentes y médicos recomendados.
- Directorio de médicos con filtro por nombre o especialidad.
- Notificaciones con `goey-toast` usando preset `bouncy`.

## Uso local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## GitHub Pages

El proyecto usa `base: './'` en `vite.config.ts`, adecuado para despliegue como sitio estático en GitHub Pages. Para publicar:

1. Subir el repositorio a GitHub.
2. Ejecutar `npm run build`.
3. Publicar la carpeta `dist` con GitHub Pages, GitHub Actions o una rama `gh-pages`.

## Retrato

El código usa la imagen externa:

```ts
const PORTRAIT_URL = 'https://fguadarrama.com/Portrait_nbg.png'
```

Para evitar problemas por bloqueo de contenido mixto o disponibilidad externa, conviene descargar esa imagen, colocarla en `public/Portrait_nbg.png` y cambiar la constante a:

```ts
const PORTRAIT_URL = './Portrait_nbg.png'
```
