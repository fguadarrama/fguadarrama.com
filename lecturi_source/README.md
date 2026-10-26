# Lecturi

Lector EPUB para `https://fguadarrama.com/lecturi/`.

## Desarrollo

```sh
npm ci
npm run dev
npm run build
npm run preview
npm run package:site  # ZIP listo para el sitio existente
```

La compilación queda en `dist/`, con rutas absolutas bajo `/lecturi/`.
Para actualizar el sitio existente `fguadarrama/fguadarrama.com`, copiar **el contenido** de `dist/` a su carpeta `lecturi/`. No se debe sustituir la raíz del sitio por esta compilación. El workflow incluido sirve únicamente si este proyecto se aloja en un repositorio independiente con GitHub Pages mediante Actions; no es necesario en el repositorio del sitio existente.

## Lectura y tipografías

La interfaz usa exclusivamente Albert Sans. El libro comienza con Coelacanth; Latin Modern Roman es una alternativa en el selector, con los mismos WOFF2 de la demostración de Justif. Se conservan EB Garamond, Cormorant Garamond, Space Grotesk, Instrument Serif y Junicode del lector original. Las elecciones previas del usuario se respetan.

Albert Sans, Coelacanth (cuatro estilos), Latin Modern y Junicode se alojan localmente. Las cuatro fuentes originales de Google Fonts necesitan conexión en su primera carga.

Justif 0.9.2 es el motor real de composición. epub.js 0.3.93 abre el archivo y pagina el resultado en columnas. Cada capítulo recibe estilos y un script de Justif dentro de su propio iframe, de modo que canvas, fuentes y nodos pertenecen al mismo documento. Se espera a las fuentes antes de medir. Hyphenopoly 6.1.0 proporciona fragmentos silábicos por idioma; los patrones TeX de Justif sirven de respaldo.

Opciones: protrusión óptica, puntuación colgante al final de línea, tracking de hasta 1.5 %, expansión de hasta 2 % si la fuente tiene eje `wdth` (Junicode), última línea mínima de un tercio de la medida. Latin Modern y Coelacanth son estáticas: la expansión de glifos no se simula. Se conservan cursivas, negritas y enlaces. Los bloques no compatibles con Justif conservan la composición del navegador; el panel muestra el recuento y la consola registra los rechazos. Un plazo de seguridad revela el contenido si el motor falla, para evitar una página en blanco.

El ancla guarda capítulo, CFI del párrafo y desplazamiento de carácter. Se restaura tras recomponer. Las actualizaciones se procesan en serie, sin interrumpir una recomposición a los 2 segundos ni depender del plazo de View Transitions.

## Controles

- Tres fondos originales: Shironeri es el inicial. Acento exacto `rgb(235, 21, 92)` en claro y `rgb(67, 146, 186)` en oscuro. Se retira el generador dinámico y se conserva su sonido al elegir otro fondo.
- Reglas de tamaño (14–30 px), interlineado (1.20–2.00, paso .05) y márgenes (0–24 %): arrastre con captura de puntero, velocidad, lanzamiento, límites y encaje con resorte. Una sola recomposición al asentarse. También aceptan flechas, Inicio, Fin y desplazamiento horizontal del trackpad.
- Apertura EPUB por selector o arrastre, borde animado, respuesta al arrastrar, etapas de procesamiento local y respuesta de error. No se simula una subida a un servidor.
- Timbres locales con Web Audio y preferencia persistente para silenciarlos. No hay audio antes de una interacción.
- Movimiento reducido: sin desplazamientos decorativos, lanzamiento ni borde animado; los controles conservan su función.

Atajos: flechas, Espacio o Page Up/Down para navegar; T para índice, A para ajustes y Escape para cerrar paneles. Los atajos del libro no capturan las flechas de los controles.

Preferencias y progreso: localStorage. Último EPUB: IndexedDB. El archivo permanece en el navegador. Se eliminan scripts, atributos de eventos, documentos embebidos y enlaces ejecutables de los capítulos antes de inyectar el código del lector.

## Verificación

`npm run build` verifica la compilación. `tests/fixtures/lecturi-test.epub` es un EPUB propio de dos capítulos en español, con cursivas y negritas, para comprobar apertura, composición, navegación y reanudación sin usar libros privados.

Prueba manual: abrir el fixture; comprobar el recuento de 24 párrafos por capítulo; cambiar entre Coelacanth y Latin Modern; pasar página; ajustar tamaño, interlineado y márgenes; comprobar que el párrafo de lectura se conserva; cambiar fondo/acento; silenciar; recargar y continuar. Repetir en un móvil real para evaluar el gesto táctil.

## Archivos principales

- `src/config.js`: fuentes locales, fondos, acentos y valores iniciales.
- `src/controls.js`: reglas con inercia.
- `src/sound.js`: síntesis de los sonidos.
- `src/main.js`: interfaz, apertura y preferencias.
- `src/reader.js`: estilos del capítulo, navegación y anclas.
- `public/justif-frame.js`: composición dentro del documento EPUB.
- `THIRD_PARTY.md`: fuentes de referencia y licencias.

## Marca y revelado de tipografía

Se integra `public/brand/` completo: 7 variantes de símbolo/logotipo SVG, 18 iconos SVG (currentColor, claro, oscuro), favicon SVG/ICO/PNG y recursos de app SVG/PNG. Las geometrías no se modifican. El logotipo de la portada se compone en HTML con Albert Sans para conservar la tipografía solicitada; los lockups del paquete usan Manrope y se archivan como referencia. Los iconos se insertan inline para heredar el color base, manteniendo el acento correspondiente al tema. El símbolo dispone de variantes clara y oscura. Favicon, apple-touch-icon y manifest apuntan a los recursos originales.

Las siete fuentes muestran exactamente «Cuius rei demonstrationem mirabilem», cuatro palabras. Un cálculo con canvas y ResizeObserver ajusta el mismo tamaño para todas según el ancho de la muestra más extensa, también al terminar de cargar las fuentes; no se recortan palabras.

La transición de fuente se ejecuta sobre la capa estable del visor, fuera del iframe. Precarga la fuente, oculta el cambio en 100 ms y revela la nueva composición en 420 ms con una subida de .4em y la curva cubic-bezier(.23,1,.32,1). Se espera a Justif y a la restauración del ancla antes de la entrada. No se introducen envolturas ni se modifican los párrafos o CFI. Con movimiento reducido, el cambio es inmediato.

## Portada y cabecera

La portada usa Shironeri como tema inicial, con el símbolo encima de «lecturi» y el lema «Un margen no basta». El nombre revela una nota discreta con la pronunciación `ˈlek.tu.ɾi` y el texto de Fermat proporcionado por el usuario. Admite hover, foco, pulsación táctil, cierre con Escape y al pulsar fuera.

La cabecera centra título y autor por separado, en dos líneas, con el mismo color del texto de lectura. El título es mayor y en seminegrita; el autor conserva su capitalización original. La selección de tema se sigue guardando. El símbolo nocturno deriva de la geometría original con el nuevo acento azul; los originales del paquete se conservan intactos.

La wordmark usa el SVG vectorial proporcionado por el usuario, conservado sin modificaciones en `public/brand/logo/lecturi-wordmark.svg`; una variante para oscuro cambia únicamente los colores. La pronunciación de la nota es **[ˈlek.tu.ɾi]**. El tema oscuro se llama **Yo-nezumi** y conserva su identificador interno `oscuro` para mantener las preferencias guardadas.

La apertura exitosa reproduce `notificationkndwr`: cuatro senos con los valores exactos proporcionados por el usuario, envolventes lineales y retardos independientes, sin filtro. Se respeta el interruptor de sonido. Las muestras de fondo llevan su propio `--swatch-accent`: rosa para los dos fondos claros y azul para Yo-nezumi, independientemente del tema activo.

## Entrada inicial

En cada carga de la página, símbolo y wordmark se resuelven durante 3000 ms, adaptando el efecto Generate de Bencho: turbulencia SVG, desplazamiento que se aquieta, desenfoque decreciente, contraste sobre el papel y una segunda capa nítida que aparece al final. No se muestra porcentaje. Los controles permanecen ocultos e inertes hasta terminar; la entrada no se repite al volver del libro a la portada. Con movimiento reducido se conserva la duración y solo se usa una aparición suave, sin distorsión. Al terminar se eliminan filtros y capas temporales.

El footer de la portada, en 9 px, dice «Diseñado por Francisco Guadarrama; algunos derechos reservados».

El tooltip de la wordmark adapta Transitions.dev: 150 ms de entrada con 80 ms de espera, 50 ms de salida sin demora, escala .98→1 y geometría con transición de 160 ms. Se sitúa arriba salvo que no haya espacio y mantiene el texto en párrafos para no exceder la ventana. Usa `role=tooltip`, `aria-hidden`, foco, Escape y pulsación táctil. Con movimiento reducido se desactivan las transiciones.

### Revisión de la secuencia de entrada

Se revisaron Generate y sus tokens `data-fill=light/dark`, junto con las publicaciones públicas de Emil Kowalski «Great Animations» y «Good vs Great Animations», y las referencias «Texts reveal» y «Skeleton loader and reveal» de Transitions.dev.

El contraste del loader ya no pivota sobre un único papel `.9`: utiliza los tres canales RGB del fondo de lectura activo. La fase de marca mantiene sus 3000 ms. Después, un estado `revealing` prepara las animaciones antes de hacer visible el contenido: lema, apertura, reanudación y textos secundarios entran con 50 ms de separación, durante 250–300 ms, usando la curva existente cubic-bezier(.23,1,.32,1). La zona de apertura se asienta desde escala .98 y 8 px; los textos secundarios recorren solo 4 px. Cada pieza conserva su opacidad final, especialmente el footer (.45). Se retira el fundido global del contenedor que producía la aparición brusca.

Antes de comenzar se esperan los recursos de marca, la fuente de interfaz y el bloque de reanudación, para evitar que su llegada cambie la geometría durante el loader. La entrada decorativa no bloquea los controles una vez revelados. Con movimiento reducido, no hay desplazamientos ni escalonamiento: solo un fundido breve. Al finalizar se cancelan los efectos y se retiran los filtros y capas temporales.

Fuentes: https://emilkowal.ski/ui/great-animations · https://emilkowal.ski/ui/good-vs-great-animations · https://transitions.dev/ · https://bencho.dev/?c=generate
