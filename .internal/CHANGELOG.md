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

## Viernes 16 de octubre de 2026, 8:50 p. m. — America/Mexico_City

Agente: Claude (Claude Code, Anthropic).

Actualización del Librero en /librero/ a la versión 1.7.1, solicitada y revisada en vista previa por el propietario.

- La portada se forma al abrir la ficha de un libro (componente «Generate» de Bencho, licencia MIT, traducido a JavaScript sin React). El lomo del libro 3D se forma a la par; sin píldora «Generar».
- La columna de calificación tiene tamaño fijo: ya no empuja el título ni la sinopsis.
- Archivos: `librero/js/generar.js` (nuevo), `librero/js/ficha.js`, `librero/css/librero.css`. Copia generada con `librero/tools/publicar_sitio.sh` desde `fguadarrama/Hoomsa` (commit 3f6c7d4).
- Ningún otro archivo del sitio se modificó.
- Verificación: servidor local en /librero/, sin errores en consola ni archivos 404; portada y lomo se forman y terminan correctamente.

## Domingo 25 de octubre de 2026, 1:45 p. m. — America/Mexico_City

Agente: Claude (Claude Code, Anthropic).

Actualización del Librero en /librero/ a la versión 1.8.0, solicitada por el propietario.

- Libros: 637 → 673. Se añaden los 13 libros pedidos el 25 de octubre (entre ellos *An Instance of the Fingerpost*, que el propietario no encontraba porque el sitio no se había vuelto a publicar) y 23 de su lista de deseos de Amazon. Las series quedan juntas y en orden de lectura.
- Nueva función: Exportar PDF por repisa (menú ≡).
- Archivos: `librero/data/libros.json`, `librero/index.html`, `librero/js/app.js`, `librero/js/exportar.js` (nuevo), `librero/css/librero.css` y 12 portadas nuevas en `librero/portadas/`. Copia generada con `librero/tools/publicar_sitio.sh` desde `fguadarrama/Hoomsa` (commit 82b481e).
- Ningún otro archivo del sitio se modificó.

## Domingo 25 de octubre de 2026 — America/Mexico_City

Agente: Claude (Claude Code, Anthropic).

Portadas de los libros nuevos del Librero (/librero/), encontradas por el robot de datos de Hoomsa (commit dabb236) y revisadas una por una: 17 portadas nuevas en `librero/portadas/` y `librero/data/libros.json` actualizado. Sin cambios de código ni en otros archivos del sitio.

## Domingo 25 de octubre de 2026 — America/Mexico_City

Agente: Codex (OpenAI).

Actualización de /health aprobada por el propietario:

- Login con siete casillas, caracteres ocultos progresivamente y sonidos de dígitos ascendentes con mayor volumen. Campo silencioso al hacer clic.
- Textos «Escribe el código», «Código incorrecto» y «Código correcto». Error y puntos en #ff0059; éxito en rgb(45, 103, 78) con sombra rgb(102, 219, 108). Acentos del login neutros.
- Fondo light rgb(246, 247, 249), tarjetas blancas y conservación de acentos de la aplicación.
- Sonidos de clic tap2wkhm y de descarga PDF successNf0fw. Hover sonoro sólo en gráficas, con deduplicación por punto.
- Corrección de paginación, tablas, unidades y etiquetas de los PDF de parámetros. Verificación de 181 parámetros y 961 resultados durante el desarrollo.
- Publicación del artefacto cifrado, sin contraseñas ni datos clínicos en texto plano. Pruebas de eventos, audio y tema aprobadas. La compilación completa y las auditorías que requieren archivos privados ausentes no pudieron ejecutarse en esta copia.


## Lunes 26 de octubre de 2026 — America/Mexico_City

Agente: Codex.

Actualización de /vacaciones/atenas/, solicitada por el propietario.

- Integradas cuatro entradas y un traslado confirmado, con sus comprobantes cifrados y vistas de las páginas para consulta sin conexión.
- Actualizado el itinerario a los horarios de reserva y diferenciados horarios confirmados de estimaciones del plan.
- Ahora prioriza entradas y recogidas próximas o en curso usando el reloj del dispositivo; refresca al volver a la app y conserva las zonas de cada evento.
- Acceso actualizado al componente compartido de cuatro dígitos, basado en One-time code de Bencho, con ocultación inmediata mediante puntos y apertura automática. Clave rotada sin incluir su valor en código ni documentación públicos.
- Reservas ampliada para transporte, entradas, tours y tipos adicionales. Service worker actualizado a grecia-2026-v4.
- Fuentes, documentos sin cifrar y changelog detallado conservados en el repositorio privado vacaciones-fuente.
- Validación: construcción y sintaxis, rechazo de clave anterior, integridad de PDFs, referencias de 11 reservas, ventanas de tiempo en tres zonas de dispositivo e inspección visual local.
