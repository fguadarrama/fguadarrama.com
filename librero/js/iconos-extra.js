// Iconos 3D de estado de lectura y de cada repisa (categoría).
// Mismo lenguaje que la calificación: volumen "de arcilla" brillante, luz
// desde arriba a la izquierda, reflejo difuminado, sombra de contacto.

import { sombra, reflejo, radial, lineal, destello, f } from './iconos.js';

const g = (...partes) => partes.join('');
const caja = (id, cima, izq, der, colores) => g(
  `<defs>${lineal(`${id}-c`, [[0, colores[0]], [1, colores[1]]])}${lineal(`${id}-i`, [[0, colores[2]], [1, colores[3]]], 0, 0, 0, 1)}${lineal(`${id}-d`, [[0, colores[4]], [1, colores[5]]], 0, 0, 1, 1)}</defs>`,
  `<polygon points="${izq}" fill="url(#${id}-i)" stroke="url(#${id}-i)" stroke-width="1.6" stroke-linejoin="round"/>`,
  `<polygon points="${der}" fill="url(#${id}-d)" stroke="url(#${id}-d)" stroke-width="1.6" stroke-linejoin="round"/>`,
  `<polygon points="${cima}" fill="url(#${id}-c)" stroke="url(#${id}-c)" stroke-width="1.6" stroke-linejoin="round"/>`
);
// Cubo isométrico centrado en (cx, cy) con lado s.
function cubo(id, cx, cy, s, colores) {
  const h = s * 0.5;
  const cima = `${cx},${cy - s} ${cx + s},${cy - h} ${cx},${cy} ${cx - s},${cy - h}`;
  const izq = `${cx - s},${cy - h} ${cx},${cy} ${cx},${cy + s} ${cx - s},${cy + s - h}`;
  const der = `${cx},${cy} ${cx + s},${cy - h} ${cx + s},${cy + s - h} ${cx},${cy + s}`;
  return caja(id, cima, izq, der, colores);
}

// ================================================================ ESTADOS
function porLeer() {
  return g(
    `<defs>${lineal('pl2-tapa', [[0, '#6E94FF'], [1, '#2443A8']])}${lineal('pl2-hoja', [[0, '#FFFFFF'], [1, '#EDE6D6']], 0, 0, 0, 1)}${lineal('pl2-hoja2', [[0, '#F7F1E4'], [1, '#DCD2BC']], 0, 0, 0, 1)}${lineal('pl2-cinta', [[0, '#FF6B7D'], [1, '#C8283F']], 0, 0, 0, 1)}</defs>`,
    sombra(32, 55, 22, 3),
    `<path d="M5,44 Q18,38 31,44 L33,44 Q46,38 59,44 L59,49 Q46,43 33,49 L31,49 Q18,43 5,49Z" fill="url(#pl2-tapa)"/>`,
    `<path d="M8,18 Q19,13 31,19 L31,45 Q19,39 8,44Z" fill="url(#pl2-hoja)"/>`,
    `<path d="M33,19 Q45,13 56,18 L56,44 Q45,39 33,45Z" fill="url(#pl2-hoja2)"/>`,
    `<path d="M31,19 L33,19 L33,45 L31,45Z" fill="#CBBFA4"/>`,
    `<g stroke="#C9BDA3" stroke-width="1" stroke-linecap="round" opacity=".8"><path d="M12,24 Q19,21 27,24 M12,29 Q19,26 27,29 M12,34 Q19,31 25,34"/><path d="M37,24 Q44,21 52,24 M37,29 Q44,26 52,29 M39,34 Q45,31 52,34"/></g>`,
    `<path d="M45,16 L45,33 L48,30 L51,33 L51,15Z" fill="url(#pl2-cinta)"/>`,
    reflejo(16, 20, 5, 1.6, -20, 0.8),
    destello(54, 8, 3.4, '#FFD45A')
  );
}

function leido() {
  return g(
    `<defs>${lineal('le-tapa', [[0, '#5FE0A5'], [1, '#0E7A50']])}${lineal('le-lomo', [[0, '#0F8A58'], [1, '#085234']], 0, 0, 1, 0)}${lineal('le-hojas', [[0, '#FFFFFF'], [1, '#E6DECB']], 0, 0, 1, 0)}${radial('le-sello', [[0, '#FFFFFF'], [0.15, '#7DE8B5'], [1, '#0B7A4F']], { cx: '35%', cy: '30%' })}</defs>`,
    sombra(30, 56, 20, 3),
    `<path d="M16,14 L46,10 L50,13 L50,50 L20,54 L16,51Z" fill="url(#le-hojas)"/>`,
    `<g stroke="#D8CFB9" stroke-width=".7"><path d="M47,14 L47,50 M48.5,13.5 L48.5,50"/></g>`,
    `<path d="M13,13 L44,9 C45,9 46,10 46,11 L46,48 C46,49 45,50 44,50 L15,54 C14,54 13,53 13,52Z" fill="url(#le-tapa)"/>`,
    `<path d="M13,13 L18,12.4 L18,53.4 L15,54 C14,54 13,53 13,52Z" fill="url(#le-lomo)"/>`,
    `<path d="M23,20 L39,18 M23,25 L36,23.3" stroke="#BDF5D9" stroke-width="2" stroke-linecap="round" opacity=".8"/>`,
    reflejo(28, 15, 8, 1.6, -8, 0.6),
    `<circle cx="46" cy="44" r="11" fill="url(#le-sello)"/>`,
    `<path d="M40.5,44.2 L44.6,48.2 L51.6,40.4" fill="none" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`
  );
}

function descartado() {
  return g(
    `<defs>${lineal('de-cuerpo', [[0, '#E7ECF3'], [0.5, '#AEB8C7'], [1, '#77839A']], 0, 0, 1, 0)}${lineal('de-tapa', [[0, '#F4F7FB'], [1, '#9BA6B8']], 0, 0, 0, 1)}${radial('de-papel', [[0, '#FFFFFF'], [1, '#D9DDE6']])}</defs>`,
    sombra(32, 57, 15, 2.6),
    `<path d="M17,22 L47,22 L43.5,53 C43.3,54.6 42,55.5 40.5,55.5 L23.5,55.5 C22,55.5 20.7,54.6 20.5,53Z" fill="url(#de-cuerpo)"/>`,
    `<g stroke="#7D889B" stroke-width="1.6" stroke-linecap="round" opacity=".6"><path d="M25,28 L26,50 M32,28 L32,50 M39,28 L38,50"/></g>`,
    `<g stroke="#FFFFFF" stroke-width="1" stroke-linecap="round" opacity=".7"><path d="M24,28 L25,50 M31,28 L31,50"/></g>`,
    `<circle cx="27" cy="17" r="6" fill="url(#de-papel)"/><path d="M23,15 L28,18 L25,20 M29,13 L31,17" stroke="#BCC3D0" stroke-width=".9" fill="none"/>`,
    `<path d="M13,19 L51,19 C52.5,19 53,20 53,21 L53,22.5 L11,22.5 L11,21 C11,20 11.5,19 13,19Z" fill="url(#de-tapa)" transform="rotate(-8 32 21)"/>`,
    `<path d="M27,15.5 L37,14 C38,14 38.5,15 38.4,15.8 L38.2,17" fill="none" stroke="#8A95A8" stroke-width="2.2" stroke-linecap="round" transform="rotate(-8 32 21)"/>`,
    reflejo(22, 34, 1.6, 8, 0, 0.7)
  );
}

function sinEstado() {
  return g(
    `<defs>${lineal('se-cinta', [[0, '#F1F3F7'], [1, '#B4BCCA']])}</defs>`,
    sombra(32, 56, 12, 2.4),
    `<path d="M20,8 C20,6.5 21,6 22.5,6 L41.5,6 C43,6 44,6.5 44,8 L44,52 L32,42 L20,52Z" fill="url(#se-cinta)"/>`,
    `<path d="M32,18 L32,32 M25,25 L39,25" stroke="#7D879A" stroke-width="3.2" stroke-linecap="round"/>`,
    reflejo(25, 14, 1.6, 6, 0, 0.8)
  );
}

// ================================================================ REPISAS
const R = {};

R['ciencia-ficcion'] = () => g(
  `<defs>${lineal('cf-cuerpo', [[0, '#FFFFFF'], [0.6, '#DCE3EE'], [1, '#9AA7BC']], 0, 0, 1, 0)}${lineal('cf-rojo', [[0, '#FF7B7B'], [1, '#C42A3E']])}${radial('cf-ventana', [[0, '#C6E4FF'], [0.5, '#4B8DF0'], [1, '#1D3E9A']])}${lineal('cf-fuego', [[0, '#FFF3B0'], [0.5, '#FFB13B'], [1, '#FF5E2E', 0]], 0, 0, 0, 1)}</defs>`,
  sombra(32, 58, 12, 2.4),
  `<g transform="rotate(32 32 30)">`,
  `<path d="M27,44 Q32,64 37,44Z" fill="url(#cf-fuego)" filter="url(#ic-f1)"/>`,
  `<path d="M23,32 L13,46 L23,43Z" fill="url(#cf-rojo)"/><path d="M41,32 L51,46 L41,43Z" fill="url(#cf-rojo)"/>`,
  `<path d="M32,5 C40,13 42,26 41,42 L23,42 C22,26 24,13 32,5Z" fill="url(#cf-cuerpo)"/>`,
  `<path d="M32,5 C36,9 38.5,13 39.8,18 L24.2,18 C25.5,13 28,9 32,5Z" fill="url(#cf-rojo)"/>`,
  `<circle cx="32" cy="27" r="5.6" fill="#8D9AB2"/><circle cx="32" cy="27" r="4.4" fill="url(#cf-ventana)"/>`,
  `<rect x="25" y="42" width="14" height="4" rx="1.5" fill="#7C879B"/>`,
  `<path d="M28,48 L32,44 L36,48" fill="none"/>`,
  reflejo(28, 30, 1.6, 7, 0, 0.8),
  `</g>`,
  destello(10, 12, 3, '#FFD45A'), destello(55, 50, 2.4, '#9EC2FF')
);

R.fantasia = () => g(
  `<defs>${lineal('fa-cono', [[0, '#B79BFF'], [0.5, '#6B47E0'], [1, '#3A2192']])}${lineal('fa-ala', [[0, '#8C6DF5'], [1, '#33207F']], 0, 0, 0, 1)}${lineal('fa-banda', [[0, '#FFE58A'], [1, '#F2A81D']], 0, 0, 1, 0)}</defs>`,
  sombra(32, 56, 22, 3),
  `<ellipse cx="32" cy="47" rx="25" ry="7.5" fill="url(#fa-ala)"/>`,
  `<path d="M18,46 C24,32 27,20 33,9 C35,5 40,3 45,6 C41,6 38,9 37.5,13 C38,24 42,36 46,46 C38,50 26,50 18,46Z" fill="url(#fa-cono)"/>`,
  `<path d="M19.5,42.5 C27,46 37,46 44.6,42.5 L46,46 C38,50 26,50 18,46Z" fill="url(#fa-banda)"/>`,
  destello(30, 27, 3.4, '#FFE58A'), destello(38, 34, 2.2, '#FFFFFF'), destello(27, 37, 1.8, '#FFE58A'),
  reflejo(27, 22, 1.8, 7, 20, 0.5),
  destello(52, 14, 3, '#FFD45A')
);

R.narrativa = () => g(
  `<defs>${radial('na-frasco', [[0, '#7D8FC4'], [0.5, '#2E3B6B'], [1, '#141B36']], { cx: '35%', cy: '30%' })}${lineal('na-pluma', [[0, '#FFFFFF'], [1, '#E7DCC6']])}${lineal('na-cuello', [[0, '#D9DEE8'], [1, '#8C96A8']], 0, 0, 1, 0)}</defs>`,
  sombra(30, 57, 16, 2.6),
  `<path d="M30,44 C35,30 43,15 54,5 C53,18 46,31 34,43Z" fill="url(#na-pluma)"/>`,
  `<path d="M31.5,43 C38,30 45,18 53,7" fill="none" stroke="#C9BDA3" stroke-width="1"/>`,
  `<g stroke="#D8CDB6" stroke-width=".8"><path d="M40,30 L46,27 M43,24 L49,21 M37,36 L42,34"/></g>`,
  `<rect x="22" y="30" width="16" height="6" rx="2" fill="url(#na-cuello)"/>`,
  `<path d="M14,40 C14,36 17,34 21,34 L39,34 C43,34 46,36 46,40 L46,50 C46,54 43,56 39,56 L21,56 C17,56 14,54 14,50Z" fill="url(#na-frasco)"/>`,
  `<rect x="18" y="42" width="24" height="7" rx="1.5" fill="#F3E9D2"/><path d="M21,45.5 L39,45.5" stroke="#B9A985" stroke-width="1"/>`,
  reflejo(19, 39, 2, 1.2, 0, 0.8)
);

R.negra = () => g(
  `<defs>${lineal('ng-aro', [[0, '#FFE6A0'], [0.5, '#E4AE45'], [1, '#9C6A1C']])}${radial('ng-vidrio', [[0, '#FFFFFF', 0.9], [0.5, '#BFE0FF', 0.55], [1, '#6FA7E8', 0.45]], { cx: '35%', cy: '30%' })}${lineal('ng-mango', [[0, '#8B5634'], [1, '#3A1E10']], 0, 0, 1, 1)}</defs>`,
  sombra(34, 57, 20, 3),
  `<path d="M38.5,38.5 L52,52" stroke="url(#ng-mango)" stroke-width="8.5" stroke-linecap="round"/>`,
  `<path d="M37,37 L41,41" stroke="#C8962F" stroke-width="9" stroke-linecap="butt"/>`,
  `<circle cx="27" cy="27" r="16" fill="url(#ng-vidrio)" stroke="url(#ng-aro)" stroke-width="5"/>`,
  `<path d="M18,22 C20,17 24,15 28,14.5" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" opacity=".9"/>`,
  reflejo(22, 18, 4, 1.5, -40, 0.6)
);

R.thriller = () => g(
  `<defs>${lineal('th-cuerpo', [[0, '#5D6578'], [1, '#1B1F29']], 0, 0, 1, 1)}${radial('th-lente', [[0, '#C9E4FF'], [0.4, '#4D86E8'], [1, '#13265E']], { cx: '35%', cy: '30%' })}</defs>`,
  sombra(32, 57, 22, 3),
  `<rect x="10" y="16" width="18" height="34" rx="8" fill="url(#th-cuerpo)"/><rect x="36" y="16" width="18" height="34" rx="8" fill="url(#th-cuerpo)"/>`,
  `<rect x="26" y="24" width="12" height="12" rx="3" fill="#2B303C"/>`,
  `<rect x="13" y="10" width="12" height="9" rx="3" fill="#3A404E"/><rect x="39" y="10" width="12" height="9" rx="3" fill="#3A404E"/>`,
  `<circle cx="19" cy="42" r="7.2" fill="url(#th-lente)"/><circle cx="45" cy="42" r="7.2" fill="url(#th-lente)"/>`,
  `<circle cx="17" cy="40" r="2" fill="#FFFFFF" opacity=".85"/><circle cx="43" cy="40" r="2" fill="#FFFFFF" opacity=".85"/>`,
  reflejo(14, 26, 1.4, 6, 0, 0.45), reflejo(40, 26, 1.4, 6, 0, 0.45)
);

R.terror = () => g(
  `<defs>${radial('te-piel', [[0, '#D4F2A6'], [0.45, '#86C35A'], [1, '#3F7A2C']], { cx: '35%', cy: '30%', r: '85%' })}${lineal('te-pelo', [[0, '#4A4B63'], [1, '#17171F']], 0, 0, 0, 1)}${lineal('te-cuello', [[0, '#6FA548'], [1, '#3B6A28']], 0, 0, 0, 1)}${lineal('te-perno', [[0, '#F2F4F7'], [1, '#8C95A5']], 0, 0, 0, 1)}</defs>`,
  sombra(32, 59, 15, 2.4),
  `<rect x="23" y="42" width="18" height="12" rx="3" fill="url(#te-cuello)"/>`,
  `<rect x="12" y="45" width="11" height="5" rx="2.5" fill="url(#te-perno)"/><rect x="41" y="45" width="11" height="5" rx="2.5" fill="url(#te-perno)"/>`,
  `<rect x="14" y="12" width="36" height="35" rx="8" fill="url(#te-piel)"/>`,
  `<path d="M13,21 L13,12 C13,8 16,6 20,6 L44,6 C48,6 51,8 51,12 L51,21 L47,17.5 L43,21.5 L39,17.5 L35,21.5 L31,17.5 L27,21.5 L23,17.5 L19,21.5 L16,18Z" fill="url(#te-pelo)"/>`,
  `<path d="M19,26 L29,27.5 M35,27.5 L45,26" stroke="#1E2A16" stroke-width="2.6" stroke-linecap="round"/>`,
  `<ellipse cx="25" cy="31.5" rx="4" ry="3.2" fill="#FFFFFF"/><ellipse cx="39" cy="31.5" rx="4" ry="3.2" fill="#FFFFFF"/>`,
  `<circle cx="25.6" cy="32" r="1.9" fill="#1E2A16"/><circle cx="39.6" cy="32" r="1.9" fill="#1E2A16"/>`,
  `<path d="M22,40.5 L42,40.5" stroke="#1E2A16" stroke-width="2" stroke-linecap="round"/>`,
  `<path d="M25,38.5 L25,42.5 M29,38.5 L29,42.5 M33,38.5 L33,42.5 M37,38.5 L37,42.5" stroke="#1E2A16" stroke-width="1.2" stroke-linecap="round"/>`,
  `<path d="M40,35 L47,40.5" stroke="#2C3B1E" stroke-width="1.3" stroke-linecap="round"/><path d="M41.2,38.6 L43.6,35.8 M43.8,40.6 L46.2,37.8" stroke="#2C3B1E" stroke-width="1" stroke-linecap="round"/>`,
  reflejo(21, 16, 4, 1.6, -30, 0.55)
);

R.cuento = () => g(
  `<defs>${lineal('cu-claro', [[0, '#FFFFFF'], [1, '#E3E9F4']])}${lineal('cu-sombra', [[0, '#D3DBE9'], [1, '#A6B3CB']])}${radial('cu-agua', [[0, '#9ED2FF', 0.8], [1, '#4C8DF0', 0]], { cx: '50%', cy: '50%', r: '50%' })}</defs>`,
  `<ellipse cx="32" cy="52" rx="28" ry="6" fill="url(#cu-agua)"/>`,
  `<path d="M8,38 L56,38 L47,50 L17,50Z" fill="url(#cu-sombra)"/>`,
  `<path d="M8,38 L32,38 L23,50 L17,50Z" fill="url(#cu-claro)"/>`,
  `<path d="M32,10 L32,38 L14,38Z" fill="url(#cu-claro)"/>`,
  `<path d="M32,10 L50,38 L32,38Z" fill="url(#cu-sombra)"/>`,
  `<path d="M32,10 L32,38" stroke="#B5C1D6" stroke-width=".8"/>`,
  reflejo(24, 28, 1.4, 6, 30, 0.8),
  destello(52, 14, 3, '#FFD45A')
);

R.poesia = () => g(
  `<defs>${radial('po-mascara', [[0, '#FFF2B5'], [0.45, '#F6C450'], [1, '#B9771E']], { cx: '38%', cy: '28%', r: '80%' })}${lineal('po-cinta', [[0, '#FF6B7D'], [1, '#B81F3C']])}</defs>`,
  sombra(32, 57, 15, 2.6),
  `<path d="M46,30 C52,32 56,40 58,46 C54,42 50,40 46,40Z" fill="url(#po-cinta)"/>`,
  `<path d="M14,13 C24,8 40,8 50,13 C52,30 45,47 32,52 C19,47 12,30 14,13Z" fill="url(#po-mascara)"/>`,
  `<path d="M19,24 Q24,18 29,24 Q24,22 19,24Z" fill="#5A3A12"/><path d="M35,24 Q40,18 45,24 Q40,22 35,24Z" fill="#5A3A12"/>`,
  `<path d="M21,34 Q32,46 43,34 Q32,40 21,34Z" fill="#5A3A12"/>`,
  `<path d="M19,15 L22,19 M45,15 L42,19" stroke="#E2A83A" stroke-width="1.4" stroke-linecap="round"/>`,
  reflejo(21, 17, 4, 1.8, -25, 0.85)
);

R.ensayo = () => g(
  `<defs>${radial('en-foco', [[0, '#FFFDE8'], [0.45, '#FFE27A'], [1, '#F2A92E']], { cx: '38%', cy: '32%' })}${radial('en-aura', [[0, '#FFE27A', 0.55], [1, '#FFE27A', 0]], { cx: '50%', cy: '50%', r: '50%' })}${lineal('en-rosca', [[0, '#EEF1F5'], [1, '#8B95A5']], 0, 0, 1, 0)}</defs>`,
  sombra(32, 58, 9, 2),
  `<circle cx="32" cy="24" r="23" fill="url(#en-aura)"/>`,
  `<path d="M32,6 C42,6 49,13 49,23 C49,30 45,34 42,38 C40.5,40 40,42 40,44 L24,44 C24,42 23.5,40 22,38 C19,34 15,30 15,23 C15,13 22,6 32,6Z" fill="url(#en-foco)"/>`,
  `<path d="M27,40 L27,30 Q32,24 37,30 L37,40" fill="none" stroke="#D27A12" stroke-width="1.6" stroke-linecap="round"/>`,
  `<rect x="24" y="44" width="16" height="3.6" rx="1.6" fill="url(#en-rosca)"/><rect x="25" y="48" width="14" height="3.6" rx="1.6" fill="url(#en-rosca)"/><path d="M28,52 L36,52 L34,55 L30,55Z" fill="#6E7788"/>`,
  reflejo(25, 14, 4, 2.2, -35, 0.9)
);

R.divulgacion = () => g(
  `<defs>${lineal('di-liquido', [[0, '#8DFFD2'], [0.5, '#19C292'], [1, '#0A7A62']])}${lineal('di-vidrio', [[0, '#FFFFFF', 0.85], [1, '#CFE6F5', 0.6]])}</defs>`,
  sombra(32, 57, 18, 2.8),
  `<path d="M26,7 L38,7 L38,22 L51,47 C53,52 50,55 46,55 L18,55 C14,55 11,52 13,47 L26,22Z" fill="url(#di-vidrio)"/>`,
  `<path d="M19,36 C25,33 39,39 45,36 L51,47 C53,52 50,55 46,55 L18,55 C14,55 11,52 13,47Z" fill="url(#di-liquido)"/>`,
  `<path d="M26,7 L38,7 L38,22 L51,47 C53,52 50,55 46,55 L18,55 C14,55 11,52 13,47 L26,22Z" fill="none" stroke="#A9CCE2" stroke-width="1.4"/>`,
  `<rect x="24" y="5" width="16" height="4" rx="2" fill="#E6F2FA"/>`,
  `<circle cx="27" cy="46" r="2.2" fill="#FFFFFF" opacity=".7"/><circle cx="35" cy="42" r="1.5" fill="#FFFFFF" opacity=".7"/><circle cx="39" cy="49" r="1.2" fill="#FFFFFF" opacity=".7"/>`,
  `<circle cx="32" cy="28" r="1.8" fill="#9BF0D0"/><circle cx="35" cy="19" r="1.3" fill="#9BF0D0"/>`,
  reflejo(22, 42, 1.4, 5, 30, 0.85)
);

R.historia = () => g(
  `<defs>${lineal('hi-madera', [[0, '#C98A55'], [1, '#6E3E1E']], 0, 0, 0, 1)}${lineal('hi-arena', [[0, '#FFE3A1'], [1, '#E3A447']], 0, 0, 0, 1)}${lineal('hi-vidrio', [[0, '#FFFFFF', 0.8], [1, '#D7E7F3', 0.55]])}</defs>`,
  sombra(32, 58, 17, 2.6),
  `<path d="M20,11 L44,11 C44,22 36,27 34,32 C36,37 44,42 44,53 L20,53 C20,42 28,37 30,32 C28,27 20,22 20,11Z" fill="url(#hi-vidrio)"/>`,
  `<path d="M22.5,15 L41.5,15 C40.5,21 35,24 33,29 L31,29 C29,24 23.5,21 22.5,15Z" fill="url(#hi-arena)" opacity=".55"/>`,
  `<path d="M31.2,30 L32.8,30 L32.8,44 L31.2,44Z" fill="url(#hi-arena)"/>`,
  `<path d="M21.5,51 C22,45 27,42 32,41 C37,42 42,45 42.5,51Z" fill="url(#hi-arena)"/>`,
  `<rect x="15" y="6" width="34" height="6" rx="2.5" fill="url(#hi-madera)"/><rect x="15" y="52" width="34" height="6" rx="2.5" fill="url(#hi-madera)"/>`,
  `<rect x="17" y="12" width="3" height="40" rx="1.2" fill="url(#hi-madera)"/><rect x="44" y="12" width="3" height="40" rx="1.2" fill="url(#hi-madera)"/>`,
  reflejo(25, 20, 1.2, 5, 25, 0.8)
);

R.politica = () => g(
  cubo('po2', 32, 34, 18, ['#FFFFFF', '#E3E9F4', '#DCE4F2', '#AAB8D2', '#B3C1DA', '#7F90B2']),
  sombra(32, 57, 20, 2.6),
  `<path d="M25,24 L39,24 L39,26.5 L25,26.5Z" fill="#2A3552" transform="skewY(-3)"/>`,
  `<path d="M26,6 L39,8 L37,25 L24,23Z" fill="#FFFFFF"/><path d="M28,13 L31,17 L36,11" fill="none" stroke="#E2384F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  `<path d="M18,40 L29,45.5 L29,49.5 L18,44Z" fill="#3E63D8"/><path d="M35,45.5 L46,40 L46,44 L35,49.5Z" fill="#2C4BB0"/>`
);

R.memorias = () => g(
  `<defs>${lineal('me-marco', [[0, '#FFFFFF'], [1, '#E2E5EC']])}${lineal('me-cielo', [[0, '#FFB37A'], [0.6, '#FF7FA0'], [1, '#9A6BFF']], 0, 0, 0, 1)}${lineal('me-cielo2', [[0, '#8FD0FF'], [1, '#4A8DE8']], 0, 0, 0, 1)}</defs>`,
  sombra(33, 57, 21, 3),
  `<g transform="rotate(-12 26 32)"><rect x="9" y="12" width="32" height="38" rx="2.5" fill="url(#me-marco)"/><rect x="12" y="15" width="26" height="25" fill="url(#me-cielo2)"/><path d="M12,34 Q20,27 28,33 Q33,29 38,33 L38,40 L12,40Z" fill="#2FA36B"/></g>`,
  `<g transform="rotate(10 38 32)"><rect x="24" y="12" width="32" height="38" rx="2.5" fill="url(#me-marco)"/><rect x="27" y="15" width="26" height="25" fill="url(#me-cielo)"/><circle cx="40" cy="30" r="5" fill="#FFE27A"/><path d="M27,36 Q34,31 41,36 Q47,32 53,35 L53,40 L27,40Z" fill="#3B2A63"/></g>`,
  reflejo(34, 20, 4, 1.6, 10, 0.5)
);

R.escritura = () => g(
  `<defs>${lineal('es2-cuerpo', [[0, '#FFE680'], [0.5, '#FFC72C'], [1, '#E08E0B']], 0, 0, 0, 1)}${lineal('es2-metal', [[0, '#F3F5F8'], [1, '#9AA3B2']], 0, 0, 0, 1)}</defs>`,
  sombra(32, 56, 22, 2.6),
  `<g transform="rotate(-38 32 32)">`,
  `<rect x="10" y="26" width="36" height="12" rx="1.5" fill="url(#es2-cuerpo)"/>`,
  `<path d="M10,30 L46,30" stroke="#FFF1B0" stroke-width="1.2"/><path d="M10,34.5 L46,34.5" stroke="#D88A0B" stroke-width="1"/>`,
  `<path d="M46,26 L57,32 L46,38Z" fill="#F2D2A6"/><path d="M53.3,30 L57,32 L53.3,34Z" fill="#3A3F4B"/>`,
  `<rect x="4" y="26" width="7" height="12" fill="url(#es2-metal)"/>`,
  `<path d="M4,26 L4,38 C0,38 -1,35 -1,32 C-1,29 0,26 4,26Z" fill="#FF8FA6"/>`,
  reflejo(28, 28.5, 12, 1, 0, 0.7),
  `</g>`
);

R.medicina = () => g(
  `<defs>${lineal('md-rojo', [[0, '#FF8A8A'], [1, '#C8283F']], 0, 0, 0, 1)}${lineal('md-blanco', [[0, '#FFFFFF'], [1, '#CDD4E0']], 0, 0, 0, 1)}${radial('md-tableta', [[0, '#FFFFFF'], [1, '#C9D2E0']])}</defs>`,
  sombra(32, 56, 22, 3),
  `<g transform="rotate(-35 30 30)"><path d="M30,20 L30,40 L18,40 C12.5,40 8,35.5 8,30 C8,24.5 12.5,20 18,20Z" fill="url(#md-rojo)"/><path d="M30,20 L42,20 C47.5,20 52,24.5 52,30 C52,35.5 47.5,40 42,40 L30,40Z" fill="url(#md-blanco)"/>${reflejo(20, 24, 7, 1.5, 0, 0.85)}${reflejo(42, 24, 6, 1.4, 0, 0.9)}</g>`,
  `<ellipse cx="48" cy="47" rx="8" ry="5" fill="#AAB4C4"/><ellipse cx="48" cy="45.5" rx="8" ry="5" fill="url(#md-tableta)"/><path d="M42,45.5 L54,45.5" stroke="#B1BBCB" stroke-width="1.1"/>`
);

R.artes = () => g(
  `<defs>${radial('ar-paleta', [[0, '#FFE2B8'], [0.6, '#E6A867'], [1, '#B47436']], { cx: '35%', cy: '30%' })}${lineal('ar-mango', [[0, '#5B7BEA'], [1, '#1E3A8A']])}</defs>`,
  sombra(32, 57, 23, 3),
  `<path d="M32,10 C47,10 58,19 58,31 C58,40 51,44 45,42 C40,40.5 37,43 38,47 C39,51 36,54 31,54 C17,54 6,44 6,31 C6,19 17,10 32,10Z" fill="url(#ar-paleta)"/>`,
  `<ellipse cx="42" cy="34" rx="4.4" ry="3.6" fill="#8A5326" opacity=".35"/>`,
  ...[[20, 22, '#E53B52'], [31, 18, '#FFC531'], [42, 21, '#2F9E64'], [16, 34, '#3D63D8'], [24, 44, '#9B5CF0']].map(([x, y, c]) =>
    `<circle cx="${x}" cy="${y}" r="4.6" fill="${c}"/><circle cx="${x - 1.4}" cy="${y - 1.5}" r="1.4" fill="#FFFFFF" opacity=".7"/>`),
  `<path d="M36,46 L56,8" stroke="url(#ar-mango)" stroke-width="3.6" stroke-linecap="round"/><path d="M33,52 C32,49 34,46 36,45.4 L38.2,46.6 C38.6,49 36,52 33,52Z" fill="#E53B52"/>`
);

R.cocina = () => g(
  `<defs>${lineal('co-trago', [[0, '#FFB5C2'], [1, '#E2476A']], 0, 0, 0, 1)}${lineal('co-vidrio', [[0, '#FFFFFF', 0.9], [1, '#D4E4F2', 0.6]])}${radial('co-aceituna', [[0, '#C9EB7A'], [1, '#4E8A1F']])}</defs>`,
  sombra(32, 58, 14, 2.4),
  `<path d="M10,12 L54,12 L32,36Z" fill="url(#co-vidrio)"/>`,
  `<path d="M15,17.5 L49,17.5 L32,36Z" fill="url(#co-trago)"/>`,
  `<path d="M10,12 L54,12" stroke="#E9F2FA" stroke-width="2.4" stroke-linecap="round"/>`,
  `<rect x="30.8" y="35" width="2.4" height="17" fill="#D9E6F2"/><ellipse cx="32" cy="53" rx="11" ry="3" fill="#E4EEF7"/>`,
  `<path d="M42,4 L28,30" stroke="#B7864F" stroke-width="1.4" stroke-linecap="round"/>`,
  `<ellipse cx="36" cy="19" rx="4.6" ry="4" fill="url(#co-aceituna)"/><circle cx="37.5" cy="18" r="1.4" fill="#E53B52"/>`,
  reflejo(20, 15, 4, 1, 0, 0.8)
);

R.infantil = () => g(
  `<defs>${radial('ni-piel', [[0, '#FFE9D2'], [0.55, '#F7BE93'], [1, '#D58E62']], { cx: '38%', cy: '32%', r: '80%' })}${lineal('ni-camisa', [[0, '#7FB2FF'], [1, '#2F5FD0']], 0, 0, 0, 1)}${lineal('ni-pelo', [[0, '#9A5B2E'], [1, '#4E2A12']], 0, 0, 0, 1)}${radial('ni-globo', [[0, '#FF9AA8'], [0.6, '#E5465C'], [1, '#A51F35']], { cx: '35%', cy: '30%' })}</defs>`,
  sombra(30, 59, 18, 2.6),
  `<path d="M51,8 C51,15 49,22 47,30" fill="none" stroke="#B6BCC8" stroke-width="1"/>`,
  `<ellipse cx="51" cy="10" rx="7" ry="8.4" fill="url(#ni-globo)"/><path d="M50,18 L52,18 L51,20Z" fill="#A51F35"/>`,
  reflejo(48.5, 7, 1.8, 2.6, -20, 0.8),
  `<path d="M8,60 C8,47 17,42 30,42 C43,42 52,47 52,60Z" fill="url(#ni-camisa)"/>`,
  `<path d="M23,42.6 L30,49 L37,42.6 C35,42 33,41.8 30,41.8 C27,41.8 25,42 23,42.6Z" fill="#FFFFFF"/>`,
  `<rect x="26.5" y="37" width="7" height="7" rx="2" fill="#E9A57A"/>`,
  `<circle cx="15.6" cy="27" r="3.4" fill="#F2B48A"/><circle cx="44.4" cy="27" r="3.4" fill="#F2B48A"/>`,
  `<circle cx="30" cy="26" r="14.5" fill="url(#ni-piel)"/>`,
  `<path d="M15.5,25 C15.5,15 21.5,10 30,10 C39,10 44.6,15 44.6,24 C41,19.5 36,18.4 31.5,20.6 C28,17.6 21.5,18.4 15.5,25Z" fill="url(#ni-pelo)"/>`,
  `<path d="M29,11 C29.5,5.5 34.5,4 37,6.5 C34,6.6 32.4,8.4 31.6,11Z" fill="url(#ni-pelo)"/>`,
  `<ellipse cx="24.6" cy="27.4" rx="2" ry="2.5" fill="#2B2033"/><ellipse cx="35.4" cy="27.4" rx="2" ry="2.5" fill="#2B2033"/>`,
  `<circle cx="25.2" cy="26.5" r=".8" fill="#FFFFFF"/><circle cx="36" cy="26.5" r=".8" fill="#FFFFFF"/>`,
  `<ellipse cx="20.6" cy="32" rx="3" ry="1.8" fill="#FF8FA6" opacity=".55"/><ellipse cx="39.4" cy="32" rx="3" ry="1.8" fill="#FF8FA6" opacity=".55"/>`,
  `<path d="M25.6,33.6 Q30,38 34.4,33.6 Q30,35.2 25.6,33.6Z" fill="#9C3A3A"/>`,
  reflejo(23, 18, 4, 1.8, -30, 0.6)
);

R.comic = () => {
  const p = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? 17 : 26;
    p.push(`${f(32 + Math.cos(a) * r)},${f(30 + Math.sin(a) * r * 0.82)}`);
  }
  return g(
    `<defs>${radial('cm-explosion', [[0, '#FFF6B0'], [0.5, '#FFD12E'], [1, '#F08A0C']], { cx: '40%', cy: '35%' })}</defs>`,
    sombra(32, 57, 18, 2.6),
    `<polygon points="${p.join(' ')}" fill="#E53B52" transform="translate(1.5 2)"/>`,
    `<polygon points="${p.join(' ')}" fill="url(#cm-explosion)" stroke="url(#cm-explosion)" stroke-width="1.5" stroke-linejoin="round"/>`,
    `<text x="32" y="36" text-anchor="middle" font-family="Albert Sans, sans-serif" font-weight="900" font-style="italic" font-size="15" fill="#D6233F" transform="rotate(-8 32 32)">POW!</text>`,
    reflejo(22, 18, 4, 1.6, -30, 0.8)
  );
};

R.juegos = () => {
  // Punto (u, v) ∈ [0,1]² sobre una cara del cubo isométrico.
  const cara = (cx, cy, s, nombre, u, v) => {
    const h = s * 0.5;
    const A = { cima: [cx - s, cy - h], izq: [cx - s, cy - h], der: [cx, cy] }[nombre];
    const U = { cima: [s, -h], izq: [s, h], der: [s, -h] }[nombre];
    const V = { cima: [s, h], izq: [0, s], der: [0, s] }[nombre];
    return [A[0] + U[0] * u + V[0] * v, A[1] + U[1] * u + V[1] * v];
  };
  const pip = (cx, cy, s, nombre, uv, c = '#2B2F45') => uv.map(([u, v]) => {
    const [x, y] = cara(cx, cy, s, nombre, u, v);
    return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(s * 0.11)}" ry="${f(s * (nombre === 'cima' ? 0.07 : 0.1))}" fill="${c}"/>`;
  }).join('');
  const blanco = ['#FFFFFF', '#E4E9F1', '#EDF1F6', '#B9C3D2', '#CAD2DE', '#97A3B6'];
  return g(
    sombra(32, 57, 23, 3),
    cubo('ju1', 21, 33, 13, blanco),
    pip(21, 33, 13, 'cima', [[0.5, 0.5]], '#E53B52'),
    pip(21, 33, 13, 'izq', [[0.28, 0.28], [0.72, 0.72]]),
    pip(21, 33, 13, 'der', [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]]),
    cubo('ju2', 44, 41, 11, blanco),
    pip(44, 41, 11, 'cima', [[0.28, 0.28], [0.72, 0.72], [0.28, 0.72], [0.72, 0.28]]),
    pip(44, 41, 11, 'izq', [[0.3, 0.3], [0.7, 0.7], [0.3, 0.7], [0.7, 0.3], [0.5, 0.5]]),
    pip(44, 41, 11, 'der', [[0.3, 0.25], [0.3, 0.5], [0.3, 0.75], [0.7, 0.25], [0.7, 0.5], [0.7, 0.75]])
  );
};

R['por-clasificar'] = () => g(
  cubo('pc', 32, 38, 17, ['#F6D7A6', '#E0B06C', '#E2B474', '#B48242', '#C59253', '#8C6129']),
  `<path d="M15,29.5 L32,38 L26,44 L9,35.5Z" fill="#D9A963"/><path d="M49,29.5 L32,38 L38,44 L55,35.5Z" fill="#C08B4A"/>`,
  sombra(32, 58, 18, 2.6),
  `<path d="M32,46 L32,55" stroke="#A8783D" stroke-width="2.4" opacity=".6"/>`,
  `<text x="32" y="25" text-anchor="middle" font-family="Albert Sans, sans-serif" font-weight="900" font-size="26" fill="#8C5CFF">?</text>`,
  destello(48, 10, 3, '#FFD45A'), destello(16, 14, 2.2, '#9C7BFF')
);

export const ESTADOS_ICONOS = { 'por-leer': porLeer, leido, descartado, 'sin-estado': sinEstado };
export const REPISAS_ICONOS = R;
