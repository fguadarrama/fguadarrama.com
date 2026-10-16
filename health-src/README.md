# Historial médico · fuente privada

Aplicación React/Vite para consultar laboratorios y composición corporal y generar reportes PDF. `health-src/` contiene el proyecto editable; `../health/` se reserva exclusivamente para el único archivo cifrado que se publica en `fguadarrama.com/health/`.

## Desarrollo local

Los siguientes archivos contienen datos privados y están excluidos de Git:

- `.env.local`: nombre, fecha de nacimiento y CURP.
- `lab_data.xlsx` y `src/data/lab-data.json`: resultados clínicos.
- `src/data/sources/`: fuentes clínicas reconciliadas.
- `src/data/weight-records.local.json`: peso y composición corporal.
- `src/data/parameter-layout.json`: selección y orden personales.

Los archivos `.env.example`, `weight-records.example.json` y `parameter-layout.example.json` documentan el formato sin contener datos reales.

Después de instalar dependencias:

```bash
npm run dev
npm run build
```

`npm run prebuild:data` normaliza las fuentes —incluido `Quest Diagnostics`— y regenera el JSON clínico local.

## Actualizar peso desde una captura Xiaomi

En macOS, con las herramientas de desarrollo de Apple instaladas, desde `health-src`:

```bash
npm run weight:import -- "/ruta/a/la/captura.jpg"
```

Reconoce localmente la pantalla completa en inglés de composición corporal,
sin subir la imagen a ningún servicio. Presenta los valores y pide confirmación.
Si faltan cifras o la captura está comprimida, guarda un borrador JSON privado:
revísalo contra la imagen, corrige los campos y cambia `reviewed` a `true`.

```bash
npm run weight:import -- --review "/ruta/al/borrador.json" --apply --build
```

`--date AAAA-MM-DD --time HH:MM` permite confirmar la fecha/hora cuando no se lee.
La fecha de Xiaomi está en **mes/día/año**, no día/mes/año. No se infiere a partir
del nombre del archivo. El IMC de la báscula se conserva; el sitio calcula aparte
el IMC con la estatura fija. Se conservan los porcentajes reportados sin forzarlos
a sumar 100 %.

Se añade sólo esa lectura, con respaldo, validación de masas y bloqueo de
duplicados/conflictos. Los borradores y respaldos están excluidos de Git.
`--build` usa la contraseña local existente para reconstruir el archivo cifrado;
no modifica la contraseña, el Excel de laboratorios ni hace push automáticamente.
También puedes ejecutar el script con su ruta absoluta desde cualquier carpeta.

## Apariencia

El control junto al logotipo (y arriba a la derecha del login) permite elegir
Automático, Claro u Oscuro. Automático usa la hora local del dispositivo: oscuro
de 19:00 a 06:59; claro de 07:00 a 18:59. Se actualiza al volver a la pestaña y
cada 30 segundos. La elección se conserva localmente y se comparte entre el
login y la aplicación; no guarda ni modifica datos clínicos. Los PDFs conservan
su presentación clara. Pruebas: `node scripts/test-theme.mjs`.

## Release protegido para GitHub Pages

No se debe publicar `dist/`: contiene datos en texto legible. El único flujo autorizado es:

```bash
LABS_PASSWORD='una frase única de al menos 20 caracteres' npm run build:protected
```

Este comando:

1. genera un HTML autocontenido, sin assets clínicos independientes;
2. cifra el documento completo con AES-256-GCM;
3. deriva la clave mediante PBKDF2-HMAC-SHA-256 con 600,000 iteraciones;
4. verifica el descifrado localmente;
5. audita que no aparezcan datos personales conocidos en texto plano;
6. escribe solamente `../health/index.html`.

La contraseña nunca se guarda en el repositorio ni en el artefacto. Debe introducirse localmente y mantenerse fuera de esta conversación.

## Alcance de la privacidad

GitHub Pages entrega públicamente el texto cifrado. Sin un servidor no existe control de acceso, rate limiting ni recuperación de contraseña. La protección depende de usar una frase larga, única y no reutilizada; un atacante puede descargar el cifrado e intentar descifrarlo sin conexión.

Los registros añadidos desde la interfaz se guardan sólo en `localStorage` del navegador actual. No se transmiten a GitHub ni a otro servicio, pero permanecerán legibles para otras personas con acceso al mismo perfil del navegador.

## Validación antes del push

```bash
npm run lint
npm run build:protected
git status --short --ignored
git add -n health-src health
```

El push nunca debe incluir los archivos privados enumerados arriba ni un release generado con una contraseña temporal de pruebas.
