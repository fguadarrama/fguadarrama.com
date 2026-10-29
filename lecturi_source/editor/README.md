# Escribir · lecturi

Editor local: `/lecturi/editor/`. No publicar sin aprobación expresa del usuario.

La edición usa Tiptap/ProseMirror (MIT); la composición del documento sigue usando `justif/core` 0.9.2. Fontkit mide los glifos. Vista previa SVG y PDF comparten líneas, posiciones, tamaños y trazos vectoriales. El PDF incrusta las fuentes y conserva texto seleccionable, incluyendo variantes de glifos y caracteres españoles.

## Edición

- Space Grotesk, color base Ruri-iro `#1F3A8A` en el área editable.
- Coelacanth y Ysabeau para la composición y el PDF.
- Cmd/Ctrl+B: negrita; I: cursiva; U: subrayado rosa `#EB155C`.
- El tamaño de la barra actúa sobre la selección (8–72 pt); sin selección, sobre lo que se escriba después. La flecha de restablecer vuelve al tamaño base.
- Sangría: primera línea de párrafos, sin afectar listas, títulos o tablas.
- Listas numeradas y con viñetas: Enter continúa, doble Enter sale, Tab anida, Mayús+Tab desanida. La numeración y los márgenes colgantes se mantienen en el PDF.
- Tablas simples: elegir filas/columnas; Tab avanza y crea una fila al final, Mayús+Tab retrocede. La barra contextual añade o quita filas/columnas, alterna encabezado y elimina la tabla. Hasta 8 columnas; sin combinación de celdas ni tablas anidadas. Encabezados repetidos y filas altas divididas en el PDF.
- Markdown: atajos al escribir, reconocimiento al pegar y botón para editar el código completo. Incluye títulos, negritas, cursivas, listas y tablas. Markdown estándar no conserva colores ni tamaños personalizados al aplicar cambios; cerrar sin cambios conserva el documento visual intacto.

El borrador se guarda en JSON estructurado, versión 2. La migración conserva una copia del borrador anterior en `lecturi-editor-backup-v1`. El parámetro `?draft=qa` usa un borrador separado para pruebas, sin tocar el documento del usuario.

## Validación

`npm run test:editor` comprueba texto español, alineaciones, tamaños mixtos, subrayado, sangría, listas anidadas, tablas extensas y exportación PDF. `npm run build` construye el lector y el módulo de edición. Los PDF se verifican con Poppler y pypdf. No se utilizan capturas rasterizadas para generar el PDF.
