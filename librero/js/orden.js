// Orden por fecha de adición.
// Los libros añadidos desde el Tablero guardan la fecha exacta ("agregado").
// Los 668 de la lista original no traen fecha: se respeta el orden en que
// aparecen en Lista_Libros.xlsx (número de registro), editable en la ficha.

export function fechaDe(b) {
  return b.agregado ? Date.parse(b.agregado) : null;
}

export function etiquetaFecha(b) {
  if (b.agregado) {
    return new Date(b.agregado).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return /^\d+$/.test(b.id) ? `Lista original · n.º ${Number(b.id)}` : '—';
}

// "desc": lo más reciente primero (los añadidos con fecha, luego la lista
// original del registro 1 en adelante). "asc": el orden inverso.
export function ordenarPorFecha(lista, sentido = 'desc') {
  const clave = (b) => {
    const f = fechaDe(b);
    return f != null ? [0, -f] : [1, /^\d+$/.test(b.id) ? Number(b.id) : 1e9];
  };
  const r = lista.slice().sort((a, b) => {
    const [ga, va] = clave(a), [gb, vb] = clave(b);
    return ga - gb || va - vb;
  });
  return sentido === 'asc' ? r.reverse() : r;
}
