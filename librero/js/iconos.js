// Iconos 3D de la calificación celeste.
// Lenguaje visual: objetos "de arcilla" brillantes al estilo de los iconos
// 3D de Airbnb: volumen con sombreado suave, luz desde arriba a la izquierda,
// reflejo especular difuminado, sombra de contacto y sin contornos.
// Los iconos son la única parte del sitio con paleta libre.

export const f = (n) => Math.round(n * 100) / 100;

// Filtros compartidos (desenfoques para sombras, reflejos y brillos).
export const DEFS = `
  <filter id="ic-f1" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="0.9"/></filter>
  <filter id="ic-f2" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.8"/></filter>
  <filter id="ic-f3" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3"/></filter>`;

export const sombra = (cx, cy, rx, ry, color = '#1D2340', op = 0.2) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${color}" opacity="${op}" filter="url(#ic-f2)"/>`;

export const reflejo = (cx, cy, rx, ry, rot = -30, op = 0.75) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" fill="#FFFFFF" opacity="${op}" filter="url(#ic-f1)"/>`;

export const radial = (id, stops, { cx = '35%', cy = '30%', r = '75%', fx, fy } = {}) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"${fx ? ` fx="${fx}" fy="${fy}"` : ''}>${stops
    .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`)
    .join('')}</radialGradient>`;

export const lineal = (id, stops, x1 = 0, y1 = 0, x2 = 1, y2 = 1) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops
    .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`)
    .join('')}</linearGradient>`;

// Curva cerrada suave que pasa por los puntos (Catmull-Rom → Bézier).
export function curvaCerrada(p) {
  const n = p.length;
  let d = `M${f(p[0][0])},${f(p[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return d + 'Z';
}

// Cráter hundido: borde iluminado abajo a la derecha y fondo en sombra.
const crater = (id, cx, cy, rx, ry, borde) =>
  `<ellipse cx="${f(cx + rx * 0.14)}" cy="${f(cy + ry * 0.18)}" rx="${rx}" ry="${ry}" fill="${borde}" opacity=".9"/>
   <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${id})"/>`;

export function destello(cx, cy, r, color = '#FFFFFF', op = 1) {
  const k = r * 0.22;
  return `<path d="M${cx},${f(cy - r)}Q${f(cx + k)},${f(cy - k)} ${f(cx + r)},${cy}Q${f(cx + k)},${f(cy + k)} ${cx},${f(cy + r)}Q${f(cx - k)},${f(cy + k)} ${f(cx - r)},${cy}Q${f(cx - k)},${f(cy - k)} ${cx},${f(cy - r)}Z" fill="${color}" opacity="${op}"/>`;
}

// ------------------------------------------------------------------ satélite
function basura() {
  const defs = [
    lineal('sa-cima', [[0, '#FFF1B8'], [1, '#F2BE4E']]),
    lineal('sa-izq', [[0, '#F0B444'], [1, '#B97A1F']], 0, 0, 0, 1),
    lineal('sa-der', [[0, '#C98A27'], [1, '#7E4F12']], 0, 0, 1, 1),
    lineal('sa-panel', [[0, '#7FA6FF'], [0.45, '#3D63D8'], [1, '#1B2F7A']]),
    lineal('sa-metal', [[0, '#F3F5F8'], [1, '#9AA3B2']]),
    radial('sa-plato', [[0, '#FFFFFF'], [0.6, '#E6EAF0'], [1, '#A7B0BE']]),
    radial('sa-humo', [[0, '#C3C8D0'], [1, '#7F8794']], { cx: '40%', cy: '35%' }),
  ].join('');
  const cima = '29,22 40,28 29,34 18,28';
  const izq = '18,28 29,34 29,46 18,40';
  const der = '29,34 40,28 40,40 29,46';
  const panel = '2,36 15,30 15,40 2,46';
  const roto = '45,13 57,8 59.5,15.5 54.5,16.4 53,19.6 47.6,18.4';
  return `<defs>${defs}</defs>
    ${sombra(31, 57, 19, 3)}
    <g filter="url(#ic-f1)" opacity=".85">
      <circle cx="48" cy="25" r="4.2" fill="url(#sa-humo)"/><circle cx="52.5" cy="20.5" r="3.2" fill="url(#sa-humo)"/><circle cx="55.5" cy="27" r="2.6" fill="url(#sa-humo)"/>
    </g>
    <path d="M18,34 L14,35.5" stroke="url(#sa-metal)" stroke-width="2.2" stroke-linecap="round"/>
    <polygon points="${panel}" fill="url(#sa-panel)" stroke="#C9D4EA" stroke-width="1" stroke-linejoin="round"/>
    <path d="M6.3,34 L6.3,44 M10.6,32 L10.6,42 M2,41 L15,35" stroke="#A9C2FF" stroke-width=".7" opacity=".7"/>
    <polygon points="3,37 9,34 9,37 3,40" fill="#FFFFFF" opacity=".28"/>
    <polygon points="${izq}" fill="url(#sa-izq)" stroke="url(#sa-izq)" stroke-width="1.4" stroke-linejoin="round"/>
    <polygon points="${der}" fill="url(#sa-der)" stroke="url(#sa-der)" stroke-width="1.4" stroke-linejoin="round"/>
    <polygon points="${cima}" fill="url(#sa-cima)" stroke="url(#sa-cima)" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M21,31 L26,36 M23,38 L27,40" stroke="#FFE7A3" stroke-width=".8" opacity=".7" stroke-linecap="round"/>
    <ellipse cx="35" cy="38.5" rx="4.2" ry="3.4" fill="#2A1404" opacity=".7" filter="url(#ic-f1)"/><path d="M33,35 L35.5,38 L34,40 L36.5,43" fill="none" stroke="#2A1404" stroke-width=".9" stroke-linecap="round"/>
    <path d="M40,32 L43.5,30.5 L42.4,33 L45.4,32" fill="none" stroke="url(#sa-metal)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M29,22 L30.5,14 L35.5,11.5" fill="none" stroke="url(#sa-metal)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
    <ellipse cx="36" cy="10.6" rx="4.4" ry="2.6" transform="rotate(-28 36 10.6)" fill="url(#sa-plato)"/>
    <circle cx="36.4" cy="10.4" r=".9" fill="#E8573F"/>
    <polygon points="${roto}" fill="url(#sa-panel)" stroke="#C9D4EA" stroke-width="1" stroke-linejoin="round"/>
    <path d="M50.4,11.2 L53.2,18.4 M45.6,15.6 L58.2,11.4" stroke="#A9C2FF" stroke-width=".7" opacity=".7"/>
    ${destello(44.8, 29, 3.6, '#FFB347')}${destello(44.8, 29, 1.7, '#FFF4C2')}
    <polygon points="47,41 50,40 49,43" fill="#F2BE4E"/><polygon points="52,34 54.4,35 52.6,36.6" fill="#4C74E6"/>
    <polygon points="8,24 10.4,23 9.6,25.6" fill="#B9C2D0"/>
    ${reflejo(26, 26.5, 4, 1.6, 28, 0.85)}`;
}

// ------------------------------------------------------------------ asteroide
function rocaAsteroide() {
  const pts = [];
  const radios = [1, 0.86, 1.06, 0.93, 1.1, 0.88, 1.02, 0.9, 1.08, 0.95];
  radios.forEach((k, i) => {
    const a = (i / radios.length) * Math.PI * 2;
    const x = Math.cos(a) * 20 * k, y = Math.sin(a) * 15 * k;
    const g = -0.42;
    pts.push([33 + x * Math.cos(g) - y * Math.sin(g), 35 + x * Math.sin(g) + y * Math.cos(g)]);
  });
  return curvaCerrada(pts);
}

function asteroide() {
  const roca = rocaAsteroide();
  const defs = [
    radial('as-roca', [[0, '#E2D2C1'], [0.35, '#B79F8A'], [0.75, '#7B6352'], [1, '#4D3C31']], { cx: '34%', cy: '28%', r: '80%' }),
    radial('as-hueco', [[0, '#5E4A3D'], [0.7, '#86705F'], [1, '#A28B77']], { cx: '35%', cy: '30%' }),
    lineal('as-estela', [[0, '#FFC27A', 0], [1, '#FFB062', 0.85]], 1, 0, 0, 1),
  ].join('');
  return `<defs>${defs}</defs>
    ${sombra(33, 57, 18, 3)}
    <g opacity=".9" stroke-linecap="round">
      <path d="M62,5 L46,19" stroke="url(#as-estela)" stroke-width="3"/>
      <path d="M57,3 L42,15" stroke="url(#as-estela)" stroke-width="1.6"/>
      <path d="M63,13 L50,23" stroke="url(#as-estela)" stroke-width="1.6"/>
    </g>
    <path d="${roca}" fill="url(#as-roca)"/>
    ${crater('as-hueco', 25, 30, 4.4, 3.4, '#E6D6C6')}
    ${crater('as-hueco', 37, 41, 3.2, 2.4, '#D8C6B3')}
    ${crater('as-hueco', 41, 28, 2.1, 1.6, '#D8C6B3')}
    ${crater('as-hueco', 29, 43, 1.5, 1.1, '#CDB9A5')}
    <circle cx="20" cy="39" r=".9" fill="#5B483B" opacity=".6"/><circle cx="46" cy="36" r="1" fill="#5B483B" opacity=".55"/><circle cx="33" cy="25" r=".7" fill="#5B483B" opacity=".5"/>
    ${reflejo(23, 23.5, 5, 2.4, -32, 0.6)}`;
}

// ------------------------------------------------------------------ luna
function luna() {
  const defs = [
    radial('lu-cuerpo', [[0, '#FFFFFF'], [0.3, '#F6F3EA'], [0.72, '#D9D2C1'], [1, '#A8A08E']], { cx: '36%', cy: '30%', r: '78%' }),
    radial('lu-hueco', [[0, '#A9A08D'], [0.65, '#C9C1AF'], [1, '#DDD6C7']], { cx: '35%', cy: '30%' }),
    radial('lu-borde', [[0.8, '#8F8672', 0], [1, '#7E7562', 0.45]], { cx: '50%', cy: '50%', r: '50%' }),
  ].join('');
  return `<defs>${defs}</defs>
    ${sombra(32, 57, 17, 3)}
    <circle cx="32" cy="31" r="20" fill="url(#lu-cuerpo)"/>
    ${crater('lu-hueco', 24, 24, 4.6, 3.8, '#FFFFFF')}
    ${crater('lu-hueco', 38, 35, 5.4, 4.4, '#F3EFE5')}
    ${crater('lu-hueco', 25, 39, 2.8, 2.3, '#F5F1E8')}
    ${crater('lu-hueco', 40, 21, 2.2, 1.8, '#FFFFFF')}
    ${crater('lu-hueco', 32, 46, 1.6, 1.2, '#E9E4D8')}
    <circle cx="32" cy="31" r="20" fill="url(#lu-borde)"/>
    ${reflejo(23, 19.5, 6, 2.6, -35, 0.8)}`;
}

// ------------------------------------------------------------------ planeta
function planeta() {
  const defs = [
    radial('pl-esfera', [[0, '#A9CCFF'], [0.4, '#5A8BF2'], [0.8, '#2B4BC0'], [1, '#1A2C82']], { cx: '34%', cy: '28%', r: '80%' }),
    lineal('pl-anillo', [[0, '#FFE2A8'], [0.5, '#F5A85E'], [1, '#D46F35']], 0, 0, 1, 0),
    lineal('pl-banda', [[0, '#FFFFFF', 0.32], [1, '#FFFFFF', 0]], 0, 0, 1, 0),
    `<clipPath id="pl-recorte"><circle cx="32" cy="32" r="17"/></clipPath>`,
    `<clipPath id="pl-frente"><rect x="-10" y="33" width="84" height="40"/></clipPath>`,
  ].join('');
  const anillo = (extra = '') =>
    `<g transform="rotate(-17 32 33)"><ellipse cx="32" cy="33" rx="28" ry="8.2" fill="none" stroke="url(#pl-anillo)" stroke-width="4.6" ${extra}/>
     <ellipse cx="32" cy="33" rx="28" ry="8.2" fill="none" stroke="#FFF1D2" stroke-width=".8" opacity=".8" transform="translate(0 -1.6)" ${extra}/></g>`;
  return `<defs>${defs}</defs>
    ${sombra(32, 57, 18, 3)}
    ${anillo()}
    <circle cx="32" cy="32" r="17" fill="url(#pl-esfera)"/>
    <g clip-path="url(#pl-recorte)">
      <path d="M12,27 Q32,22 52,27 L52,31 Q32,26 12,31Z" fill="url(#pl-banda)"/>
      <path d="M12,38 Q32,33 52,38 L52,41.5 Q32,36.5 12,41.5Z" fill="#14246B" opacity=".28"/>
      <circle cx="40" cy="40" r="15" fill="#0E1A57" opacity=".18" filter="url(#ic-f3)"/>
    </g>
    ${anillo('clip-path="url(#pl-frente)"')}
    ${reflejo(25, 23, 5.2, 2.5, -35, 0.8)}`;
}

// ------------------------------------------------------------------ estrella
function estrella() {
  const pts = (R, r, cx = 32, cy = 31) => {
    const p = [];
    for (let k = 0; k < 10; k++) {
      const a = ((-90 + 36 * k) * Math.PI) / 180;
      const rad = k % 2 ? r : R;
      p.push(`${f(cx + Math.cos(a) * rad)},${f(cy + Math.sin(a) * rad)}`);
    }
    return p.join(' ');
  };
  const defs = [
    lineal('es-cuerpo', [[0, '#FFF2A6'], [0.45, '#FFCF3F'], [1, '#F08A0C']]),
    lineal('es-bisel', [[0, '#FFFBE0'], [1, '#FFD45A']]),
    radial('es-aura', [[0, '#FFD45A', 0.55], [1, '#FFD45A', 0]], { cx: '50%', cy: '50%', r: '50%' }),
  ].join('');
  return `<defs>${defs}</defs>
    ${sombra(32, 57, 15, 2.6, '#7A3B00', 0.22)}
    <circle cx="32" cy="31" r="27" fill="url(#es-aura)"/>
    <polygon points="${pts(21, 9.4)}" fill="url(#es-cuerpo)" stroke="url(#es-cuerpo)" stroke-width="5" stroke-linejoin="round"/>
    <polygon points="${pts(12.5, 5.8, 31, 29.5)}" fill="url(#es-bisel)" stroke="url(#es-bisel)" stroke-width="2.4" stroke-linejoin="round" opacity=".75" filter="url(#ic-f1)"/>
    ${reflejo(26, 20, 3.6, 1.8, -40, 0.85)}
    ${destello(53, 10, 4.2, '#FFE37A')}${destello(10, 47, 3, '#FFE37A', 0.9)}${destello(55, 44, 2.2, '#FFF3C2')}`;
}

// ------------------------------------------------------------------ galaxia
function galaxia() {
  const giro = -0.36;
  const tx = (x, y) => [32 + x * Math.cos(giro) - y * Math.sin(giro), 31 + x * Math.sin(giro) + y * Math.cos(giro)];
  const brazo = (base) => {
    const ext = [], int = [];
    for (let i = 0; i <= 26; i++) {
      const t = i / 26;
      const a = base + t * 3.7;
      const r = 3.5 + t * 23;
      const w = 9.5 * (1 - t * 0.7);
      const p = (rr) => tx(Math.cos(a) * rr, Math.sin(a) * rr * 0.62);
      ext.push(p(r + w / 2));
      int.push(p(Math.max(0.5, r - w / 2)));
    }
    const todos = [...ext, ...int.reverse()];
    return 'M' + todos.map(([x, y]) => `${f(x)},${f(y)}`).join('L') + 'Z';
  };
  const b1 = brazo(0), b2 = brazo(Math.PI);
  const defs = [
    lineal('ga-b1', [[0, '#FFE1B0'], [0.35, '#FF7FB6'], [0.75, '#8C5CFF'], [1, '#4C6BFF']]),
    lineal('ga-b2', [[0, '#4C6BFF'], [0.3, '#8C5CFF'], [0.7, '#FF7FB6'], [1, '#FFE1B0']]),
    radial('ga-nucleo', [[0, '#FFFFFF'], [0.3, '#FFF1C9'], [0.65, '#FFC46B', 0.9], [1, '#FF9A4A', 0]], { cx: '50%', cy: '50%', r: '50%' }),
    radial('ga-halo', [[0, '#9C7BFF', 0.4], [1, '#7C8CFF', 0]], { cx: '50%', cy: '50%', r: '50%' }),
  ].join('');
  const estrellitas = [[9, 14, 1.1], [54, 12, 0.9], [57, 45, 1.2], [12, 47, 0.8], [46, 52, 0.7], [20, 9, 0.6], [60, 30, 0.6]]
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#FFFFFF"/>`).join('');
  return `<defs>${defs}</defs>
    ${sombra(32, 58, 17, 2.4, '#2A1B5E', 0.18)}
    <ellipse cx="32" cy="31" rx="29" ry="15" transform="rotate(-20 32 31)" fill="url(#ga-halo)"/>
    <g filter="url(#ic-f2)" opacity=".9"><path d="${b1}" fill="url(#ga-b1)"/><path d="${b2}" fill="url(#ga-b2)"/></g>
    <path d="${b1}" fill="url(#ga-b1)"/><path d="${b2}" fill="url(#ga-b2)"/>
    <ellipse cx="32" cy="31" rx="10" ry="7" transform="rotate(-20 32 31)" fill="url(#ga-nucleo)" filter="url(#ic-f1)"/>
    <ellipse cx="31" cy="30" rx="3.2" ry="2.2" transform="rotate(-20 31 30)" fill="#FFFFFF"/>
    ${estrellitas}
    ${destello(50, 8, 3.6, '#FFFFFF')}${destello(13, 52, 2.6, '#FFE9B0')}`;
}

// ------------------------------------------------------------------ medios
// Para los medios puntos: objetos partidos, con su cara de corte visible.
const MEDIA_LINEA = [[36, 2], [35, 21], [38.2, 27], [33.8, 34], [36.6, 42], [33, 62]];

function asteroideMedio() {
  const roca = rocaAsteroide();
  const izq = `M-2,-2 ${MEDIA_LINEA.map(([x, y]) => `L${x},${y}`).join(' ')} L-2,66Z`;
  const cara = MEDIA_LINEA.slice(1, 5);
  const caraPts = [...cara, ...cara.slice().reverse().map(([x, y]) => [x + 3.6, y - 1])].map((p) => p.join(',')).join(' ');
  const defs = [
    radial('am-roca', [[0, '#E2D2C1'], [0.35, '#B79F8A'], [0.75, '#7B6352'], [1, '#4D3C31']], { cx: '34%', cy: '28%', r: '80%' }),
    radial('am-hueco', [[0, '#5E4A3D'], [0.7, '#86705F'], [1, '#A28B77']], { cx: '35%', cy: '30%' }),
    lineal('am-cara', [[0, '#F1E4D3'], [0.5, '#CDB59C'], [1, '#937A64']], 0, 0, 1, 1),
    `<clipPath id="am-corte"><path d="${izq}"/></clipPath>`,
  ].join('');
  return `<defs>${defs}</defs>
    ${sombra(27, 57, 12, 2.6)}
    <g clip-path="url(#am-corte)"><path d="${roca}" fill="url(#am-roca)"/>
      ${crater('am-hueco', 25, 30, 4.4, 3.4, '#E6D6C6')}${crater('am-hueco', 29, 43, 1.5, 1.1, '#CDB9A5')}
      <circle cx="20" cy="39" r=".9" fill="#5B483B" opacity=".6"/></g>
    <polygon points="${caraPts}" fill="url(#am-cara)" stroke="url(#am-cara)" stroke-width=".8" stroke-linejoin="round"/>
    <path d="M36,24 L37.6,26.4 M34.8,32 L36.6,34.4 M35.6,38.4 L37.2,40.6" stroke="#FFFFFF" stroke-width=".7" opacity=".7" stroke-linecap="round"/>
    <polygon points="45,36 48.4,34.6 48,38.4" fill="url(#am-roca)"/><polygon points="47,25 49,24.4 48.6,26.6" fill="url(#am-cara)"/>
    <circle cx="44.6" cy="45" r="1.2" fill="#9C8571"/>
    ${reflejo(22, 24, 3.6, 2, -32, 0.6)}`;
}

function lunaMedia() {
  const defs = [
    radial('lm-cuerpo', [[0, '#FFFFFF'], [0.3, '#F6F3EA'], [0.72, '#D9D2C1'], [1, '#A8A08E']], { cx: '30%', cy: '32%', r: '80%' }),
    radial('lm-hueco', [[0, '#A9A08D'], [0.65, '#C9C1AF'], [1, '#DDD6C7']], { cx: '35%', cy: '30%' }),
    `<mask id="lm-mascara"><circle cx="31" cy="31" r="20" fill="#FFFFFF"/><circle cx="42" cy="25.5" r="17" fill="#000000"/></mask>`,
  ].join('');
  return `<defs>${defs}</defs>
    ${sombra(27, 57, 12, 2.6)}
    <g mask="url(#lm-mascara)">
      <circle cx="31" cy="31" r="20" fill="url(#lm-cuerpo)"/>
      ${crater('lm-hueco', 19, 32, 3.6, 3, '#FFFFFF')}${crater('lm-hueco', 25, 44, 2.6, 2.1, '#F3EFE5')}${crater('lm-hueco', 15, 22, 1.6, 1.3, '#FFFFFF')}
      <circle cx="42" cy="25.5" r="17.6" fill="none" stroke="#8F8672" stroke-width="2" opacity=".35" filter="url(#ic-f1)"/>
    </g>
    ${reflejo(17, 25, 3.2, 1.8, -60, 0.8)}
    ${destello(46, 46, 2.4, '#FFF6D8')}`;
}

function planetaMedio() {
  const defs = [
    radial('pm-esfera', [[0, '#A9CCFF'], [0.4, '#5A8BF2'], [0.8, '#2B4BC0'], [1, '#1A2C82']], { cx: '34%', cy: '28%', r: '80%' }),
    lineal('pm-anillo', [[0, '#FFE2A8'], [0.5, '#F5A85E'], [1, '#D46F35']], 0, 0, 1, 0),
    radial('pm-nucleo', [[0, '#FFF6C9'], [0.3, '#FFD067'], [0.55, '#F08A3C'], [0.8, '#B4441E'], [1, '#3A4FB0']], { cx: '50%', cy: '50%', r: '50%' }),
    `<clipPath id="pm-izq"><rect x="-10" y="-10" width="42" height="84"/></clipPath>`,
    `<clipPath id="pm-frente"><rect x="-10" y="33" width="42" height="40"/></clipPath>`,
  ].join('');
  const anillo = (extra) =>
    `<g transform="rotate(-17 32 33)" ${extra}><ellipse cx="32" cy="33" rx="28" ry="8.2" fill="none" stroke="url(#pm-anillo)" stroke-width="4.6"/></g>`;
  return `<defs>${defs}</defs>
    ${sombra(27, 57, 13, 2.8)}
    <g clip-path="url(#pm-izq)">${anillo('')}
      <circle cx="32" cy="32" r="17" fill="url(#pm-esfera)"/>
      <path d="M12,27 Q32,22 52,27 L52,31 Q32,26 12,31Z" fill="#FFFFFF" opacity=".25"/>
    </g>
    <ellipse cx="32" cy="32" rx="6.2" ry="17" fill="url(#pm-nucleo)"/>
    <ellipse cx="32" cy="32" rx="6.2" ry="17" fill="none" stroke="#1A2C82" stroke-width=".8" opacity=".5"/>
    <g clip-path="url(#pm-izq)"><g clip-path="url(#pm-frente)">${anillo('')}</g></g>
    ${reflejo(24, 23, 4.4, 2.2, -35, 0.8)}`;
}

function estrellaMedia() {
  const P = [];
  for (let k = 0; k < 10; k++) {
    const a = ((-90 + 36 * k) * Math.PI) / 180;
    const rad = k % 2 ? 9.4 : 21;
    P.push([f(32 + Math.cos(a) * rad), f(31 + Math.sin(a) * rad)]);
  }
  const mitad = [P[0], P[9], P[8], P[7], P[6], P[5]].map((p) => p.join(',')).join(' ');
  const defs = [
    lineal('em-cuerpo', [[0, '#FFF2A6'], [0.45, '#FFCF3F'], [1, '#F08A0C']]),
    lineal('em-cara', [[0, '#FFB52E'], [1, '#C8620A']], 0, 0, 0, 1),
    radial('em-aura', [[0, '#FFD45A', 0.5], [1, '#FFD45A', 0]], { cx: '50%', cy: '50%', r: '50%' }),
    `<clipPath id="em-izq"><rect x="-10" y="-10" width="42.4" height="84"/></clipPath>`,
  ].join('');
  return `<defs>${defs}</defs>
    ${sombra(26, 57, 11, 2.4, '#7A3B00', 0.22)}
    <circle cx="26" cy="31" r="22" fill="url(#em-aura)"/>
    <g clip-path="url(#em-izq)"><polygon points="${mitad}" fill="url(#em-cuerpo)" stroke="url(#em-cuerpo)" stroke-width="5" stroke-linejoin="round"/></g>
    <path d="M32.4,8.6 Q35.6,10 35.6,12.4 L35.6,40.6 Q35.6,42.4 32.4,43.4Z" fill="url(#em-cara)"/>
    <path d="M33.2,11 L33.2,41" stroke="#FFF3C0" stroke-width=".9" opacity=".8"/>
    ${reflejo(25, 20, 3, 1.6, -40, 0.85)}
    ${destello(46, 14, 3, '#FFE37A')}${destello(12, 47, 2.4, '#FFE37A', 0.9)}`;
}

export const MEDIOS = { asteroide: asteroideMedio, luna: lunaMedia, planeta: planetaMedio, estrella: estrellaMedia };

export const ICONOS = { basura, asteroide, luna, planeta, estrella, galaxia };
export const CALIFICACION = ICONOS;
import { ESTADOS_ICONOS, REPISAS_ICONOS } from './iconos-extra.js';

// Todos los iconos: calificación, estados (est-*) y repisas (rep-*).
function todos() {
  return {
    ...ICONOS,
    ...Object.fromEntries(Object.entries(MEDIOS).map(([k, v]) => [`${k}-medio`, v])),
    ...Object.fromEntries(Object.entries(ESTADOS_ICONOS).map(([k, v]) => [`est-${k}`, v])),
    ...Object.fromEntries(Object.entries(REPISAS_ICONOS).map(([k, v]) => [`rep-${k}`, v])),
  };
}

// Inserta los iconos como <symbol> en la página (se usan con <use>).
export function instalarIconos() {
  const simbolos = Object.entries(todos())
    .map(([id, fn]) => `<symbol id="ic-${id}" viewBox="0 0 64 64">${fn()}</symbol>`)
    .join('');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  svg.innerHTML = `<defs>${DEFS}</defs>${simbolos}`;
  document.body.prepend(svg);
}

// SVG independiente (para exportar los iconos como archivos).
export function svgSuelto(id) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128"><defs>${DEFS}</defs>${todos()[id]()}</svg>`;
}
export const TODOS_IDS = () => Object.keys(todos());

export const usar = (id, clase = '') =>
  `<svg class="icono ${clase}" viewBox="0 0 64 64" aria-hidden="true"><use href="#ic-${id}"/></svg>`;
