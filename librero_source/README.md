# Librero — fuente de datos

Este directorio contiene los datos que consume `/librero/`.

## Cómo funciona

La página intenta enumerar dinámicamente los archivos `.json` que estén directamente en:

`librero_source/books/`

mediante la API pública de GitHub. Si GitHub limita o bloquea esa consulta, usa `manifest.json` como fallback.

Los archivos se cargan en orden alfabético. Esto permite mantener un archivo inicial grande y después hacer cambios con archivos pequeños, sin editar la importación original.

## Estados

- `wishlist` — por leer / pendiente
- `owned` — ya lo tengo
- `reading` — leyendo
- `read` — leído

## Añadir un libro

Crea, por ejemplo:

`librero_source/books/2026-10-03-nuevo-libro.json`

```json
{
  "id": "nuevo-libro-2026",
  "title": "Título",
  "author": "Autor",
  "genre": "Ciencia ficción",
  "format": "Pasta dura",
  "status": "wishlist",
  "pages": 384,
  "isbn": "9780000000000",
  "year": 2026,
  "cover": null,
  "notes": null
}
```

`pages`, `isbn`, `year`, `cover`, `genre`, `format` y `notes` son opcionales.

Si `cover` o `pages` faltan, el sitio intenta obtenerlos de Open Library de forma progresiva y los guarda sólo en el navegador (`localStorage`). Si quieres que un dato sea permanente y exacto, escríbelo en el JSON.

## Cambiar el estado de un libro existente

No edites el archivo semilla. Crea un parche con el mismo `id`.

Ejemplo:

`librero_source/books/2026-10-03-leidos.json`

```json
[
  {"id": "amazon-0014", "status": "read"},
  {"id": "amazon-0015", "status": "owned"}
]
```

Como este archivo se carga después de los archivos `000-seed-amazon-*`, sólo sustituye los campos indicados.

## Eliminar un libro

```json
{"id": "amazon-0014", "deleted": true}
```

## Importación inicial

`000-seed-amazon-01.json` a `000-seed-amazon-04.json` contienen los 668 registros importados de `Lista_Libros.xlsx`. Se preservó el orden original y todos se inicializaron como `wishlist`, porque el XLSX no incluía un campo que distinguiera libros propios, leídos o pendientes.

## `manifest.json`

Sólo es un fallback para cuando no se puede consultar la API de GitHub. Si se añaden archivos nuevos y se desea que también funcionen en ese escenario, añadir sus rutas al arreglo `files`.
