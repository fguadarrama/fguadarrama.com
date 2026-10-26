# lecturi — paquete de marca

Lector de EPUB. Este paquete contiene el símbolo, el favicon, el ícono de app y los íconos de lectura. Está pensado para que un agente (o una persona) lo integre en la app sin tener que tomar decisiones de diseño.

Los valores exactos también están en `tokens.json`.

## Reglas que no se rompen

1. **Tres colores, siempre al 100 %.** Sin transparencias, degradados ni sombras.

   | Token | Hex | Uso |
   |---|---|---|
   | `ink` | `#303840` (Yo-nezumi 夜鼠) | trazo principal en tema claro · fondo en tema oscuro |
   | `accent` | `#EB155C` | el acento; nunca cambia entre temas |
   | `paper` | `#FDFBF7` | fondo en tema claro · trazo principal en tema oscuro |

2. **Cada pieza usa dos colores sobre su fondo:** `ink + accent` en claro, `paper + accent` en oscuro.
3. **El rosa es un acento único.** En el símbolo es la "i" y su punto. En cada ícono es un solo elemento.
4. **No editar la geometría.** Para cambiar de tamaño, elegir la variante correcta según la tabla de abajo; no escalar el trazo a mano.

## Estructura

```
lecturi-brand/
├── tokens.json                 colores, grosores y tipografía en formato máquina
├── logo/
│   ├── lecturi-mark.svg              símbolo, tema claro (trazo 4)
│   ├── lecturi-mark-dark.svg         símbolo, tema oscuro (trazo 4)
│   ├── lecturi-mark-mono-paper.svg   símbolo monocromo #FDFBF7, para fondo oscuro
│   ├── lecturi-mark-small.svg        símbolo con trazo reforzado (9), tema claro
│   ├── lecturi-mark-small-dark.svg   símbolo con trazo reforzado (9), tema oscuro
│   ├── lecturi-lockup.svg            símbolo + palabra, tema claro
│   └── lecturi-lockup-dark.svg       símbolo + palabra, tema oscuro
├── favicon/
│   ├── favicon.svg            favicon principal (cuadro #303840)
│   ├── favicon-light.svg      alternativa en cuadro #FDFBF7
│   ├── favicon.ico            16 + 32 + 48 px
│   └── favicon-16/32/48.png
├── app-icon/
│   ├── app-icon.svg           cuadro completo; el sistema operativo redondea las esquinas
│   ├── apple-touch-icon.png   180 px
│   ├── icon-192.png
│   └── icon-512.png
└── icons/
    ├── *.svg                  íconos de lectura; el trazo base usa currentColor (versión recomendada)
    ├── light/*.svg            mismos íconos con #303840 fijo
    └── dark/*.svg             mismos íconos con #FDFBF7 fijo
```

## Qué variante del símbolo usar

El símbolo se dibuja con trazo. A tamaños pequeños el trazo fino desaparece, así que hay variantes con trazo más grueso.

| Tamaño en pantalla | Archivo |
|---|---|
| 96 px o más | `logo/lecturi-mark.svg` · `logo/lecturi-mark-dark.svg` |
| 32 a 96 px | `logo/lecturi-mark-small.svg` · `logo/lecturi-mark-small-dark.svg` |
| 16 a 48 px (pestaña del navegador) | `favicon/favicon.svg` / `favicon.ico` |
| Ícono de app instalada | `app-icon/*` |

No uses el símbolo normal como favicon: a 16–32 px su trazo deja de verse.

## Cómo usarlo

### Favicon e ícono de app (en el `<head>`)

```html
<link rel="icon" href="/favicon/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/app-icon/apple-touch-icon.png">
```

En el `manifest.webmanifest` de una PWA:

```json
"icons": [
  { "src": "/app-icon/icon-192.png", "sizes": "192x192", "type": "image/png" },
  { "src": "/app-icon/icon-512.png", "sizes": "512x512", "type": "image/png" }
],
"theme_color": "#303840",
"background_color": "#303840"
```

### Logotipo con palabra

- Los archivos `lecturi-lockup*.svg` escriben "lecturi" como texto en **Manrope 500**. Se ven bien solo si esa fuente está cargada.
- Para usarlos fuera de la web (imágenes, impresos), primero hay que convertir el texto a trazos en un editor vectorial.
- En una página web es más simple armarlo en HTML:

```html
<a class="brand" href="/">
  <img src="/logo/lecturi-mark-small.svg" alt="" width="40" height="40">
  <span>lecturi</span>
</a>
<style>
  @import url("https://fonts.googleapis.com/css2?family=Manrope:wght@500&display=swap");
  .brand { display: inline-flex; align-items: center; gap: 10px; text-decoration: none;
           font-family: "Manrope", sans-serif; font-weight: 500; font-size: 26px;
           letter-spacing: -0.01em; color: #303840; }
  @media (prefers-color-scheme: dark) { .brand { color: #FDFBF7; } }
</style>
```

En tema oscuro, cambia también el `src` a `lecturi-mark-small-dark.svg`.

### Íconos de lectura

| Archivo | Función |
|---|---|
| `text-size.svg` | tamaño de texto |
| `font.svg` | fuente |
| `line-height.svg` | interlineado |
| `margins.svg` | márgenes |
| `sound-on.svg` | sonido activado |
| `sound-off.svg` | sonido desactivado |

- Están en una retícula de 24 × 24, con trazo 1.75 y puntas redondas. Usarlos a 20, 24 o 32 px.
- Las versiones en `icons/` (sin subcarpeta) pintan el trazo base con `currentColor`, así que **toman el color del texto que las rodea**. El rosa está fijo.
- Para que `currentColor` funcione, el SVG tiene que estar **dentro del HTML** (inline o con un componente). Con `<img src>` el color no se hereda; en ese caso usa las carpetas `light/` o `dark/`.

```html
<button class="tool" aria-label="Tamaño de texto">
  <!-- pega aquí el contenido de icons/text-size.svg -->
</button>
<style>
  .tool { color: #303840; background: none; border: 0; padding: 10px; }  /* área táctil ≥ 44 px */
  @media (prefers-color-scheme: dark) { .tool { color: #FDFBF7; } }
</style>
```

- Sonido activado y sonido desactivado son un mismo interruptor. Muestra `sound-on.svg` cuando el sonido está encendido y `sound-off.svg` cuando está apagado, y refleja el estado con `aria-pressed`.

## Para editar o ampliar el sistema

- **Símbolo:** el lienzo es de 200 × 200. La "l" es el trazo `#303840`/`#FDFBF7` con gancho arriba; la "i" es el trazo rosa más corto, con su punto; las dos se cruzan en la base. Las coordenadas exactas están en los `<path>` de `logo/lecturi-mark.svg`.
- **Íconos nuevos:** retícula de 24, trazo 1.75, puntas y uniones redondas, un solo elemento rosa por ícono. El resto del ícono en `currentColor`.
