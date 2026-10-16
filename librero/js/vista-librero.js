// Vista "Librero": un mueble de madera por repisa (categoría). El mueble se
// dimensiona para verse SIEMPRE completo en pantalla: se calcula cuántos
// entrepaños caben y se escala el tamaño de los libros para llenarlos.
// Si la repisa tiene más libros, se pasa de página (flechas discretas,
// teclas ← → o deslizando). La búsqueda arma un mueble de resultados y el
// orden "Fecha de adición" arma un mueble con todos los libros, del más
// reciente al más antiguo.

import { datos, nombreRepisa, filtros } from './datos.js';
import { geometria, lomoVertical, pila } from './lomos.js';
import { usar } from './iconos.js';
import { $, $$, esc, debounce, azar, animar, CURVA, menosMovimiento } from './util.js';
import { globo, ocultarGlobo } from './globo.js';
import { crearContador } from './contador.js';
import { abrirMorph, cerrarMorph, estaAbierto } from './morph.js';
import { sonar } from './sonidos.js';
import { ordenarPorFecha } from './orden.js';
import { htmlGato, activarGatos, anchoGato, POSES, GATOS, gatosActivos } from './gatos.js';

const CLAVE = 'librero.repisa';
// Alto de cada gato sobre el techo del mueble (mm), para reservar espacio.
const ALTO_TECHO_MM = { asomado: 138, dormido: 150, sentado: 296, camina: 330 };
const r2 = (n) => Math.round(n * 100) / 100;
const ALTO_MAX_MM = 285; // libro más alto previsto (pasta dura de formato grande)

export function crearVistaLibrero(raiz, { abrirFicha }) {
  let lista = [];
  let repisa = leerRepisa();
  let pagina = 0;
  let paginas = [];
  let medida = { ancho: 0, alto: 0 };
  let sal = Math.random(); // cambia en cada visita: los gatos eligen otros lugares
  let techo = null; // gato sobre el mueble en esta visita: { gato, pose, x }

  raiz.innerHTML = `
    <div class="mueble-marco">
      <header class="mueble-cab">
        <button type="button" class="mueble-titulo" aria-haspopup="true" aria-expanded="false">
          <span class="mueble-icono"></span>
          <strong class="mueble-nombre"></strong>
          <svg class="flecha-abajo" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 8l5 5 5-5"/></svg>
        </button>
        <p class="mueble-cuenta"><span class="cuenta-num"></span> <span class="cuenta-txt">libros</span></p>
        <div class="selector-repisas" hidden></div>
      </header>
      <div class="mueble-zona">
        <button type="button" class="mueble-flecha izq" data-paso="-1" aria-label="Anterior"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
        <div class="mueble">
          <div class="mueble-corona" aria-hidden="true"></div>
          <div class="mueble-cuerpo"><div class="mueble-contenido"></div></div>
          <div class="mueble-zoclo" aria-hidden="true"></div>
          <div class="mueble-techo"></div>
        </div>
        <button type="button" class="mueble-flecha der" data-paso="1" aria-label="Siguiente"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
      </div>
      <div class="mueble-puntos" aria-hidden="true"></div>
    </div>`;
  const cont = $('.mueble-contenido', raiz);
  const titulo = $('.mueble-titulo', raiz);
  const selector = $('.selector-repisas', raiz);
  const contador = crearContador($('.cuenta-num', raiz));

  function leerRepisa() {
    try {
      return localStorage.getItem(CLAVE) || 'ciencia-ficcion';
    } catch {
      return 'ciencia-ficcion';
    }
  }
  function guardarRepisa() {
    try {
      localStorage.setItem(CLAVE, repisa);
    } catch {
      /* sin almacenamiento */
    }
  }

  const buscando = () => !!filtros.q.trim();
  const porFecha = () => filtros.orden === 'fecha';
  const mezclado = () => buscando() || porFecha();
  const conLibros = () => datos.repisas.filter((r) => lista.some((b) => b.repisa === r.id));

  function librosActuales() {
    if (porFecha()) return ordenarPorFecha(lista, 'desc');
    if (buscando()) return lista.slice().sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));
    return lista
      .filter((b) => b.repisa === repisa)
      .sort((a, b) => (a.ubicacion?.posicion ?? 1e6) - (b.ubicacion?.posicion ?? 1e6) || a.titulo.localeCompare(b.titulo, 'es'));
  }

  // Cuántos entrepaños caben y a qué escala, para que el mueble se vea entero.
  // Si hay un gato sobre el mueble y no cabe encima, el mueble baja (y se
  // achica) lo justo: el gato conserva su tamaño real respecto a los libros.
  function calcularMedidas() {
    const zonaM = $('.mueble-zona', raiz);
    zonaM.style.marginTop = '0px';
    const zona = $('.mueble-cuerpo', raiz);
    const r = zona.getBoundingClientRect();
    const libre0 = innerHeight - Math.max(r.top, 120) - 78; // zoclo, puntos y respiro
    const corona = r.top - 33; // borde superior del mueble
    const cab = $('.mueble-cab', raiz).getBoundingClientRect();
    const tit = $('.mueble-titulo', raiz).getBoundingClientRect();
    const mueble = $('.mueble', raiz).getBoundingClientRect();
    const objetivo = innerWidth < 600 ? 200 : 280; // angosto: más entrepaños, más bajos
    let reserva = 0, m;
    const medidas = (res) => {
      const libre = libre0 - res;
      const estantes = Math.min(4, Math.max(1, Math.round(libre / objetivo)));
      const altoFila = Math.max(150, libre / estantes);
      const escala = Math.min(1.45, Math.max(0.42, (altoFila - 40) / ALTO_MAX_MM));
      return { estantes, altoFila, escala, ancho: (cont.clientWidth || r.width || 900) - 10 };
    };
    // La reserva solo crece hasta que el gato cabe (así siempre converge).
    for (let i = 0; i < 10; i++) {
      m = medidas(reserva);
      const { escala } = m;
      if (!techo) break;
      const k = escala * GATOS[techo.gato].tam;
      let necesita = 0;
      const altoGato = ALTO_TECHO_MM[techo.pose] * k;
      // ¿Cabe a un lado del título? Si no (o si camina), se queda bajo el título.
      const anchoG = POSES[techo.pose].ancho * k;
      const izq = tit.left - mueble.left - 24, der = mueble.right - tit.right - 24;
      techo.xpx = null;
      if (techo.pose !== 'camina' && Math.max(izq, der) >= anchoG) {
        const lado = techo.x < 0.5 ? (izq >= anchoG ? 'izq' : 'der') : der >= anchoG ? 'der' : 'izq';
        const holgura = (lado === 'izq' ? izq : der) - anchoG;
        techo.xpx = lado === 'izq' ? 12 + holgura * (techo.x * 2 % 1) * 0.6 : mueble.width - anchoG - 12 - holgura * (techo.x * 2 % 1) * 0.6;
        necesita = Math.max(0, altoGato - (corona - 4));
      } else {
        const libreArriba = corona - Math.max(cab.bottom, tit.bottom) - 2;
        necesita = Math.max(0, altoGato - libreArriba);
        if (techo.pose !== 'camina') techo.xpx = techo.x < 0.5 ? 12 : mueble.width - anchoG - 12;
      }
      if (necesita <= reserva + 1) break;
      reserva = necesita;
    }
    // medidas definitivas con la reserva final (si no, el mueble se sale de la pantalla)
    if (techo) {
      reserva = Math.ceil(reserva);
      m = medidas(reserva);
      // Si no hay espacio ni con el mueble al mínimo, el gato elige algo más bajo.
      if (libre0 - reserva < 170) {
        const siguiente = { camina: 'dormido', sentado: 'dormido', dormido: 'asomado', asomado: null }[techo.pose];
        techo = siguiente ? { ...techo, pose: siguiente } : null;
        return calcularMedidas();
      }
    }
    zonaM.style.marginTop = `${reserva}px`;
    return m;
  }

  // ¿Quién se sube al mueble en esta visita? (en pantallas angostas, nadie:
  // taparía el título)
  function elegirTecho() {
    const sem = `${semilla()}·${sal}`;
    const r = azar(sem, 'techo');
    if (innerWidth < 700 || r < 0.22) return null;
    const pose = r < 0.47 ? 'asomado' : r < 0.67 ? 'dormido' : r < 0.84 ? 'camina' : 'sentado';
    const gato = azar(sem, 'quien') < 0.5 ? 'petri' : 'folfiri';
    const izq = azar(sem, 'lado') < 0.5;
    return { gato, pose, x: izq ? 0.04 + azar(sem, 'x') * 0.1 : 0.62 + azar(sem, 'x') * 0.12 };
  }

  function unidades(libros, escala) {
    const res = [];
    for (let i = 0; i < libros.length; i++) {
      const b = libros[i];
      const u = b.ubicacion || {};
      if (!mezclado() && u.orientacion === 'horizontal' && u.pila) {
        const grupo = [b];
        while (libros[i + 1]?.ubicacion?.pila === u.pila) grupo.push(libros[++i]);
        const p = pila(grupo, escala);
        res.push({ html: p.html, ancho: p.ancho + 6 * escala });
      } else {
        const g = geometria(b, escala);
        const incl = mezclado() ? 0 : Math.abs(u.inclinacion || 0);
        const hueco = incl ? g.alto * Math.sin((incl * Math.PI) / 180) : 0;
        const libro = mezclado() ? { ...b, ubicacion: { ...u, inclinacion: 0 } } : b;
        res.push({ html: lomoVertical(libro, g), ancho: g.grosor + hueco + 1 });
      }
    }
    return res;
  }

  const semilla = () => (porFecha() ? 'fecha' : buscando() ? `q:${filtros.q.trim()}` : repisa);

  // Repisa casi vacía: los libros se reparten en grupos por todos los
  // entrepaños; algunos grupos se acuestan en pilas y a veces un libro se
  // recarga en sus vecinos, como en un librero real con espacio de sobra.
  function dispersar(libros, m) {
    const sem = semilla();
    const rnd = (k) => azar(sem, k);
    const grupos = [];
    for (let i = 0, g = 0; i < libros.length; g++) {
      const n = Math.min(libros.length - i, 1 + Math.floor(rnd(`t${g}`) * 4));
      grupos.push(libros.slice(i, i + n));
      i += n;
    }
    const piezas = grupos.map((gr, gi) => {
      const acostados = gr.length >= 2 ? rnd(`h${gi}`) < 0.5 : rnd(`h${gi}`) < 0.2;
      if (acostados) {
        const conDesfase = gr.map((b, j) => ({ ...b, ubicacion: { ...(b.ubicacion || {}), desfase_mm: (rnd(`d${gi}-${j}`) - 0.5) * 26, inclinacion: (rnd(`r${gi}-${j}`) - 0.5) * 1.6 } }));
        const p = pila(conDesfase, m.escala);
        return { html: p.html, ancho: p.ancho + 8 };
      }
      let html = '', ancho = 0, recargado = false;
      gr.forEach((b, j) => {
        const g = geometria(b, m.escala);
        const ultimo = j === gr.length - 1;
        const incl = ultimo && gr.length > 1 && rnd(`i${gi}`) < 0.45 ? 6 + rnd(`a${gi}`) * 9 : 0;
        if (incl) recargado = true;
        html += lomoVertical({ ...b, ubicacion: { ...(b.ubicacion || {}), inclinacion: incl } }, g);
        ancho += g.grosor + (incl ? g.alto * Math.sin((incl * Math.PI) / 180) : 0) + 1;
      });
      if (!recargado && rnd(`s${gi}`) < 0.45) {
        html += sujetalibros(`${sem}${gi}`);
        ancho += 52;
      }
      return { html: `<div class="grupo-libros">${html}</div>`, ancho };
    });
    // Reservar lugar para que duerman los gatos (si sobra espacio) y repartir
    // el resto por ancho entre los entrepaños, conservando el orden.
    const total = piezas.reduce((s, p) => s + p.ancho, 0);
    const filas = Array.from({ length: m.estantes }, () => ({ items: [], usado: 0, disperso: true }));
    const cap = filas.map(() => m.ancho * 0.92);
    const cama = anchoGato('folfiri', 'dormido', m.escala) + 40;
    let camas = Math.min(2, m.estantes);
    while (camas && total + camas * cama >= m.estantes * m.ancho * 0.9) camas--;
    if (camas) {
      const elegidos = new Set();
      for (let c = 0; c < camas; c++) {
        let k = Math.floor(rnd(`cama${c}`) * m.estantes);
        while (elegidos.has(k)) k = (k + 1) % m.estantes;
        elegidos.add(k);
        cap[k] = Math.max(0, cap[k] - cama);
      }
    }
    const capTotal = cap.reduce((s, c) => s + c, 0) || 1;
    const corte = cap.map((_, k) => (total * cap.slice(0, k + 1).reduce((s, c) => s + c, 0)) / capTotal);
    let acumulado = 0;
    piezas.forEach((p) => {
      const centro = acumulado + p.ancho / 2;
      let k = corte.findIndex((c) => centro <= c + 0.01);
      if (k < 0) k = m.estantes - 1;
      filas[k].items.push(p);
      filas[k].usado += p.ancho;
      acumulado += p.ancho;
    });
    return filas;
  }

  function armarPaginas() {
    techo = librosActuales().length && gatosActivos() ? elegirTecho() : null;
    const m = calcularMedidas();
    medida = { ancho: innerWidth, alto: innerHeight };
    const libros = librosActuales();
    const us = unidades(libros, m.escala);
    const total = us.reduce((s, u) => s + u.ancho, 0);
    paginas = [];
    if (libros.length && total < m.estantes * m.ancho * 0.5) {
      paginas = [dispersar(libros, m)];
      return m;
    }
    const filas = [];
    let fila = { items: [], usado: 0 };
    for (const u of us) {
      if (fila.usado + u.ancho > m.ancho && fila.items.length) {
        filas.push(fila);
        fila = { items: [], usado: 0 };
      }
      fila.items.push(u);
      fila.usado += u.ancho;
    }
    if (fila.items.length) filas.push(fila);
    for (let i = 0; i < Math.max(1, filas.length); i += m.estantes) paginas.push(filas.slice(i, i + m.estantes));
    return m;
  }

  function sujetalibros(semilla) {
    return `<span class="sujetalibros ${azar(semilla, 'sj') < 0.5 ? 'laton' : 'piedra'}" aria-hidden="true"><i></i><b></b></span>`;
  }

  // ¿Dónde están Petri y Folfiri en esta página? Duermen donde haya un hueco
  // de su tamaño; si no hay, uno se asoma desde arriba y el otro camina.
  // Cada gato elige dónde estar: dormir o sentarse en un hueco de su tamaño,
  // o caminar por cualquier entrepaño libre (o por el techo, si le tocó).
  // Cambia en cada visita; siempre respeta el espacio físico disponible.
  function ubicarGatos(filas, m) {
    const sem = `${semilla()}·${pagina}·${sal}`;
    const rnd = (k) => azar(sem, k);
    const huecos = filas.map((f, k) => ({ k, libre: m.ancho - (f?.usado || 0) - (f && !f.disperso ? 52 : 0) - (f?.disperso ? f.items.length * 14 : 0), ocupado: false }));
    const plan = { dormidos: {}, caminan: [], techo };
    const quedan = ['petri', 'folfiri'].filter((g) => g !== techo?.gato);
    if (rnd('orden') < 0.5) quedan.reverse();
    if (techo?.pose === 'camina') plan.caminan.push({ gato: techo.gato, k: -1 });
    for (const gato of quedan) {
      const dormir = anchoGato(gato, 'dormido', m.escala) + 24;
      const sentarse = anchoGato(gato, 'sentado', m.escala) + 24;
      const conLugar = huecos.filter((h) => !h.ocupado && h.libre >= sentarse);
      const carriles = huecos.filter((h) => !h.ocupado && !(plan.dormidos[h.k] || []).length && !plan.caminan.some((c) => c.k === h.k));
      const opciones = [];
      for (const h of conLugar) {
        if (h.libre >= dormir) opciones.push([{ pose: 'dormido', h }, 4]);
        opciones.push([{ pose: 'sentado', h }, 2.5]);
      }
      for (const h of carriles) opciones.push([{ pose: 'camina', h }, 2.6 / Math.max(1, carriles.length)]);
      if (!opciones.length) continue;
      let r = rnd(`elige-${gato}`) * opciones.reduce((s, o) => s + o[1], 0);
      const { pose, h } = opciones.find((o) => (r -= o[1]) <= 0)?.[0] || opciones[0][0];
      if (pose === 'camina') {
        plan.caminan.push({ gato, k: h.k });
        h.ocupado = true; // nadie duerme donde alguien camina
      } else {
        (plan.dormidos[h.k] ||= []).push({ gato, pose });
        h.libre -= pose === 'dormido' ? dormir : sentarse;
      }
    }
    return plan;
  }

  // Un entrepaño: piezas + gatos dormidos, con huecos repartidos al azar
  // (estable) cuando sobra espacio. "fin" es el sujetalibros final.
  function htmlFila(f, k, m, dormidos, fin) {
    const sem = `${semilla()}·${pagina}·${k}`;
    const hueco = (i, extremo) => `<span class="hueco" style="flex-grow:${r2((extremo ? 0.25 : 0.5) + azar(sem, `h${i}`) * (extremo ? 0.6 : 1))}"></span>`;
    const gatos = dormidos.map((g) => htmlGato(g.gato, g.pose, m.escala));
    const items = (f?.items || []).map((u) => u.html);
    if (fin && items.length) items[items.length - 1] += fin;
    if (f && !f.disperso) {
      // Lleno: los libros juntos a la izquierda y los gatos en el espacio que sobra.
      return items.join('') + (gatos.length ? gatos.map((g, j) => hueco(j, false) + g).join('') + hueco(99, true) : '');
    }
    gatos.forEach((g, j) => items.splice(Math.floor(azar(sem, `g${j}`) * (items.length + 1)), 0, g));
    if (!items.length) return '';
    return hueco(0, true) + items.map((h, i) => (i ? hueco(i, false) : '') + h).join('') + hueco(99, true);
  }

  function pintar(direccion = 0) {
    const m = armarPaginas();
    pagina = Math.min(pagina, paginas.length - 1);
    const filas = paginas[pagina] || [];
    const total = librosActuales().length;
    const plan = total && gatosActivos() ? ubicarGatos(Array.from({ length: m.estantes }, (_, k) => filas[k]), m) : { dormidos: {}, caminan: [], techo: null };
    let html = '';
    for (let k = 0; k < m.estantes; k++) {
      const f = filas[k];
      const fin = f && !f.disperso && k === filas.length - 1 && pagina === paginas.length - 1 ? sujetalibros(repisa) : '';
      const dormidos = plan.dormidos[k] || [];
      const contenido = htmlFila(f, k, m, dormidos, fin);
      const caminante = plan.caminan.filter((c) => c.k === k).map((c) => htmlGato(c.gato, 'camina', m.escala, `bottom:${-Math.round(8 * m.escala * GATOS[c.gato].tam)}px`)).join('');
      html += `<div class="estante" style="--alto-fila:${Math.round(m.altoFila)}px"><div class="estante-libros">${contenido}${caminante}</div><div class="tabla" aria-hidden="true"><i></i></div></div>`;
    }
    if (!total) html = `<div class="estante vacio-estante" style="--alto-fila:${Math.round(m.altoFila)}px"><p class="vacio">Ningún libro coincide.</p><div class="tabla"><i></i></div></div>`;
    cont.innerHTML = html;
    // Gato sobre el mueble: asomado, dormido, sentado o caminando por el techo.
    const t = plan.techo;
    const arriba = (pose, gato) => -Math.round(POSES[pose].suelo * m.escala * GATOS[gato].tam);
    $('.mueble-techo', raiz).innerHTML = !t ? ''
      : t.pose === 'camina' ? htmlGato(t.gato, 'camina', m.escala, `top:${arriba('camina', t.gato)}px`)
      : htmlGato(t.gato, t.pose, m.escala, `position:absolute;left:${Math.round(t.xpx ?? 0)}px;top:${arriba(t.pose, t.gato)}px;translate:0 0;`);
    activarGatos(raiz, {
      // entrepaños por los que se puede caminar o saltar (sin gatos quietos)
      carriles: () => $$('.estante', cont).map((e, k) => ({ k, el: $('.estante-libros', e), libre: !e.querySelector('.gato-dormido, .gato-sentado') })),
    });
    cabecera(total);
    $$('.estante', cont).forEach((e) => {
      $$('.lomo, .pila, .sujetalibros, .gato-dormido, .gato-sentado', e).forEach((el, i) => el.style.setProperty('--i', Math.min(i, 30)));
      e.classList.add('visto');
    });
    if (direccion && !menosMovimiento()) {
      animar(cont, [
        { transform: `translateX(${direccion * 40}px)`, opacity: 0, filter: 'blur(3px)' },
        { transform: 'none', opacity: 1, filter: 'blur(0)' },
      ], { duration: 380, easing: CURVA.cajon });
    }
  }

  function cabecera(total) {
    const rep = mezclado() ? null : repisa;
    $('.mueble-icono', raiz).innerHTML = usar(rep ? `rep-${rep}` : porFecha() && !buscando() ? 'rep-historia' : 'rep-negra');
    $('.mueble-nombre', raiz).textContent = rep ? nombreRepisa(rep) : buscando() ? `«${filtros.q.trim()}»` : 'Por fecha de adición';
    titulo.disabled = mezclado();
    contador.fijar(total);
    $('.cuenta-txt', raiz).textContent = total === 1 ? 'libro' : 'libros';
    $('.mueble-puntos', raiz).innerHTML = paginas.length > 1
      ? paginas.map((_, i) => `<i class="${i === pagina ? 'activo' : ''}"></i>`).join('') : '';
    $('.mueble-flecha.izq', raiz).hidden = mezclado() && pagina === 0;
    $('.mueble-flecha.der', raiz).hidden = mezclado() && pagina >= paginas.length - 1;
  }

  function irA(nuevaRepisa, nuevaPagina = 0, direccion = 1) {
    if (nuevaRepisa !== repisa) sal = Math.random();
    repisa = nuevaRepisa;
    pagina = nuevaPagina;
    guardarRepisa();
    ocultarGlobo();
    pintar(direccion);
  }

  function paso(d) {
    const nueva = pagina + d;
    sonar('slide');
    if (nueva >= 0 && nueva < paginas.length) {
      pagina = nueva;
      ocultarGlobo();
      return pintar(d);
    }
    if (mezclado()) return;
    const reps = conLibros();
    const i = reps.findIndex((r) => r.id === repisa);
    const sig = reps[(i + d + reps.length) % reps.length];
    repisa = sig.id;
    armarPaginas();
    irA(sig.id, d < 0 ? paginas.length - 1 : 0, d);
  }

  function abrirSelector(abrir) {
    titulo.setAttribute('aria-expanded', String(abrir));
    if (!abrir) {
      if (estaAbierto(selector)) sonar('collapse');
      return cerrarMorph(selector, titulo);
    }
    selector.innerHTML = conLibros()
      .map((r) => {
        const n = lista.filter((b) => b.repisa === r.id).length;
        return `<button type="button" class="opcion-repisa ${r.id === repisa ? 'activa' : ''}" data-ir="${r.id}">${usar(`rep-${r.id}`)}<span>${esc(r.nombre)}</span><small>${n}</small></button>`;
      })
      .join('');
    sonar('expand');
    abrirMorph(selector, titulo);
  }

  raiz.addEventListener('click', (e) => {
    if (e.target.closest('.mueble-titulo')) return abrirSelector(!estaAbierto(selector));
    const ir = e.target.closest('[data-ir]');
    if (ir) {
      abrirSelector(false);
      sonar('tap');
      return irA(ir.dataset.ir, 0, 1);
    }
    const p = e.target.closest('[data-paso]');
    if (p) return paso(Number(p.dataset.paso));
    const lomo = e.target.closest('.lomo');
    if (lomo) {
      sonar('tap');
      abrirFicha(lomo.dataset.id, lomo);
    }
  });
  addEventListener('pointerdown', (e) => {
    if (estaAbierto(selector) && !e.target.closest('.mueble-cab')) abrirSelector(false);
  });
  addEventListener('keydown', (e) => {
    if (raiz.hidden || document.querySelector('.ficha-capa') || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return;
    if (e.key === 'ArrowRight') paso(1);
    if (e.key === 'ArrowLeft') paso(-1);
    if (e.key === 'Escape') abrirSelector(false);
  });
  cont.addEventListener('pointerover', (e) => {
    if (e.target.closest('.lomo') && e.relatedTarget?.closest?.('.lomo') !== e.target.closest('.lomo')) sonar('hover', 0.7);
  });

  let toque = null;
  cont.addEventListener('touchstart', (e) => (toque = { x: e.touches[0].clientX, t: Date.now() }), { passive: true });
  cont.addEventListener('touchend', (e) => {
    if (!toque) return;
    const dx = e.changedTouches[0].clientX - toque.x;
    const v = Math.abs(dx) / (Date.now() - toque.t);
    if (Math.abs(dx) > 60 || v > 0.5) paso(dx < 0 ? 1 : -1);
    toque = null;
  }, { passive: true });

  globo(cont, '.lomo', (el) => {
    const b = datos.porId.get(el.dataset.id);
    return b ? { titulo: b.titulo, autor: b.autor, b } : null;
  });

  addEventListener('librero:gatos', () => {
    if (!raiz.hidden) pintar(0);
  });
  addEventListener('resize', debounce(() => {
    if (!raiz.hidden && (Math.abs(innerWidth - medida.ancho) > 16 || Math.abs(innerHeight - medida.alto) > 40)) pintar(0);
  }, 160));

  return {
    render(nueva) {
      lista = nueva;
      if (!conLibros().some((r) => r.id === repisa)) repisa = conLibros()[0]?.id || repisa;
      if (mezclado()) pagina = 0;
      pintar(0);
    },
    elementoDe: (id) => $(`.lomo[data-id="${id}"]`, raiz),
  };
}
