# Changelog interno

## Lunes 12 de octubre de 2026, 8:16 p. m. — America/Mexico_City

Agente: Codex, basado en GPT-6. El identificador exacto de la variante y el nivel de esfuerzo no están expuestos a este agente.

Ajuste de paleta y estética solicitado y revisado por el propietario.

| Elemento | Antes | Después |
| --- | --- | --- |
| Fondo dark | #2c292f · rgb(44, 41, 47) | #1c1e1e · rgb(28, 30, 30) |
| Azul/acento y subrayados light | #4577b5 · rgb(69, 119, 181) | #4392ba · rgb(67, 146, 186) |
| Azul/acento y subrayados dark | #a0b9d9 · rgb(160, 185, 217) | #54bbee · rgb(84, 187, 238) |
| Subrayado rosado light | #ea1b5c · rgb(234, 27, 92) | #eb155c · rgb(235, 21, 92) |
| Subrayado doble y flecha junto a Francisco en dark | #ff96ac · rgb(255, 150, 172) | #ff1866 · rgb(255, 24, 102) |
| Highlight dark | Amarillo #ffe14d con opacidad 28 % | Amarillo #ffe14d sólido, continuo por línea, con texto #1c1e1e; contraste 12.86:1 |
| Panel de ajustes light/dark | Sombra/glow exterior | Sin sombra exterior |

- Subrayado rosado doble en ambas versiones de idioma.
- Texto general dark conservado en #fdfdfc; inversión de color solamente dentro del highlight amarillo, autorizada posteriormente.
- Ninguna palabra del contenido, traducciones o etiquetas accesibles cambió.
- Versiones de CSS y JavaScript actualizadas para evitar caché anterior.
- Verificación: sintaxis JavaScript, git diff --check y vista previa visual local.

Este archivo está en un directorio oculto, sin enlaces desde el sitio ni inclusión en sitemap. El directorio está excluido en robots.txt y Jekyll omite por defecto directorios que empiezan con punto. El historial del repositorio sigue siendo visible en GitHub.

## Lunes 12 de octubre de 2026, 8:36 p. m. — America/Mexico_City

Agente: Codex, basado en GPT-6. Variante exacta y nivel de esfuerzo no expuestos.

Correcciones visuales autorizadas por el propietario.

- Subrayado doble: altura de 0.82em a 0.28em y posición inferior de -0.58em a -0.22em. Las dos barras quedan más próximas y no invaden el siguiente renglón. Misma regla para inglés y español, desktop y mobile.
- Highlight dark: franja continua que incluye “to a” en inglés y “hasta un” en español. Los rangos de light se conservan.
- Colores de la paleta conservados; ninguna palabra del sitio modificada.
- Sitemap: lastmod actualizado de 2026-09-09 a 2026-10-12 por solicitud explícita del propietario. No se añadieron URLs ni el changelog interno.
- CSS y JavaScript: versión de caché actualizada de 20261012-palette1 a 20261012-palette2.
- Verificación: sintaxis JavaScript, XML del sitemap, git diff --check y capturas locales de desktop/mobile.

## Lunes 12 de octubre de 2026, 9:04 p. m. — America/Mexico_City

Agente: Codex, basado en GPT-6. Variante exacta y nivel de esfuerzo no expuestos.

Transiciones entre secciones aprobadas por el propietario.

- Navegación mediante document.startViewTransition: capturas del área main con fundido de 520 ms y desplazamiento de entrada de 8 px. La actualización de la sección ocurre dentro del callback de la API, evitando estados visuales intermedios.
- Menú, pie de página y retrato quedan fuera de la captura; la API se activa únicamente al navegar entre secciones.
- Alternativa para navegadores sin soporte: salida con opacidad de 180 ms y entrada de 360 ms mediante Web Animations API.
- Respeto de prefers-reduced-motion; bloqueo de cambios simultáneos hasta terminar la transición y limpieza al finalizar.
- Texts reveal de transitions.dev conservado para la entrada inicial, con sus tokens de 500 ms, 12 px, blur de 3 px y stagger de 40 ms. Snippet de referencia descargado con npx transitions-dev add texts-reveal.
- Mediciones de anotaciones agrupadas antes de las escrituras del DOM; recálculo al regresar a portada y después de cargar las fuentes.
- Código CSS y JavaScript del retrato comprobado idéntico a la versión anterior. Ninguna palabra del sitio modificada.
- Versión de caché de CSS/JavaScript actualizada de 20261012-palette2 a 20261012-motion1.
- Verificación: sintaxis JavaScript, git diff --check, ejecución y finalización de la API nativa al entrar y regresar, sin errores JavaScript en la vista previa local.

## Jueves 15 de octubre de 2026, 11:25 p. m. — America/Mexico_City

Agente: Claude (Claude Code, Anthropic).

Publicación del Librero en /librero/, solicitada por el propietario.

- Nueva carpeta `librero/`: copia de la versión web (1.6.1) del proyecto Librero, cuyo código fuente vive en el repositorio privado `fguadarrama/Hoomsa`, carpeta `librero/`.
- Se generó con `librero/tools/publicar_sitio.sh` desde Hoomsa. Solo incluye `index.html`, `css/`, `js/`, `iconos/`, `sonidos/`, `portadas/` y `data/libros.json`; no incluye scripts de datos, la hoja de cálculo ni documentación interna.
- No se modificó ningún otro archivo del sitio. `/libros/` y `librero_source/` son otro proyecto y no se tocaron. No se añadieron enlaces, sitemap ni robots.
- Para cambios futuros: editar en Hoomsa y volver a ejecutar el script. Las instrucciones para agentes están en `Hoomsa/librero/AGENTS.md`.
- Verificación: servidor local en /librero/, sin errores en consola ni archivos 404; lomos, gatos, portadas y favicon cargan.
