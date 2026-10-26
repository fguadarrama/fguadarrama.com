// Paquete estático para el subdirectorio lecturi/ del sitio existente.
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import JSZip from 'jszip';
const zip = new JSZip();
function add(dir, prefix) {
  for (const entry of readdirSync(dir, {withFileTypes:true})) {
    const source = join(dir, entry.name), target = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) add(source, target);
    else zip.file(target, readFileSync(source));
  }
}
add('dist','lecturi');
zip.file('lecturi/THIRD_PARTY.md',readFileSync('THIRD_PARTY.md'));
zip.file('PUBLICAR.txt','Copiar la carpeta lecturi de este ZIP a la raíz de fguadarrama/fguadarrama.com. Sustituye solo lecturi/. El código editable se conserva en el proyecto Lecturi. No subir node_modules.\n');
mkdirSync('deliverables',{recursive:true});
writeFileSync('deliverables/lecturi-sitio.zip', await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
console.log('Paquete listo: deliverables/lecturi-sitio.zip');
