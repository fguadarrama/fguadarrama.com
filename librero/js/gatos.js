// Petri y Folfiri: los gatos del librero.
//
// - SVG con volumen (degradados, sombra de contacto, borde de pelo) y un
//   estilo de caricatura amable, pero con rasgos de gato real: ojos con iris
//   rayado y párpado superior marcado, nariz de cuero, almohadillas de los
//   bigotes, mejillas esponjadas.
// - Medidas en milímetros reales; se escalan con la misma escala que los
//   libros (px por mm), así que cada gato mide lo que mediría junto a ellos.
// - La cola es una cadena de vértebras con resortes: cada segmento sigue al
//   anterior con retraso, así que se mueve como una cola de verdad (la base
//   lenta, la punta con latigazo y rebote).
// - Poses: dormido, sentado (de frente, como en las fotos de Folfiri),
//   asomado (arriba del mueble) y camina (cinemática inversa).
// - Comportamientos (ambos gatos los tienen todos): parpadeo, parpadeo lento,
//   girar las orejas, mirar alrededor, ladear la cabeza, seguir el cursor,
//   bostezar, relamerse, acicalarse, golpecitos con la punta de la cola,
//   barrer con la cola, soñar, acomodarse, despertar, zarpazo y maullar.

import { curvaCerrada } from './iconos.js';
import { maullar, trino, ronronear, estornudar } from './sonidos.js';
import { menosMovimiento } from './util.js';

// Mostrar u ocultar a los gatos (botón de la cabecera; se recuerda).
const CLAVE_GATOS = 'librero.gatos';
let visibles = true;
try {
  visibles = localStorage.getItem(CLAVE_GATOS) !== 'no';
} catch {
  /* sin almacenamiento */
}
export const gatosActivos = () => visibles;
export function alternarGatos() {
  visibles = !visibles;
  try {
    localStorage.setItem(CLAVE_GATOS, visibles ? 'si' : 'no');
  } catch {
    /* sin almacenamiento */
  }
  dispatchEvent(new CustomEvent('librero:gatos', { detail: visibles }));
  return visibles;
}

export const GATOS = {
  petri: {
    nombre: 'Petri', tam: 0.95, voz: 1.12,
    base: '#DB8536', claro: '#F6C27E', oscuro: '#A65A1F', raya: '#9A4B1A', rayaCuerpo: 0.42,
    pecho: '#FCF3E8', hocico: '#FAE7D2', patas: '#F7DDB8', punta: '#B45E20', puente: '#E59A55',
    nariz: '#E89C9B', oreja: '#F3ADA6', iris: ['#E8E07A', '#BFA531', '#6E5F12'], lince: false,
  },
  // Lynx point: cuerpo crema muy claro; rayas en cara, patas y cola.
  folfiri: {
    nombre: 'Folfiri', tam: 1.04, voz: 0.9,
    base: '#E7DED2', claro: '#FAF6F0', oscuro: '#B9AB99', raya: '#8B7967', rayaCuerpo: 0.13,
    pecho: '#FBF9F5', hocico: '#FAF7F2', patas: '#F3EEE7', punta: '#6A5848', puente: '#B98F6E',
    nariz: '#E6A096', oreja: '#E9B5AA', iris: ['#EEF8FD', '#9CCBE6', '#4E86B0'], lince: true,
  },
};

// Medidas de cada pose (mm). "suelo" es la línea donde apoya.
export const POSES = {
  dormido: { ancho: 440, alto: 200, suelo: 193 },
  sentado: { ancho: 270, alto: 300, suelo: 296 },
  asomado: { ancho: 320, alto: 340, suelo: 170 },
  camina: { ancho: 600, alto: 330, suelo: 322 },
};

let serie = 0;
const r2 = (n) => Math.round(n * 100) / 100;
const RAD = Math.PI / 180;
const azarEntre = (a, b) => a + Math.random() * (b - a);
const suave = (t) => t * t * (3 - 2 * t);
const tramo = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const campana = (t, a, b) => (t <= a || t >= b ? 0 : Math.sin(Math.PI * ((t - a) / (b - a))));

function mezclar(a, b, t) {
  const h = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const [x, y] = [h(a), h(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

// ------------------------------------------------------------------ dibujo
function defs(P, u) {
  const rad = (id, stops, cx = '38%', cy = '28%', r = '78%') =>
    `<radialGradient id="${u}${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</radialGradient>`;
  const lin = (id, stops, y2 = 1, x2 = 0) =>
    `<linearGradient id="${u}${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
  return `<defs>
    ${rad('cuerpo', [[0, P.claro], [0.55, P.base], [1, P.oscuro]])}
    ${rad('cabeza', [[0, P.claro], [0.62, P.base], [1, P.oscuro]], '40%', '30%', '75%')}
    ${rad('anca', [[0, P.claro], [0.5, P.base], [1, P.oscuro]], '40%', '25%', '80%')}
    ${rad('pecho', [[0, '#FFFFFF'], [1, P.pecho]], '45%', '35%', '70%')}
    ${rad('hocico', [[0, '#FFFFFF'], [1, P.hocico]], '40%', '35%', '75%')}
    ${rad('pata', [[0, '#FFFFFF'], [1, P.patas]], '40%', '30%', '80%')}
    ${rad('iris', [[0, P.iris[0]], [0.55, P.iris[1]], [1, P.iris[2]]], '50%', '45%', '62%')}
    ${rad('nariz', [[0, '#FFDCDA'], [1, P.nariz]], '40%', '30%', '70%')}
    ${lin('oreja', [[0, P.lince ? P.punta : P.oscuro], [0.5, P.lince ? P.raya : P.base], [1, P.base]])}
    ${lin('lado', [[0, P.base], [0.7, P.base], [1, P.oscuro]])}
    ${lin('cola', [[0, P.claro], [0.5, P.lince ? mezclar(P.base, P.raya, 0.35) : P.base], [1, P.oscuro]])}
    ${lin('lejos', [[0, P.oscuro], [1, P.raya]])}
    <filter id="${u}bl" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
    <filter id="${u}bl2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2"/></filter>
  </defs>`;
}

// Borde de pelo: una hilera de puntitos redondos sobre el contorno.
const pelo = (d, color, ancho = 2.6, paso = 3.1) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${ancho}" stroke-dasharray="0.1 ${paso}" stroke-linecap="round" opacity=".55"/>`;

// Cabeza de frente, centrada en (0,0): ~10 cm de ancho, orejas hasta -74.
function cabezaFrente(P, u, { dormida = false } = {}) {
  const forma = curvaCerrada([[0, -44], [24, -41], [42, -28], [50, -6], [49, 8], [54, 17], [45, 21], [43, 28], [30, 36], [16, 41], [0, 43], [-16, 41], [-30, 36], [-43, 28], [-45, 21], [-54, 17], [-49, 8], [-50, -6], [-42, -28], [-24, -41]]);
  const oreja = (s) => `<g class="g-oreja" data-x="${s * 28}" data-y="-36">
      <path d="M-47,-20 Q-52,-52 -41,-74 Q-37,-77 -32,-72 Q-20,-56 -10,-40 Z" fill="url(#${u}oreja)" transform="scale(${s},1)"/>
      <path d="M-40,-28 Q-43,-50 -38,-64 Q-28,-53 -19,-41 Z" fill="${P.oreja}" opacity=".85" transform="scale(${s},1)"/>
      <path d="M-37,-31 q1,-8 4,-14 M-33,-31 q3,-7 7,-11 M-35,-29 q-1,-9 1,-16" fill="none" stroke="#FFFFFF" stroke-width="1.1" stroke-linecap="round" opacity=".8" transform="scale(${s},1)"/>
    </g>`;
  const rayas = `<g stroke="${P.raya}" stroke-linecap="round" fill="none" opacity="${P.lince ? 0.62 : 0.75}">
      <path d="M-14,-38 Q-10,-30 -8,-22 M-5,-43 Q-3,-34 -3,-26 M5,-43 Q3,-34 3,-26 M14,-38 Q10,-30 8,-22" stroke-width="2.8"/>
      <path d="M-50,-2 Q-41,0 -34,6 M-49,9 Q-41,11 -35,15 M50,-2 Q41,0 34,6 M49,9 Q41,11 35,15" stroke-width="2.6"/>
      <path d="M-30,-14 Q-38,-12 -44,-16 M30,-14 Q38,-12 44,-16" stroke-width="2"/>
    </g>`;
  const ojo = (s) => {
    const x = s * 20;
    if (dormida) {
      return `<path d="M${x - 12},-4 Q${x},3 ${x + 12},-4" fill="none" stroke="#2E2018" stroke-width="2.6" stroke-linecap="round" transform="rotate(${s * -7} ${x} -4)"/>
        <path d="M${x - 9},-1 Q${x},4 ${x + 9},-1" fill="none" stroke="${P.claro}" stroke-width="1.4" opacity=".7" transform="rotate(${s * -7} ${x} -4)"/>`;
    }
    const forma = 'M-12,1 C-8,-8 6,-11 12,-2 C8,7 -5,9 -12,1Z';
    const estrias = Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2;
      return `M${r2(Math.cos(a) * 3.2)},${r2(Math.sin(a) * 3.2)} L${r2(Math.cos(a) * 9)},${r2(Math.sin(a) * 9)}`;
    }).join(' ');
    return `<g transform="translate(${x},-6)">
      <g class="g-ojo" data-s="${s}">
        ${P.lince ? `<ellipse rx="16" ry="11.5" fill="#FFFFFF" opacity=".7" transform="scale(${s},1) rotate(-8)"/>` : ''}
        <g transform="scale(${s},1) rotate(-8)">
          <clipPath id="${u}o${s}"><path d="${forma}"/></clipPath>
          <path d="${forma}" fill="url(#${u}iris)"/>
          <g clip-path="url(#${u}o${s})">
            <path d="${estrias}" stroke="${P.iris[2]}" stroke-width=".6" opacity=".35"/>
            <g class="g-pupila"><ellipse class="g-pupila-e" rx="2.4" ry="7.4" fill="#0D0805"/></g>
            <path d="M-13,1 C-8,-8 6,-11 13,-2 L13,-12 L-13,-12Z" fill="#1A0F08" opacity=".22" transform="translate(0,2.4)"/>
          </g>
          <path d="M-12,1 C-8,-8 6,-11 12,-2" fill="none" stroke="#22150D" stroke-width="2.3" stroke-linecap="round"/>
          <path d="M12,-2 C8,7 -5,9 -12,1" fill="none" stroke="#22150D" stroke-width="1.1"/>
        </g>
        <circle cx="-3.8" cy="-3.6" r="2" fill="#FFFFFF" opacity=".95"/>
        <circle cx="3.4" cy="2.8" r=".9" fill="#FFFFFF" opacity=".55"/>
      </g></g>`;
  };
  const bigotes = [-1, 1].map((s) =>
    [0, 1, 2, 3].map((i) => `<path d="M${s * 14},${17 + i * 2.4} Q${s * 38},${12 + i * 4} ${s * (60 + i * 2)},${7 + i * 8}" fill="none" stroke="#FFFFFF" stroke-width=".7" opacity=".9"/>`).join('')).join('');
  const puntos = [-1, 1].map((s) => [[7, 17], [11, 16], [9, 20.5], [13, 19.5], [15, 23]].map(([x, y]) => `<circle cx="${s * x}" cy="${y}" r=".75" fill="${P.oscuro}" opacity=".55"/>`).join('')).join('');
  return `${oreja(-1)}${oreja(1)}
    <path d="${forma}" fill="url(#${u}cabeza)"/>
    ${pelo(forma, mezclar(P.base, P.oscuro, 0.4), 2.2, 2.8)}
    <g class="g-rasgos">
      <ellipse cx="0" cy="-8" rx="8" ry="20" fill="${P.puente}" opacity="${P.lince ? 0.55 : 0.35}" filter="url(#${u}bl2)"/>
      ${rayas}
      ${ojo(-1)}${ojo(1)}
      <ellipse cx="-9.5" cy="20" rx="12.5" ry="9.5" fill="url(#${u}hocico)"/>
      <ellipse cx="9.5" cy="20" rx="12.5" ry="9.5" fill="url(#${u}hocico)"/>
      ${puntos}
      <ellipse cx="0" cy="31" rx="12" ry="8" fill="url(#${u}pecho)"/>
      <path d="M-6.5,9 C-3,7 3,7 6.5,9 C5,12.5 2,15 0,15.5 C-2,15 -5,12.5 -6.5,9Z" fill="url(#${u}nariz)"/>
      <path d="M-3.4,12.2 q1.2,.9 2.4,.4 M3.4,12.2 q-1.2,.9 -2.4,.4" fill="none" stroke="#9C5A58" stroke-width=".8" stroke-linecap="round"/>
      <ellipse cx="-1.6" cy="9.6" rx="2" ry=".9" fill="#FFFFFF" opacity=".55"/>
      <path d="M0,15.5 L0,19 M0,19 Q-5,24 -9.5,20.5 M0,19 Q5,24 9.5,20.5" fill="none" stroke="#6B4A3A" stroke-width="1.3" stroke-linecap="round"/>
      <g class="g-boca" transform="translate(0,21) scale(1,0)"><ellipse cy="4" rx="7.5" ry="7.5" fill="#5A2328"/><path d="M-3,1 l1.2,3 M3,1 l-1.2,3" stroke="#FFFFFF" stroke-width="1.2"/><ellipse cy="8.2" rx="4.6" ry="3.2" fill="#E58A8F"/></g>
      <g class="g-lengua" transform="translate(0,22) scale(1,0)"><path d="M-3.4,0 Q-3.6,6 0,6.6 Q3.6,6 3.4,0Z" fill="#E7898F"/><path d="M0,1 L0,5" stroke="#C86A72" stroke-width=".6"/></g>
      ${bigotes}
    </g>`;
}

// Cabeza de perfil (mira a la derecha), centrada en el cráneo.
function cabezaPerfil(P, u) {
  const craneo = curvaCerrada([[-40, -6], [-30, -32], [-4, -42], [22, -38], [40, -22], [52, -4], [62, 6], [60, 18], [48, 28], [28, 34], [10, 38], [-4, 42], [-16, 34], [-26, 36], [-38, 18]]);
  return `<path d="M-2,-30 Q6,-70 16,-74 Q24,-56 26,-34Z" fill="url(#${u}lejos)"/>
    <path d="${craneo}" fill="url(#${u}cabeza)"/>
    ${pelo(craneo, mezclar(P.base, P.oscuro, 0.4), 2.2, 2.8)}
    <g class="g-oreja" data-x="-8" data-y="-34">
      <path d="M-24,-30 Q-20,-72 -8,-78 Q4,-60 8,-36Z" fill="url(#${u}oreja)"/>
      <path d="M-16,-36 Q-14,-62 -7,-68 Q1,-54 3,-38Z" fill="${P.oreja}" opacity=".85"/>
      <path d="M-12,-40 q2,-8 5,-13 M-9,-39 q3,-6 6,-9" fill="none" stroke="#FFFFFF" stroke-width="1" opacity=".8"/>
    </g>
    <g stroke="${P.raya}" stroke-linecap="round" fill="none" opacity=".68">
      <path d="M-4,-40 Q4,-30 8,-22 M-16,-37 Q-10,-27 -8,-17" stroke-width="3"/>
      <path d="M-34,6 Q-20,4 -8,10 M-30,16 Q-18,14 -6,20" stroke-width="2.6"/>
    </g>
    <ellipse cx="46" cy="-2" rx="16" ry="9" fill="${P.puente}" opacity="${P.lince ? 0.55 : 0.35}" filter="url(#${u}bl2)"/>
    <ellipse cx="44" cy="15" rx="18" ry="13" fill="url(#${u}hocico)"/>
    <ellipse cx="33" cy="28" rx="14" ry="7" fill="url(#${u}pecho)"/>
    <path d="M56,4 Q64,3 64.5,8.5 Q60,12 55,9Z" fill="url(#${u}nariz)"/>
    <path d="M60,13 Q54,20 43,18" fill="none" stroke="#6B4A3A" stroke-width="1.3" stroke-linecap="round"/>
    <g transform="translate(30,-6)"><g class="g-ojo" data-s="1">
      <path d="M-9,0 C-5,-7 5,-8 10,-1 C5,5 -3,6 -9,0Z" fill="url(#${u}iris)"/>
      <ellipse cx="3.4" cy="-.6" rx="1.7" ry="5" fill="#0D0805"/>
      <path d="M-9,0 C-5,-7 5,-8 10,-1" fill="none" stroke="#22150D" stroke-width="2" stroke-linecap="round"/>
      <circle cx="0" cy="-2.6" r="1.5" fill="#FFFFFF" opacity=".92"/>
    </g></g>
    ${[0, 1, 2].map((i) => `<path d="M48,${15 + i * 2.5} Q76,${10 + i * 4} 104,${8 + i * 7}" fill="none" stroke="#FFFFFF" stroke-width=".7" opacity=".9"/>`).join('')}`;
}

// Marcado de la cola: forma, anillos y punta se dibujan en cada cuadro.
function colaSVG(P, u) {
  return `<g class="g-cola">
    <clipPath id="${u}cc"><path class="g-cola-clip"/></clipPath>
    <path class="g-cola-forma" fill="url(#${u}cola)"/>
    <g clip-path="url(#${u}cc)">
      <path class="g-cola-anillos" fill="${P.raya}" opacity="${P.lince ? 0.62 : 0.5}"/>
      <path class="g-cola-punta" fill="${P.punta}"/>
    </g>
    <path class="g-cola-pelo" fill="none" stroke="${mezclar(P.base, P.oscuro, 0.5)}" stroke-width="2.2" stroke-dasharray="0.1 3" stroke-linecap="round" opacity=".5"/>
  </g>`;
}

// Una mosca imaginaria que a veces distrae a los gatos.
const MOSCA = `<g class="g-mosca" opacity="0"><g transform="scale(1.6)"><ellipse rx="3.2" ry="2.4" fill="#1E1A17"/>
  <g class="g-alas"><ellipse cx="-1.8" cy="-2.6" rx="3" ry="1.5" fill="#E8F1F6" opacity=".8" transform="rotate(-25 -1.8 -2.6)"/><ellipse cx="1.8" cy="-2.6" rx="3" ry="1.5" fill="#E8F1F6" opacity=".8" transform="rotate(25 1.8 -2.6)"/></g></g></g>`;

const PATITA = (P, u, cx, cy, rx = 21, ry = 9.5) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${u}pata)"/>
  <path d="M${cx - rx * 0.45},${cy + ry * 0.55} l1,-4 M${cx},${cy + ry * 0.7} l0,-5 M${cx + rx * 0.45},${cy + ry * 0.55} l-1,-4" stroke="${P.oscuro}" stroke-width="1" opacity=".5" stroke-linecap="round"/>`;

// Enroscado, visto de frente: ~44 cm de ancho y ~19 cm de alto.
function dormido(P, u) {
  const cuerpo = curvaCerrada([[40, 193], [28, 160], [50, 118], [100, 84], [170, 64], [250, 58], [320, 70], [375, 98], [405, 135], [412, 170], [400, 193]]);
  const rayas = Array.from({ length: 9 }, (_, i) => {
    const x = 128 + i * 30;
    return `<path d="M${x},50 Q${x - 14},105 ${x - 4},160" stroke-width="${10 + (i % 3) * 2}"/>`;
  }).join('');
  return `${defs(P, u)}
    <ellipse cx="222" cy="194" rx="205" ry="8" fill="#140A04" opacity=".42" filter="url(#${u}bl)"/>
    <g class="g-respira">
      <clipPath id="${u}clip"><path d="${cuerpo}"/></clipPath>
      <path d="${cuerpo}" fill="url(#${u}cuerpo)"/>
      <g clip-path="url(#${u}clip)" stroke="${P.raya}" fill="none" stroke-linecap="round" opacity="${P.rayaCuerpo}">${rayas}</g>
      ${pelo(cuerpo, mezclar(P.base, P.oscuro, 0.5))}
      <g class="g-anca"><ellipse cx="330" cy="132" rx="74" ry="58" fill="url(#${u}anca)"/>
      <g stroke="${P.raya}" fill="none" stroke-linecap="round" opacity="${P.rayaCuerpo + 0.05}" stroke-width="9">
        <path d="M282,96 Q330,82 372,104"/><path d="M272,126 Q328,108 392,132"/><path d="M276,160 Q330,142 396,164"/>
      </g></g>
      <path d="M60,170 Q140,186 240,184" stroke="${P.oscuro}" stroke-width="10" opacity=".25" fill="none" filter="url(#${u}bl2)"/>
    </g>
    ${colaSVG(P, u)}
    <g transform="translate(110,128) rotate(-12)"><g class="g-cabeza">
      <g class="g-cara-dormida">${cabezaFrente(P, u, { dormida: true })}</g>
      <g class="g-cara-despierta" opacity="0">${cabezaFrente(P, u)}</g>
    </g></g>
    <g class="g-pata" data-x="80" data-y="180">${PATITA(P, u, 80, 185, 27, 10.5)}</g>
    ${PATITA(P, u, 134, 188, 24, 9.5)}`;
}

// Sentado de frente (como en las fotos de Folfiri): ~28 cm hasta las orejas.
function sentado(P, u) {
  const torso = curvaCerrada([[130, 112], [162, 120], [186, 150], [198, 196], [202, 240], [192, 284], [130, 293], [68, 284], [58, 240], [62, 196], [74, 150], [98, 120]]);
  const anca = (cx) => `<ellipse cx="${cx}" cy="258" rx="46" ry="38" fill="url(#${u}anca)"/>`;
  const pechera = curvaCerrada([[130, 150], [158, 158], [170, 186], [166, 214], [150, 226], [130, 222], [110, 226], [94, 214], [90, 186], [102, 158]]);
  return `${defs(P, u)}
    <defs><linearGradient id="${u}pierna" gradientUnits="userSpaceOnUse" x1="0" y1="200" x2="0" y2="296"><stop offset="0" stop-color="${P.lince ? P.pecho : P.base}"/><stop offset="1" stop-color="${P.lince ? P.patas : mezclar(P.base, P.oscuro, 0.3)}"/></linearGradient>
      <clipPath id="${u}ancas">${'<ellipse cx="80" cy="258" rx="46" ry="38"/><ellipse cx="180" cy="258" rx="46" ry="38"/>'}</clipPath></defs>
    <ellipse cx="135" cy="296" rx="104" ry="6" fill="#140A04" opacity=".38" filter="url(#${u}bl)"/>
    <g class="g-respira">
      ${anca(80)}${anca(180)}
      <g clip-path="url(#${u}ancas)" stroke="${P.raya}" fill="none" stroke-linecap="round" opacity="${P.rayaCuerpo + 0.12}" stroke-width="7">
        <path d="M44,236 Q62,226 84,232 M40,256 Q60,246 86,252 M216,236 Q198,226 176,232 M220,256 Q200,246 174,252"/>
      </g>
      <clipPath id="${u}clip"><path d="${torso}"/></clipPath>
      <path d="${torso}" fill="url(#${u}cuerpo)"/>
      <g clip-path="url(#${u}clip)">
        <ellipse cx="130" cy="200" rx="${P.lince ? 54 : 40}" ry="${P.lince ? 90 : 66}" fill="url(#${u}pecho)" filter="url(#${u}bl2)"/>
        <g stroke="${P.raya}" fill="none" stroke-linecap="round" opacity="${P.rayaCuerpo}">
          <path d="M70,170 Q84,186 80,212" stroke-width="8"/><path d="M190,170 Q176,186 180,212" stroke-width="8"/>
        </g>
      </g>
      ${pelo(torso, mezclar(P.base, P.oscuro, 0.5))}
    </g>
    <g class="g-pata-quieta" stroke-linecap="round">
      <line x1="111" y1="206" x2="110" y2="282" stroke="url(#${u}pierna)" stroke-width="28"/>
      <line x1="111" y1="222" x2="110" y2="276" stroke="${P.raya}" stroke-width="25" stroke-dasharray="4 9" opacity="${P.lince ? 0.45 : 0.3}"/>
      ${PATITA(P, u, 108, 287, 16, 9)}
    </g>
    <g class="g-pechera">
      <path d="${pechera}" fill="url(#${u}pecho)"/>
      ${pelo(pechera, P.lince ? '#FFFFFF' : P.pecho, 3, 3.4)}
      <path d="M112,206 q2,8 0,14 M122,210 q2,7 0,12 M138,210 q-2,7 0,12 M148,206 q-2,8 0,14" fill="none" stroke="${mezclar(P.pecho, P.oscuro, 0.25)}" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>
    </g>
    <g class="g-pata-acicala" stroke-linecap="round">
      <line class="g-brazo" stroke="url(#${u}pierna)" stroke-width="28"/>
      <line class="g-antebrazo" stroke="url(#${u}pierna)" stroke-width="26"/>
      <line class="g-antebrazo-r" stroke="${P.raya}" stroke-width="22" stroke-dasharray="4 9" opacity="${P.lince ? 0.45 : 0.3}"/>
      <ellipse class="g-mano" rx="16" ry="9" fill="url(#${u}pata)"/>
    </g>
    ${colaSVG(P, u)}
    <g transform="translate(130,86)"><g class="g-cabeza">${cabezaFrente(P, u)}</g></g>
    ${MOSCA}`;
}

// Echado arriba del mueble, asomado: solo se ven hombros, cabeza y patas
// sobre el borde (y = 170). La cola cuelga por el frente.
function asomado(P, u) {
  const hombros = curvaCerrada([[40, 172], [52, 140], [100, 116], [160, 108], [220, 116], [268, 140], [280, 172]]);
  return `${defs(P, u)}
    ${colaSVG(P, u)}
    <g class="g-respira">
      <path d="${hombros}" fill="url(#${u}cuerpo)"/>
      ${pelo(hombros, mezclar(P.base, P.oscuro, 0.5))}
      <g stroke="${P.raya}" fill="none" stroke-linecap="round" opacity="${P.rayaCuerpo + 0.05}" stroke-width="9">
        <path d="M70,150 Q90,128 120,120"/><path d="M250,150 Q230,128 200,120"/>
      </g>
      <rect x="97" y="130" width="32" height="44" rx="16" fill="url(#${u}lado)"/>
      <rect x="191" y="130" width="32" height="44" rx="16" fill="url(#${u}lado)"/>
    </g>
    <g class="g-pata" data-x="113" data-y="168">${PATITA(P, u, 113, 172)}</g>
    <g>${PATITA(P, u, 207, 172)}</g>
    <g transform="translate(160,112)"><g class="g-cabeza">${cabezaFrente(P, u)}</g></g>
    ${MOSCA}`;
}

// ---- marcha: cinemática inversa ----------------------------------------
// Cada pata apoya en el suelo (sin patinar) mientras el cuerpo avanza y
// luego se levanta en arco. Codo hacia atrás, rodilla hacia adelante,
// corvejón alto: proporciones de un gato real (mm).
const SUELO = 322;
const PATAS = {
  tl: { r: [206, 174], L: [60, 60, 46], fase: 0.5, lejos: true, del: false },
  dl: { r: [394, 192], L: [50, 60, 20], fase: 0.75, lejos: true, del: true },
  tc: { r: [202, 176], L: [60, 60, 46], fase: 0, lejos: false, del: false },
  dc: { r: [390, 194], L: [50, 60, 20], fase: 0.25, lejos: false, del: true },
};
const ZANCADA = 112, APOYO = 0.62, PERIODO = 0.95;
const VEL_MM = ZANCADA / (APOYO * PERIODO);

function ik(A, T, L1, L2, signo) {
  let dx = T[0] - A[0], dy = T[1] - A[1];
  let d = Math.hypot(dx, dy);
  const dmax = L1 + L2 - 0.5;
  if (d > dmax) {
    dx *= dmax / d;
    dy *= dmax / d;
    d = dmax;
  }
  const th = Math.atan2(dy, dx);
  const a = Math.acos(Math.min(1, Math.max(-1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
  const j = [A[0] + L1 * Math.cos(th + signo * a), A[1] + L1 * Math.sin(th + signo * a)];
  return [j, [A[0] + dx, A[1] + dy]];
}

function articulaciones(clave, fase, andando, bote = 0, estira = 0, pie = null) {
  const p = PATAS[clave];
  const raiz = [p.r[0], p.r[1] + bote];
  const x0 = raiz[0] + (p.del ? 8 + 58 * estira : 2);
  let px = x0, py = SUELO - 7, flexion = 0;
  if (pie) {
    // en el aire: el pie va donde diga la pose del salto (relativo al hombro/cadera)
    px = raiz[0] + pie.dx;
    py = raiz[1] + pie.dy;
    flexion = pie.flex;
  } else if (andando) {
    const f = (fase + p.fase) % 1;
    if (f < APOYO) px = x0 + ZANCADA / 2 - (ZANCADA * f) / APOYO;
    else {
      const s = (f - APOYO) / (1 - APOYO);
      px = x0 - ZANCADA / 2 + ZANCADA * suave(s);
      py -= (p.del ? 30 : 24) * Math.sin(Math.PI * s);
      flexion = Math.sin(Math.PI * s);
    }
  }
  const [L1, L2, L3] = p.L;
  let medio;
  if (p.del) {
    const ang = (-8 + 74 * flexion) * RAD;
    medio = [px + L3 * Math.sin(ang), py - L3 * Math.cos(ang)];
  } else {
    const ang = (14 + 40 * flexion) * RAD;
    medio = [px - L3 * Math.sin(ang), py - L3 * Math.cos(ang)];
  }
  const [codo, extremo] = ik(raiz, medio, L1, L2, p.del ? 1 : -1);
  return { raiz, codo, medio: extremo, pata: [px, py], flexion };
}

const linea = (l, a, b) => {
  if (!l) return;
  l.setAttribute('x1', r2(a[0])); l.setAttribute('y1', r2(a[1]));
  l.setAttribute('x2', r2(b[0])); l.setAttribute('y2', r2(b[1]));
};

function dibujarPata(el, j, del) {
  const [l1, l2, l3, rayas] = el.querySelectorAll('line');
  linea(l1, j.raiz, j.codo);
  linea(l2, j.codo, j.medio);
  linea(rayas, j.codo, j.medio);
  const punta = [j.pata[0] + (del ? 6 : 4) - j.flexion * 8, j.pata[1] + j.flexion * 3];
  linea(l3, j.medio, punta);
  const pie = el.querySelector('ellipse');
  pie.setAttribute('cx', r2(punta[0] + 6 - j.flexion * 6));
  pie.setAttribute('cy', r2(punta[1] + 1));
  pie.setAttribute('transform', `rotate(${r2(j.flexion * 40)} ${r2(punta[0])} ${r2(punta[1])})`);
}

function pataSVG(P, u, clave) {
  const p = PATAS[clave];
  const anchos = p.del ? [28, 18, 14] : [40, 19, 14];
  const color = p.lejos ? `url(#${u}lejosp)` : `url(#${u}pierna)`;
  const pie = p.lejos ? `url(#${u}lejosp)` : `url(#${u}pata)`;
  return `<g class="g-pata-c" data-p="${clave}" stroke-linecap="round">
    <line stroke="${color}" stroke-width="${anchos[0]}"/>
    <line stroke="${color}" stroke-width="${anchos[1]}"/>
    <line stroke="${color}" stroke-width="${anchos[2]}"/>
    <line stroke="${P.raya}" stroke-width="${anchos[1]}" stroke-dasharray="5 9" opacity="${p.lejos ? 0.25 : P.lince ? 0.5 : 0.45}"/>
    <ellipse rx="15" ry="7" fill="${pie}"/>
  </g>`;
}

// De perfil, caminando hacia la derecha: ~46 cm de largo sin la cola.
function camina(P, u) {
  const cuerpo = curvaCerrada([[146, 150], [196, 128], [262, 124], [332, 120], [374, 112], [410, 98], [446, 104], [458, 140], [448, 182], [422, 214], [362, 224], [292, 220], [240, 210], [198, 214], [154, 204], [136, 178]]);
  const rayas = Array.from({ length: 8 }, (_, i) => {
    const x = 214 + i * 24;
    return `<path d="M${x},118 Q${x - 10},152 ${x + 2},196" stroke-width="${9 + (i % 2) * 2}"/>`;
  }).join('');
  const lejos = mezclar(P.base, P.oscuro, 0.55);
  return `${defs(P, u)}
    <defs>
      <linearGradient id="${u}pierna" gradientUnits="userSpaceOnUse" x1="0" y1="180" x2="0" y2="322"><stop offset="0" stop-color="${P.base}"/><stop offset="1" stop-color="${mezclar(P.base, P.oscuro, 0.45)}"/></linearGradient>
      <linearGradient id="${u}lejosp" gradientUnits="userSpaceOnUse" x1="0" y1="180" x2="0" y2="322"><stop offset="0" stop-color="${lejos}"/><stop offset="1" stop-color="${mezclar(lejos, '#000000', 0.25)}"/></linearGradient>
    </defs>
    <ellipse cx="300" cy="323" rx="185" ry="6" fill="#140A04" opacity=".38" filter="url(#${u}bl)"/>
    ${pataSVG(P, u, 'tl')}${pataSVG(P, u, 'dl')}
    <g class="g-cuerpo">
      ${colaSVG(P, u)}
      <clipPath id="${u}clip"><path d="${cuerpo}"/></clipPath>
      <path d="${cuerpo}" fill="url(#${u}cuerpo)"/>
      <g clip-path="url(#${u}clip)">
        <ellipse cx="300" cy="222" rx="140" ry="20" fill="${P.lince ? P.pecho : P.claro}" opacity=".7" filter="url(#${u}bl2)"/>
        <ellipse cx="452" cy="176" rx="20" ry="42" fill="${P.pecho}" opacity=".9" filter="url(#${u}bl2)"/>
        <g stroke="${P.raya}" fill="none" stroke-linecap="round" opacity="${P.rayaCuerpo}">${rayas}</g>
        <path d="M352,122 Q372,140 380,170" stroke="${P.oscuro}" stroke-width="14" opacity=".18" fill="none" filter="url(#${u}bl2)"/>
      </g>
      ${pelo(cuerpo, mezclar(P.base, P.oscuro, 0.5))}
      <ellipse cx="206" cy="176" rx="46" ry="44" fill="url(#${u}anca)"/>
      <g stroke="${P.raya}" fill="none" stroke-linecap="round" opacity="${P.rayaCuerpo + 0.08}" stroke-width="7">
        <path d="M172,150 Q206,138 238,156"/><path d="M166,176 Q206,164 248,182"/>
      </g>
    </g>
    ${pataSVG(P, u, 'tc')}${pataSVG(P, u, 'dc')}
    <g class="g-cabeza-mov">
      <g class="g-perfil" transform="translate(474,92)">${cabezaPerfil(P, u)}</g>
      <g class="g-frente" transform="translate(468,92) scale(.96)" opacity="0">${cabezaFrente(P, u)}</g>
    </g>`;
}

const DIBUJOS = { dormido, sentado, asomado, camina };

// HTML de un gato. mm = px por milímetro (la escala de los libros).
export function htmlGato(clave, pose, mm, estilo = '') {
  const P = GATOS[clave];
  const D = POSES[pose];
  const k = mm * P.tam;
  const u = `gt${++serie}-`;
  const que = { dormido: 'dormido', sentado: 'sentado', asomado: 'asomado', camina: 'caminando' }[pose];
  return `<div class="gato gato-${pose}" data-gato="${clave}" data-pose="${pose}" style="--k:${r2(k)};width:${r2(D.ancho * k)}px;height:${r2(D.alto * k)}px;${estilo}" role="img" aria-label="${P.nombre}, ${que}">
    <svg viewBox="0 0 ${D.ancho} ${D.alto}" width="100%" height="100%" overflow="visible">${DIBUJOS[pose](P, u)}</svg>
  </div>`;
}

export const anchoGato = (clave, pose, mm) => POSES[pose].ancho * mm * GATOS[clave].tam;
export const altoGato = (clave, pose, mm) => POSES[pose].alto * mm * GATOS[clave].tam;

// ------------------------------------------------------------------ cola
// Cadena de N vértebras. Cada una tiene un ángulo relativo a la anterior que
// persigue un objetivo con un resorte amortiguado; la rigidez baja hacia la
// punta, así que el movimiento nace en la base y viaja hasta la punta con
// retraso y un pequeño rebote, como una cola real.
const COLAS = {
  dormido: {
    base: [404, 172], ang0: 148, n: 12, largo: 262, w0: 27, w1: 15,
    objetivo(t, g, i) {
      const tip = i >= 9 ? 8 + 26 * g.latigo * Math.sin(t * 22) : 0;
      return (i < 2 ? 15 : i < 9 ? 0.6 * Math.sin(t * 0.4 + i) : 0) + tip + (i < 2 ? 1.5 * g.respiro : 0);
    },
  },
  asomado: {
    base: [262, 166], ang0: 8, n: 13, largo: 250, w0: 21, w1: 13,
    objetivo(t, g, i) {
      const A = g.encima ? 15 : 6.5, w = g.encima ? 4.4 : 1.5;
      const curva = i < 3 ? 26 : 0;
      return curva + A * Math.sin(w * t - 0.55 * i) * (0.35 + i / 13) + (i > 9 ? 9 : 0) + g.latigo * 20 * Math.sin(t * 18);
    },
  },
  camina: {
    base: [146, 152], ang0: -162, n: 13, largo: 252, w0: 22, w1: 13,
    objetivo(t, g, i) {
      const ola = (g.andando ? 4 : 6) * Math.sin(2.1 * t - 0.6 * i) * (i / 13);
      const normal = (i < 6 ? 7 : i < 9 ? 2 : 21) + ola + g.latigo * 18 * Math.sin(t * 16) * (i > 8 ? 1 : 0);
      // al darse la vuelta la cola se levanta (casi vertical, punta en gancho);
      // en el salto va recta hacia atrás, de contrapeso
      const arriba = (i < 3 ? 23 : i < 10 ? -1 : 16) + 2 * Math.sin(3 * t - 0.5 * i);
      const recta = (i < 4 ? 3 : 1) + (i > 8 ? 4 : 0);
      const ca = g.colaArriba || 0, cr = g.colaRecta || 0;
      return normal + (arriba - normal) * ca + (recta - normal) * cr * (1 - ca);
    },
  },
  // Sentado: la cola rodea las patas por delante (en el plano del suelo) y
  // la punta da golpecitos; a veces barre el piso.
  sentado: {
    base: [206, -4], ang0: 152, n: 12, largo: 250, w0: 22, w1: 13, plano: true,
    objetivo(t, g, i) {
      const barre = g.barrer * 9 * Math.sin(t * 2.4);
      return (i < 4 ? 6 : i < 9 ? 2 : -9) + (i < 3 ? barre : 0);
    },
    proyectar([x, z], i, g, n) {
      const alzar = i >= n - 4 ? g.tap * 22 * ((i - (n - 4)) / 4) ** 1.5 : 0;
      return [x, POSES.sentado.suelo - 9 + z * 0.3 - alzar];
    },
  },
};

class Cola {
  constructor(el, pose) {
    this.el = el;
    this.c = COLAS[pose];
    this.th = Array.from({ length: this.c.n }, () => 0);
    this.om = Array.from({ length: this.c.n }, () => 0);
    this.listo = false;
  }
  paso(dt, t, g) {
    const { n } = this.c;
    if (!this.listo) {
      for (let i = 0; i < n; i++) this.th[i] = this.c.objetivo(t, g, i);
      this.listo = true;
    }
    const h = Math.min(dt, 0.04) / 2;
    for (let s = 0; s < 2; s++) {
      for (let i = 0; i < n; i++) {
        const k = 90 * (1 - 0.6 * (i / n));
        const c = 2 * Math.sqrt(k) * 0.58;
        const a = k * (this.c.objetivo(t, g, i) - this.th[i]) - c * this.om[i];
        this.om[i] += a * h;
        this.th[i] += this.om[i] * h;
      }
    }
    this.dibujar(g);
  }
  dibujar(g) {
    const { n, largo, w0, w1, base, ang0 } = this.c;
    const seg = largo / n;
    let ang = ang0, p = base.slice();
    const pts = [p];
    for (let i = 0; i < n; i++) {
      ang += this.th[i];
      p = [p[0] + seg * Math.cos(ang * RAD), p[1] + seg * Math.sin(ang * RAD)];
      pts.push(p);
    }
    const P = this.c.proyectar ? pts.map((q, i) => this.c.proyectar(q, i, g, n)) : pts;
    const L = [], R = [];
    for (let i = 0; i <= n; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(n, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const m = Math.hypot(dx, dy) || 1;
      dx /= m;
      dy /= m;
      const w = (w0 + (w1 - w0) * (i / n)) / 2;
      L.push([P[i][0] - dy * w, P[i][1] + dx * w]);
      R.push([P[i][0] + dy * w, P[i][1] - dx * w]);
    }
    const ult = P[n], pen = P[n - 1];
    const dl = Math.hypot(ult[0] - pen[0], ult[1] - pen[1]) || 1;
    const punta = [ult[0] + ((ult[0] - pen[0]) / dl) * w1 * 0.55, ult[1] + ((ult[1] - pen[1]) / dl) * w1 * 0.55];
    const contorno = curvaCerrada([...L, punta, ...R.slice().reverse()]);
    const quad = (i) => `M${r2(L[i][0])},${r2(L[i][1])}L${r2(L[i + 1][0])},${r2(L[i + 1][1])}L${r2(R[i + 1][0])},${r2(R[i + 1][1])}L${r2(R[i][0])},${r2(R[i][1])}Z`;
    let anillos = '';
    for (let i = 2; i < n - 2; i += 2) anillos += quad(i);
    let fin = '';
    for (let i = n - 2; i < n; i++) fin += quad(i);
    fin += `M${r2(L[n][0])},${r2(L[n][1])}L${r2(punta[0] + (L[n][0] - R[n][0]) * 0.6)},${r2(punta[1] + (L[n][1] - R[n][1]) * 0.6)}L${r2(punta[0] - (L[n][0] - R[n][0]) * 0.6)},${r2(punta[1] - (L[n][1] - R[n][1]) * 0.6)}L${r2(R[n][0])},${r2(R[n][1])}Z`;
    const $ = (s) => this.el.querySelector(s);
    $('.g-cola-forma')?.setAttribute('d', contorno);
    $('.g-cola-clip')?.setAttribute('d', contorno);
    $('.g-cola-pelo')?.setAttribute('d', contorno);
    $('.g-cola-anillos')?.setAttribute('d', anillos);
    $('.g-cola-punta')?.setAttribute('d', fin);
  }
}

// ------------------------------------------------------------------ animación
const activos = new Set();
let bucle = 0;
let puntero = { x: -1, y: -1, t: 0 };
addEventListener('pointermove', (e) => (puntero = { x: e.clientX, y: e.clientY, t: performance.now() }), { passive: true });

function girar(el, a, x = 0, y = 0) {
  el?.setAttribute('transform', `rotate(${r2(a)} ${x} ${y})`);
}

// Comportamientos espontáneos de cada pose (nombre, duración en s, peso).
const REPERTORIO = {
  dormido: [['oreja', 0.5, 3], ['latigo', 0.6, 2], ['sueno', 1.4, 1.5], ['acomodarse', 2.6, 0.7], ['bigotes', 0.8, 1],
    ['estirar-pata', 2, 0.9], ['sueno-profundo', 6, 0.8]],
  sentado: [['mirar', 3.2, 3], ['inclinar', 2.4, 2.5], ['parpadeo-lento', 2, 2], ['acicalarse', 4.4, 1.6], ['bostezo', 2.2, 0.8],
    ['golpecitos', 1.6, 2.5], ['barrer', 2.6, 1.2], ['oreja', 0.5, 2], ['relamerse', 0.9, 1],
    ['cazar-mosca', 4.4, 1.4], ['sacudir', 0.8, 1.2], ['estornudo', 1.1, 0.6], ['amasar', 3.2, 0.8]],
  asomado: [['inclinar', 2.4, 2], ['parpadeo-lento', 2, 2], ['bostezo', 2.2, 0.8], ['relamerse', 0.9, 1.2], ['oreja', 0.5, 2], ['latigo', 0.5, 1.5],
    ['cazar-mosca', 4.4, 1.4], ['sacudir', 0.8, 1.2], ['estornudo', 1.1, 0.6]],
  camina: [['oreja', 0.5, 1], ['latigo', 0.6, 1]],
};

function elegir(lista) {
  const total = lista.reduce((s, x) => s + x[2], 0);
  let r = Math.random() * total;
  for (const x of lista) if ((r -= x[2]) <= 0) return x;
  return lista[0];
}

function base(el) {
  const pose = el.dataset.pose;
  return {
    el,
    pose,
    P: GATOS[el.dataset.gato],
    cola: el.querySelector('.g-cola-forma') ? new Cola(el, pose) : null,
    ojos: [...el.querySelectorAll('.g-ojo')],
    orejas: [...el.querySelectorAll('.g-oreja')],
    sigParpadeo: performance.now() + azarEntre(1500, 5000),
    sigAccion: performance.now() + azarEntre(1500, 4500),
    accion: null,
    parpadeo: -1,
    encima: false,
    latigo: 0, respiro: 0, tap: 0, barrer: 0,
    mx: 0, my: 0.4, dil: 0, cierre: 0,
  };
}

// Acción espontánea en curso → progreso 0..1 (o -1 si no es esa).
function progreso(g, nombre, ahora) {
  if (!g.accion || g.accion.nombre !== nombre) return -1;
  return (ahora - g.accion.t0) / (g.accion.dur * 1000);
}

function programar(g, ahora) {
  if (g.accion && ahora > g.accion.t0 + g.accion.dur * 1000) g.accion = null;
  if (!g.accion && ahora > g.sigAccion && !menosMovimiento()) {
    const [nombre, dur] = elegir(REPERTORIO[g.pose]);
    g.accion = { nombre, dur, t0: ahora, lado: Math.random() < 0.5 ? -1 : 1 };
    g.sigAccion = ahora + dur * 1000 + azarEntre(2200, 6500);
  }
}

function forzar(g, nombre, dur, ahora) {
  g.accion = { nombre, dur, t0: ahora, lado: Math.random() < 0.5 ? -1 : 1 };
  g.sigAccion = ahora + dur * 1000 + azarEntre(2500, 5000);
}

// Ojos: parpadeo normal + cierre (parpadeo lento, bostezo, sueño).
function ojos(g, ahora, cierreExtra = 0) {
  if (ahora > g.sigParpadeo) {
    g.parpadeo = ahora;
    g.sigParpadeo = ahora + azarEntre(2600, 7000) * (Math.random() < 0.2 ? 0.15 : 1);
  }
  const t = (ahora - g.parpadeo) / 170;
  const parp = t >= 0 && t <= 1 ? Math.sin(t * Math.PI) * 0.92 : 0;
  const s = Math.max(0.06, 1 - Math.max(parp, cierreExtra));
  for (const o of g.ojos) o.setAttribute('transform', `scale(1 ${r2(s)})`);
}

function mirada(g, dx, dy, dil = 0) {
  g.mx += (dx - g.mx) * 0.12;
  g.my += (dy - g.my) * 0.12;
  g.dil += (dil - g.dil) * 0.1;
  g.el.querySelectorAll('.g-ojo').forEach((o) => {
    const s = Number(o.dataset.s) || 1;
    o.querySelector('.g-pupila')?.setAttribute('transform', `translate(${r2(g.mx * 3.6 * s)} ${r2(g.my * 2.4)})`);
  });
  g.el.querySelectorAll('.g-pupila-e').forEach((p) => p.setAttribute('rx', r2(2.4 + g.dil * 3.8)));
}

function haciaPuntero(g, alto = 0.3) {
  if (puntero.x < 0 || performance.now() - puntero.t > 6000) return null;
  const r = g.el.getBoundingClientRect();
  const vx = puntero.x - (r.left + r.width / 2), vy = puntero.y - (r.top + r.height * alto);
  const n = Math.hypot(vx, vy) || 1;
  return { dx: vx / n, dy: vy / n, lejos: n };
}

function orejas(g, ahora) {
  const p = progreso(g, 'oreja', ahora);
  const a = p >= 0 ? Math.sin(p * Math.PI * 2) * 15 * (1 - p) : 0;
  const lado = g.accion?.lado ?? 1;
  const atento = g.encima ? 1 : 0;
  g.orejas.forEach((o) => {
    const s = Number(o.dataset.x) < 0 ? -1 : 1;
    const giro = (s === lado ? a * s : 0) - atento * 6 * s + (g.orejaGiro || 0) * s;
    girar(o, giro, Number(o.dataset.x), Number(o.dataset.y));
  });
}

function boca(g, abierta, lengua = 0) {
  g.el.querySelectorAll('.g-boca').forEach((b) => b.setAttribute('transform', `translate(0,21) scale(1,${r2(abierta)})`));
  g.el.querySelectorAll('.g-lengua').forEach((b) => b.setAttribute('transform', `translate(0,22) scale(1,${r2(lengua)})`));
}

// Vuelo de la mosca alrededor de (cx, cy); a partir de 0.8 escapa.
function mosca(g, p, cx, cy) {
  const el = g.el.querySelector('.g-mosca');
  if (!el) return null;
  if (p < 0) {
    if (g.moscaVisible) {
      el.setAttribute('opacity', 0);
      g.moscaVisible = false;
    }
    return null;
  }
  g.moscaVisible = true;
  const t = p * 4.4;
  let x = cx + 62 * Math.sin(2.3 * t + 0.7) + 14 * Math.sin(7.1 * t);
  let y = cy + 30 * Math.sin(3.1 * t) + 8 * Math.sin(11.3 * t);
  const huye = tramo(p, 0.8, 1);
  x += huye * 220;
  y -= huye * 170;
  const op = Math.min(tramo(p, 0, 0.06), 1 - tramo(p, 0.9, 1));
  el.setAttribute('opacity', r2(op));
  el.setAttribute('transform', `translate(${r2(x)} ${r2(y)})`);
  el.querySelector('.g-alas')?.setAttribute('transform', `scale(1 ${r2(0.4 + 0.6 * Math.abs(Math.sin(performance.now() / 18)))})`);
  return [x, y];
}

// Sacudir la cabeza y estornudar: giros y saltitos de la cabeza.
function sacudidas(g, ahora) {
  const sh = progreso(g, 'sacudir', ahora);
  const giro = sh >= 0 ? 15 * Math.sin(sh * Math.PI * 9) * (1 - sh) : 0;
  const es = progreso(g, 'estornudo', ahora);
  let atras = 0, golpe = 0, cierre = 0;
  if (es >= 0) {
    atras = suave(tramo(es, 0, 0.4)) * (1 - tramo(es, 0.4, 0.46));
    golpe = campana(es, 0.4, 0.62);
    cierre = Math.max(atras * 0.75, golpe);
    if (es > 0.4 && !g.estornudoHecho) {
      g.estornudoHecho = true;
      estornudar(g.P.voz);
    }
  } else g.estornudoHecho = false;
  return { giro: giro - atras * 7 + golpe * 9, dy: -atras * 4 + golpe * 6, cierre, orejas: sh >= 0 ? 14 * Math.sin(sh * Math.PI * 9) * (1 - sh) : 0 };
}

function rasgos(g, dx, dy = 0) {
  g.el.querySelectorAll('.g-rasgos').forEach((r) => r.setAttribute('transform', `translate(${r2(dx)} ${r2(dy)})`));
}

// --- dormido
function animarDormido(g, ahora, dt) {
  const t = ahora / 1000;
  programar(g, ahora);
  // sueño profundo: respiración más lenta y honda
  const prof = campana(progreso(g, 'sueno-profundo', ahora), 0, 1);
  g.fr = (g.fr || 0) + (dt * Math.PI * 2) / (2.7 + 1.4 * prof);
  const resp = Math.sin(g.fr) * (1 + 0.9 * prof);
  g.respiro = resp;
  const estira = Math.max(0, progreso(g, 'acomodarse', ahora));
  const est = campana(estira, 0, 1);
  g.el.querySelector('.g-respira')?.setAttribute('transform', `translate(220 193) scale(${r2(1 + est * 0.025)} ${r2(1 + 0.022 * resp - est * 0.02)}) translate(-220 -193)`);
  orejas(g, ahora);
  const cab = g.el.querySelector('.g-cabeza');
  let alza = 0, abiertos = 0, bost = 0, giro = 0;
  if (g.despierta) {
    const d = (ahora - g.despierta) / 1000;
    alza = suave(tramo(d, 0, 0.7)) * (1 - suave(tramo(d, 3.8, 4.6)));
    abiertos = tramo(d, 0.35, 0.45) * (1 - tramo(d, 3.6, 3.7));
    bost = campana(d, 0.9, 2.1);
    giro = alza * 9;
    const lento = campana(d, 2.4, 3.4) * 0.8; // parpadeo lento antes de volver a dormir
    if (abiertos) ojos(g, ahora, Math.max(bost * 0.6, lento));
    if (d > 4.7) g.despierta = 0;
  }
  cab?.setAttribute('transform', `translate(${r2(est * -4)} ${r2(-24 * alza - 1.2 * resp + est * 2)}) rotate(${r2(giro + est * -4)})`);
  g.el.querySelector('.g-cara-despierta')?.setAttribute('opacity', abiertos);
  g.el.querySelector('.g-cara-dormida')?.setAttribute('opacity', 1 - abiertos);
  boca(g, bost, bost * 0.8);
  // sueño: la pata se mueve como si corriera; bigotes
  const sueno = progreso(g, 'sueno', ahora);
  const pata = sueno >= 0 ? Math.sin(sueno * Math.PI * 9) * 6 * campana(sueno, 0, 1) : 0;
  const ep = campana(progreso(g, 'estirar-pata', ahora), 0, 1); // estira la pata delantera
  g.el.querySelector('.g-pata')?.setAttribute('transform', `translate(${r2(-18 * ep)} ${r2(2 * ep)}) rotate(${r2(pata - 10 * ep)} 80 180)`);
  const big = progreso(g, 'bigotes', ahora);
  rasgos(g, 0, big >= 0 ? Math.sin(big * Math.PI * 6) * 0.8 * campana(big, 0, 1) : 0);
  const lat = progreso(g, 'latigo', ahora);
  g.latigo = lat >= 0 ? campana(lat, 0, 1) : (g.encima ? 0.3 : 0);
  g.cola?.paso(dt, t, g);
}

// --- sentado: mira alrededor, ladea la cabeza, se acicala, la cola da golpecitos
function animarSentado(g, ahora, dt) {
  const t = ahora / 1000;
  programar(g, ahora);
  const resp = Math.sin((t * Math.PI * 2) / 3.1);
  g.el.querySelector('.g-respira')?.setAttribute('transform', `translate(130 296) scale(1 ${r2(1 + 0.012 * resp)}) translate(-130 -296)`);
  const lado = g.accion?.lado ?? 1;
  // a dónde mira
  const mir = progreso(g, 'mirar', ahora);
  let gx = 0, gy = 0.15, tilt = 0, dil = 0;
  if (mir >= 0) gx = lado * (campana(mir, 0, 0.45) - campana(mir, 0.5, 0.95));
  const inc = progreso(g, 'inclinar', ahora);
  if (inc >= 0) {
    tilt = lado * 15 * suave(Math.min(1, inc * 3)) * (1 - suave(tramo(inc, 0.75, 1)));
    gy = -0.7 * (1 - tramo(inc, 0.75, 1)); // mira hacia arriba, como en la foto
  }
  const p = haciaPuntero(g, 0.25);
  if (p && (g.encima || p.lejos < 500)) {
    gx = p.dx;
    gy = p.dy;
    tilt = g.encima ? -p.dx * 10 + 6 : tilt;
    dil = g.encima ? 1 : 0.4;
  }
  if (g.clic) {
    const d = (ahora - g.clic) / 1000;
    tilt = 12 * campana(d, 0, 1.8);
    if (d > 1.9) g.clic = 0;
  }
  // cazar una mosca: la sigue con la mirada y le tira un zarpazo
  const fm = progreso(g, 'cazar-mosca', ahora);
  const fly = mosca(g, fm, 130, 34);
  let zarpa = 0;
  if (fly && fm < 0.8) {
    const vx = fly[0] - 130, vy = fly[1] - 80, nn = Math.hypot(vx, vy) || 1;
    gx = vx / nn;
    gy = vy / nn;
    dil = 0.9;
    tilt = gx * 9;
    zarpa = campana(fm, 0.7, 0.86);
  }
  const sac = sacudidas(g, ahora);
  tilt += sac.giro;
  // amasar: las patas delanteras suben y bajan por turnos
  const amP = progreso(g, 'amasar', ahora);
  const amasa = amP >= 0 ? campana(amP, 0, 1) : g.encima && ahora - (g.encimaDesde || ahora) > 2500 ? 1 : 0;
  const ciclo = Math.sin(t * Math.PI * 2.6);
  const alzaIzq = amasa * 8 * Math.max(0, ciclo), alzaDer = amasa * 8 * Math.max(0, -ciclo);
  g.el.querySelector('.g-pata-quieta')?.setAttribute('transform', `translate(0 ${r2(-alzaIzq)})`);
  mirada(g, gx, gy, dil);
  // acicalarse: la pata derecha sube a la boca, la lengua la lame
  const aci = progreso(g, 'acicalarse', ahora);
  const subeAci = aci >= 0 ? suave(tramo(aci, 0, 0.18)) * (1 - suave(tramo(aci, 0.86, 1))) : 0;
  const sube = Math.max(subeAci, zarpa);
  const lame = aci >= 0 && aci > 0.2 && aci < 0.84 ? Math.max(0, Math.sin(aci * Math.PI * 14)) : 0;
  const hombro = [149, 206 - 30 * sube];
  const reposo = [150, alzaDer > 0 ? 287 - alzaDer : 300];
  const boca0 = [134 + tilt * 0.3, 128];
  const objetivo = zarpa > subeAci
    ? [reposo[0] + (fly[0] - reposo[0]) * zarpa, reposo[1] + (fly[1] - reposo[1]) * zarpa]
    : [reposo[0] + (boca0[0] + 4 * lame - reposo[0]) * sube, reposo[1] + (boca0[1] + 3 * lame - reposo[1]) * sube];
  const [codo, mano] = ik(hombro, objetivo, 41, 40, -1);
  // En reposo la pata queda detrás de la pechera; al acicalarse pasa al frente.
  const alFrente = sube > 0.02;
  if (g.alFrente !== alFrente) {
    g.alFrente = alFrente;
    const pataEl = g.el.querySelector('.g-pata-acicala'), pechera = g.el.querySelector('.g-pechera');
    if (pataEl && pechera) (alFrente ? pechera.after(pataEl) : pechera.before(pataEl));
  }
  const brazo = g.el.querySelector('.g-brazo'), ante = g.el.querySelector('.g-antebrazo');
  linea(brazo, hombro, codo);
  linea(ante, codo, mano);
  linea(g.el.querySelector('.g-antebrazo-r'), codo, mano);
  const manoEl = g.el.querySelector('.g-mano');
  manoEl?.setAttribute('cx', r2(mano[0]));
  manoEl?.setAttribute('cy', r2(mano[1] + 2 - sube * 4));
  manoEl?.setAttribute('transform', `rotate(${r2(-sube * 70)} ${r2(mano[0])} ${r2(mano[1])})`);
  // la cabeza baja hacia la pata cuando se acicala
  const bost = campana(progreso(g, 'bostezo', ahora), 0.1, 0.8);
  const rel = progreso(g, 'relamerse', ahora);
  const lengua = Math.max(lame * sube, rel >= 0 ? campana(rel, 0.1, 0.9) : 0, bost * 0.7);
  const maulla = g.clic ? campana((ahora - g.clic) / 1000, 0.05, 0.75) : 0;
  boca(g, Math.max(bost, maulla), lengua);
  const cab = g.el.querySelector('.g-cabeza');
  cab?.setAttribute('transform', `rotate(${r2(tilt - subeAci * 8)} 0 30) translate(${r2(-subeAci * 4 + gx * 2)} ${r2(subeAci * 10 + 1.4 * resp + sac.dy)})`);
  rasgos(g, gx * 7 - subeAci * 3, gy * 2);
  const lento = progreso(g, 'parpadeo-lento', ahora);
  ojos(g, ahora, Math.max(lento >= 0 ? campana(lento, 0, 1) * 0.85 : 0, subeAci * 0.7, bost * 0.8, sac.cierre, amasa * 0.55));
  g.orejaGiro = (mir >= 0 ? lado * 10 * campana(mir, 0, 1) : 0) + sac.orejas;
  orejas(g, ahora);
  const tap = progreso(g, 'golpecitos', ahora);
  g.tap = tap >= 0 ? Math.abs(Math.sin(tap * Math.PI * 3)) : (g.encima ? 0.4 + 0.4 * Math.abs(Math.sin(t * 5)) : 0);
  const bar = progreso(g, 'barrer', ahora);
  g.barrer = bar >= 0 ? campana(bar, 0, 1) : 0;
  g.cola?.paso(dt, t, g);
}

// --- asomado: sigue el cursor con la mirada; cola colgando; zarpazo al clic
function animarAsomado(g, ahora, dt) {
  const t = ahora / 1000;
  programar(g, ahora);
  const s = 1 + 0.015 * Math.sin((t * Math.PI * 2) / 3);
  g.el.querySelector('.g-respira')?.setAttribute('transform', `translate(160 172) scale(1 ${r2(s)}) translate(-160 -172)`);
  let p = haciaPuntero(g, 0.3) || { dx: 0, dy: 0.6 };
  // cazar una mosca: la sigue con la mirada y le tira un zarpazo
  const fm = progreso(g, 'cazar-mosca', ahora);
  const fly = mosca(g, fm, 160, 66);
  if (fly && fm < 0.8) {
    const vx = fly[0] - 160, vy = fly[1] - 106, nn = Math.hypot(vx, vy) || 1;
    p = { dx: vx / nn, dy: vy / nn };
    if (fm > 0.72 && !g.zarpaMosca) {
      g.zarpaMosca = true;
      g.zarpazo = ahora;
    }
  } else if (fm < 0) g.zarpaMosca = false;
  mirada(g, p.dx, p.dy, g.encima || fly ? 1 : 0);
  const sac = sacudidas(g, ahora);
  const inc = progreso(g, 'inclinar', ahora);
  const tilt = (inc >= 0 ? (g.accion.lado * 14) * campana(inc, 0, 1) : 0) + sac.giro;
  const cab = g.el.querySelector('.g-cabeza');
  cab?.setAttribute('transform', `rotate(${r2(g.mx * 9 + tilt + (g.encima ? -6 : 0))} 0 30) translate(0 ${r2(g.my * 2 + sac.dy)})`);
  rasgos(g, g.mx * 4, g.my * 1.5);
  const bost = campana(progreso(g, 'bostezo', ahora), 0.1, 0.8);
  const rel = progreso(g, 'relamerse', ahora);
  boca(g, bost, Math.max(rel >= 0 ? campana(rel, 0.1, 0.9) : 0, bost * 0.7));
  const lento = progreso(g, 'parpadeo-lento', ahora);
  ojos(g, ahora, Math.max(lento >= 0 ? campana(lento, 0, 1) * 0.85 : 0, bost * 0.8, sac.cierre));
  g.orejaGiro = sac.orejas;
  orejas(g, ahora);
  const lat = progreso(g, 'latigo', ahora);
  g.latigo = lat >= 0 ? campana(lat, 0, 1) * 0.6 : 0;
  g.cola?.paso(dt, t, g);
  const pata = g.el.querySelector('.g-pata');
  if (pata) {
    const d = g.zarpazo ? (ahora - g.zarpazo) / 1000 : 9;
    const golpe = d < 0.75 ? Math.abs(Math.sin(d * Math.PI * 2.7)) * (1 - d / 0.75) : 0;
    // curiosidad: si el cursor está cerca, la pata se asoma un poquito
    g.curioso = (g.curioso || 0) + ((g.encima ? 1 : 0) - (g.curioso || 0)) * 0.06;
    const asoma = g.curioso * (4 + 3 * Math.sin(t * 3));
    pata.setAttribute('transform', `translate(0 ${r2(-26 * golpe - asoma)}) rotate(${r2(-22 * golpe)} 113 168)`);
  }
}

// --- camina: recorre su carril (un entrepaño o el techo del mueble). No
// atraviesa paredes: frena al llegar al costado y da media vuelta (también a
// veces a mitad de camino). Se detiene a mirarte, a olfatear los libros o a
// estirarse; a veces trota, y salta al entrepaño de arriba o de abajo si
// está libre: mide el salto, se agacha, vuela en parábola y amortigua.
function limites(g, W, ancho) {
  // el cuerpo ocupa ~10–90 % de la caja (la cola sobresale por detrás)
  return g.dir > 0 ? [-0.2 * ancho, W - 0.92 * ancho] : [-0.08 * ancho, W - 0.8 * ancho];
}

function carrilVecino(g, cont) {
  const lista = g.carriles?.() || [];
  const i = lista.findIndex((c) => c.el === cont);
  if (i < 0) return null;
  const opciones = lista.filter((c) => Math.abs(c.k - lista[i].k) === 1 && c.libre && !c.el.querySelector('.gato-camina'));
  return opciones.length ? { destino: opciones[Math.floor(Math.random() * opciones.length)], origen: lista[i] } : null;
}

// Tiempos (ms) y física del salto. La gravedad es la real (9.81 m/s²), en la
// escala de los libros: el gato vuela lo que tardaría un gato de verdad.
const GIRO_MS = 1050, APUNTA_MS = 1000, ATERRIZA_MS = 460;
const G_MM = 9810;
// Pose de las patas en el aire: [avance del salto, dx, dy (mm, desde el
// hombro o la cadera), flexión]. Despegue: manos al frente y patas traseras
// estiradas hacia atrás; vuelo: recogidas; final: manos abajo para aterrizar.
const VUELO = {
  del: [[0, 58, 96, 0], [0.38, 44, 82, 0.6], [0.72, 28, 124, 0.1], [1, 12, 124, 0]],
  tras: [[0, -74, 120, 0], [0.38, 18, 104, 0.85], [0.72, 32, 114, 0.45], [1, 4, 140, 0]],
};
function pieVuelo(del, u) {
  const k = VUELO[del ? 'del' : 'tras'];
  let i = 0;
  while (i < k.length - 2 && u > k[i + 1][0]) i++;
  const [u0, x0, y0, f0] = k[i], [u1, x1, y1, f1] = k[i + 1];
  const s = suave(tramo(u, u0, u1));
  return { dx: x0 + (x1 - x0) * s, dy: y0 + (y1 - y0) * s, flex: f0 + (f1 - f0) * s };
}

function animarCamina(g, ahora, dt) {
  const cont = g.el.parentElement;
  const W = cont?.clientWidth || 800;
  const k = parseFloat(g.el.style.getPropertyValue('--k')) || 1;
  const ancho = POSES.camina.ancho * k;
  programar(g, ahora);
  if (g.estado === undefined) {
    g.dir = Math.random() < 0.5 ? 1 : -1;
    const [lo, hi] = limites(g, W, ancho);
    g.x = lo + Math.random() * Math.max(0, hi - lo);
    g.y = 0;
    g.rot = 0;
    g.estado = menosMovimiento() ? 'mira' : 'camina';
    g.fase = Math.random();
    g.trote = 0;
    g.impulso = 1;
  }
  const est = (nuevo, dur = 0, extra = {}) => Object.assign(g, { estado: nuevo, t0: ahora, hasta: ahora + dur, ...extra });
  const [lo, hi] = limites(g, W, ancho);
  const s = g.hasta > g.t0 ? Math.min(1, (ahora - g.t0) / (g.hasta - g.t0)) : 1;
  // trote ocasional; arranca despacio después de girar o aterrizar
  g.trote = Math.max(0, g.trote - dt / 2.8);
  g.impulso = Math.min(1, (g.impulso ?? 1) + dt * 1.8);
  const vel = VEL_MM * k * (1 + 0.75 * Math.min(1, g.trote * 3));
  const periodo = PERIODO / (1 + 0.45 * Math.min(1, g.trote * 3));
  let rotObjetivo = 0;

  if (g.estado === 'camina') {
    if (g.encima) est('mira');
    // frena al acercarse a la pared (y la zancada se acorta con la velocidad)
    const resta = g.dir > 0 ? hi - g.x : g.x - lo;
    const f = Math.min(1, Math.max(0.3, resta / (ancho * 0.25))) * (0.3 + 0.7 * suave(g.impulso));
    g.x += g.dir * vel * f * dt;
    g.fase = (g.fase + (dt / periodo) * f) % 1;
    if (resta <= 0) {
      g.x = Math.min(hi, Math.max(lo, g.x));
      est('gira', GIRO_MS);
    } else if (!menosMovimiento()) {
      const lejosDePared = g.x > lo + ancho * 0.35 && g.x < hi - ancho * 0.35;
      const r = Math.random();
      if (r < dt * 0.11) est('pausa', azarEntre(1800, 3400), { sub: elegir([['mira', 0, 4], ['olfatear', 0, 3], ['estirarse', 0, 2.5]])[0] });
      else if (r < dt * 0.17 && lejosDePared) {
        const v = carrilVecino(g, cont);
        if (v) est('apunta', APUNTA_MS, { salto: v, arriba: v.destino.k < v.origen.k });
      } else if (r < dt * 0.19 && lejosDePared) est('gira', GIRO_MS); // media vuelta sin llegar a la pared
      else if (r < dt * 0.24 && !g.trote) g.trote = 1;
    }
  } else if (g.estado === 'gira') {
    if (s >= 1) {
      g.dir *= -1;
      g.impulso = 0;
      est('camina');
    }
  } else if (g.estado === 'apunta') {
    // mide el salto, se agacha, menea la cadera… y despega
    if (s >= 1) {
      const { destino } = g.salto;
      const dyPx = destino.el.getBoundingClientRect().bottom - cont.getBoundingClientRect().bottom;
      const D = -dyPx / k; // mm; positivo = hacia arriba
      const H = D > 0 ? D + 45 : 40; // altura máxima sobre el despegue (los pies libran el borde)
      const vy = Math.sqrt(2 * G_MM * H);
      const T = vy / G_MM + Math.sqrt((2 * (H - D)) / G_MM);
      est('vuela', T * 1000, { vuelo: { vy, vx: 165 / T, x0: g.x } });
    }
  } else if (g.estado === 'vuela') {
    // tiro parabólico: x = x0 + vx·t ; y = vy·t − g·t²/2
    const v = g.vuelo;
    const t = (s * (g.hasta - g.t0)) / 1000;
    g.x = v.x0 + g.dir * v.vx * t * k;
    g.y = -(v.vy * t - 0.5 * G_MM * t * t) * k;
    const ang = Math.atan2(v.vy - G_MM * t, v.vx) / RAD; // dirección del vuelo
    rotObjetivo = -Math.max(-24, Math.min(26, ang * 0.38)); // negativo = nariz arriba
    if (s >= 1) {
      g.salto.destino.el.append(g.el); // aterriza en el otro entrepaño
      g.y = 0;
      g.x = Math.min(hi, Math.max(lo, g.x));
      est('aterriza', ATERRIZA_MS);
    }
  } else if (g.estado === 'aterriza') {
    if (s >= 1) {
      g.impulso = 0;
      est('camina');
    }
  } else if (g.estado === 'pausa') {
    if (ahora > g.hasta) est('camina');
    if (g.encima) est('mira');
  } else if (g.estado === 'mira' && !g.encima && !g.maullando && !menosMovimiento()) {
    est('camina');
  }
  // inclinación suave (en el despegue la rotación entra rápido, no de golpe)
  g.rot = (g.rot || 0) + (rotObjetivo - (g.rot || 0)) * Math.min(1, dt * (g.estado === 'vuela' ? 16 : 10));

  const andando = g.estado === 'camina';
  g.andando = andando;
  g.paso = (g.paso ?? 0) + ((andando ? 1 : 0) - (g.paso ?? 0)) * Math.min(1, dt * (andando ? 8 : 6));
  g.colaArriba = (g.colaArriba || 0) + ((g.estado === 'gira' ? 1 : 0) - (g.colaArriba || 0)) * Math.min(1, dt * 4);
  g.colaRecta = (g.colaRecta || 0) + ((g.estado === 'apunta' || g.estado === 'vuela' ? 1 : 0) - (g.colaRecta || 0)) * Math.min(1, dt * 5);

  // Media vuelta: el gato gira sobre sí mismo. De perfil se ve largo; a la
  // mitad del giro queda de frente (cuerpo acortado, cara hacia ti, la cabeza
  // al centro) y termina mirando al otro lado.
  let sx = g.dir, cabezaGiro = '', deFrente = 0;
  if (g.estado === 'gira') {
    const th = Math.PI * suave(tramo(s, 0.1, 0.9));
    const c = Math.cos(th), sn = Math.sin(th);
    const mag = Math.max(0.3, Math.abs(c));
    sx = g.dir * (c >= 0 ? 1 : -1) * mag;
    const crece = 1 + 0.06 * sn; // se acerca un poco a ti
    cabezaGiro = `translate(${r2(-174 * sn)} ${r2(10 * sn)}) translate(474 100) scale(${r2(crece / mag)} ${r2(crece)}) translate(-474 -100) `;
    deFrente = campana(s, 0.04, 0.96) > 0.35 ? 1 : 0;
  }
  g.el.style.transform = `translate(${r2(g.x)}px, ${r2(g.y)}px) scaleX(${r2(sx)}) rotate(${r2(g.rot)}deg)`;

  // estirarse / olfatear (durante las pausas)
  const enPausa = g.estado === 'pausa';
  const pp = enPausa ? s : -1;
  const estira = enPausa && g.sub === 'estirarse' ? campana(pp, 0, 1) : 0;
  const olfa = enPausa && g.sub === 'olfatear' ? campana(pp, 0, 1) : 0;
  // agacharse antes del salto (con meneo de cadera) y amortiguar al caer
  let agacha = 0, meneo = 0, cabeceo = 0;
  if (g.estado === 'apunta') {
    agacha = 26 * suave(tramo(s, 0.25, 0.7));
    meneo = 4 * Math.sin((ahora - g.t0) / 1000 * Math.PI * 2 * 5.5) * campana(s, 0.5, 0.97);
    cabeceo = (g.arriba ? -17 : 20) * suave(tramo(s, 0, 0.3));
  } else if (g.estado === 'vuela') {
    cabeceo = -g.rot * 0.5; // la cabeza compensa: los ojos siguen el aterrizaje
  } else if (g.estado === 'aterriza') {
    agacha = 24 * Math.sin(Math.PI * Math.pow(s, 0.6));
  }
  const bote = Math.sin(g.fase * Math.PI * 4) * 2.4 * g.paso + agacha;
  const enAire = g.estado === 'vuela';
  g.el.querySelectorAll('.g-pata-c').forEach((el) => {
    const clave = el.dataset.p;
    const del = PATAS[clave].del;
    const b0 = del ? bote : bote + meneo;
    if (enAire) {
      dibujarPata(el, articulaciones(clave, 0, false, 0, 0, pieVuelo(del, s)), del);
      return;
    }
    const a = articulaciones(clave, g.fase, true, b0);
    const b = articulaciones(clave, g.fase, false, b0, estira);
    const mezcla = (u, v) => [v[0] + (u[0] - v[0]) * g.paso, v[1] + (u[1] - v[1]) * g.paso];
    dibujarPata(el, { raiz: a.raiz, codo: mezcla(a.codo, b.codo), medio: mezcla(a.medio, b.medio), pata: mezcla(a.pata, b.pata), flexion: a.flexion * g.paso }, del);
  });
  // el meneo baja y sube la cadera girando el cuerpo sobre los hombros
  const giroMeneo = -Math.atan(meneo / 188) / RAD;
  g.el.querySelector('.g-cuerpo')?.setAttribute('transform', `translate(0 ${r2(bote + estira * 10)}) rotate(${r2(estira * 7)} 200 180) rotate(${r2(giroMeneo)} 394 192)`);
  const nariz = olfa ? Math.sin(ahora / 70) * 1.2 : 0;
  g.el.querySelector('.g-cabeza-mov')?.setAttribute('transform', `${cabezaGiro}translate(${r2(olfa * 10 + estira * 6)} ${r2(bote * 0.4 + agacha * 0.5 + olfa * 26 + estira * 24 + nariz)}) rotate(${r2(olfa * 16 + estira * 8 + cabeceo)} 474 92)`);
  const lat = progreso(g, 'latigo', ahora);
  g.latigo = lat >= 0 ? campana(lat, 0, 1) * 0.6 : 0;
  g.cola?.paso(dt, ahora / 1000, g);
  const frente = g.estado === 'mira' || (enPausa && g.sub === 'mira') || deFrente;
  g.mirar = (g.mirar ?? 0) + ((frente ? 1 : 0) - (g.mirar ?? 0)) * Math.min(1, dt * 9);
  g.el.querySelector('.g-perfil')?.setAttribute('opacity', r2(1 - g.mirar));
  g.el.querySelector('.g-frente')?.setAttribute('opacity', r2(g.mirar));
  ojos(g, ahora, estira * 0.7);
  orejas(g, ahora);
  const d = g.maullando ? (ahora - g.maullando) / 1000 : 9;
  boca(g, Math.max(d < 0.75 ? Math.sin(Math.PI * Math.min(1, d / 0.7)) : 0, estira * 0.8), estira * 0.5);
  if (g.maullando && d > 1.6) g.maullando = 0;
}

const ANIMAR = { dormido: animarDormido, sentado: animarSentado, asomado: animarAsomado, camina: animarCamina };

function cuadro(ahora) {
  const dt = Math.min(0.05, (ahora - (cuadro.antes || ahora)) / 1000);
  cuadro.antes = ahora;
  for (const g of activos) {
    if (!g.el.isConnected) {
      activos.delete(g);
      continue;
    }
    if (!g.el.offsetParent) continue; // vista oculta
    ANIMAR[g.pose](g, ahora, dt);
  }
  bucle = activos.size ? requestAnimationFrame(cuadro) : 0;
}

function interacciones(g) {
  const { el, P, pose } = g;
  el.addEventListener('pointerenter', () => {
    g.encima = true;
    g.encimaDesde = performance.now();
    const ahora = performance.now();
    if (pose === 'dormido' || pose === 'sentado') ronronear(P.tam > 1 ? 1.12 : 0.96);
    if (pose === 'dormido') forzar(g, 'oreja', 0.5, ahora);
    if (pose === 'asomado' && ahora - (g.ultimoTrino || 0) > 4000) {
      g.ultimoTrino = ahora;
      trino(P.voz);
    }
  });
  el.addEventListener('pointerleave', () => (g.encima = false));
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    const ahora = performance.now();
    if (pose === 'dormido') {
      if (!g.despierta) {
        g.despierta = ahora;
        setTimeout(() => el.isConnected && maullar(P.voz * 0.96), 950);
      }
    } else if (pose === 'sentado') {
      g.clic = ahora;
      g.accion = null;
      maullar(P.voz);
    } else if (pose === 'asomado') {
      g.zarpazo = ahora;
      trino(P.voz * 1.05);
    } else if (!['apunta', 'vuela', 'aterriza', 'gira'].includes(g.estado)) {
      g.estado = 'mira';
      g.maullando = ahora;
      maullar(P.voz);
      setTimeout(() => {
        if (el.isConnected && !g.encima && g.estado === 'mira') g.estado = 'camina';
      }, 1900);
    }
  });
}

// Activa los gatos que haya dentro de "raiz" (después de pintar).
// opciones.carriles(): entrepaños por los que puede caminar/saltar un gato.
export function activarGatos(raiz, opciones = {}) {
  raiz.querySelectorAll('.gato:not([data-vivo])').forEach((el) => {
    el.dataset.vivo = '1';
    const g = base(el);
    g.carriles = opciones.carriles;
    el._gato = g; // acceso para pruebas y depuración
    interacciones(g);
    activos.add(g);
    // primer cuadro inmediato (cola, patas) para que no aparezcan sin dibujar
    ANIMAR[g.pose](g, performance.now(), 0.016);
  });
  if (!bucle && activos.size) bucle = requestAnimationFrame(cuadro);
}
