# Fuentes y referencias

- Ysabeau y Space Grotesk: archivos oficiales del repositorio https://github.com/google/fonts (`ofl/ysabeau`, `ofl/spacegrotesk`), licencia SIL OFL incluida en `public/fonts/Ysabeau-OFL.txt` y `public/fonts/SpaceGrotesk-OFL.txt`. Se generan instancias estáticas 400/700 con FontTools para incrustación PDF; Ysabeau incluye cursivas. No se alteran los contornos.

- Justif 0.9.2: https://github.com/lyallcooper/justif — MIT. Se usa el motor real dentro de cada documento EPUB: Knuth–Plass, Hyphenopoly, protrusión óptica, puntuación colgante, tracking y expansión cuando existe un eje `wdth`. No se simula con `text-align`.
- Latin Modern Roman 2.004 y Roman Caps: WOFF2 de https://justif.lyall.co/fonts/ (generados por el proyecto Justif). Licencia GUST en `public/fonts/LatinModern-GUST-LICENSE.txt`. Se conservan nombres tipográficos y archivos sin modificar.
- Coelacanth 0.3.0: https://gitlab.com/Fuzzypeg/coelacanth — archivos OTF oficiales regular, cursiva, negrita y negrita cursiva; licencia OFL en `public/fonts/Coelacanth-LICENSE.md`.
- Albert Sans: https://github.com/google/fonts/tree/main/ofl/albertsans — fuente variable oficial; licencia OFL incluida.
- Junicode: fuente variable incluida en el código original; licencia OFL incluida.
- Bencho: https://bencho.dev/blocks/palette, https://bencho.dev/blocks/time-scrubber y https://bencho.dev/blocks/upload-dropzone y https://bencho.dev/?c=generate. Adaptación en JavaScript sin React de sus interacciones públicas, geometría de regla, ecuación de resorte y timbres sintetizados. Estos bloques figuran como MIT en el catálogo público de Bencho. La zona de apertura muestra etapas reales de procesamiento local, sin simular una subida a un servidor.

Copyright de los componentes de referencia: Bencho y sus autores. Se aplica la licencia MIT a las partes adaptadas:

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

- Paquete de marca `lecturi-brand`: archivos proporcionados por el usuario, preservados en `public/brand/`. Su documentación se usa como referencia de los recursos; se mantiene Albert Sans según la petición del usuario.
# Editor de documentos

- PDF-Lib 1.17.1: https://github.com/Hopding/pdf-lib — licencia MIT; genera el PDF con fuentes incrustadas y texto seleccionable.
- @pdf-lib/fontkit 1.1.1: https://github.com/Hopding/fontkit — licencia MIT; mide y posiciona los glifos que utiliza Justif. Se conservan los avisos de licencia de las dependencias.


## Edición estructurada

Tiptap (core, StarterKit, TableKit, TextStyle, Markdown) y ProseMirror: licencias MIT. Gestionan selección, historial, atajos, Markdown, listas y tablas. La composición y el espaciado de la vista previa y del PDF siguen usando Justif. No se utiliza el paginador comercial de Tiptap.
