// Reglas de negocio de la inspección (lógica pura, sin dependencias de BD ni HTTP).

// Penalización por cada falla, según el nivel de criticidad del ítem
const PENALIZACION = { 1: 30, 2: 15, 3: 7, 4: 2 };

const ESTADOS_ITEM = ['cumple', 'no_cumple', 'no_aplica'];
const MAX_FOTOS_POR_ITEM = 5;

/**
 * Calcula nota y resultado.
 *  nota = max(0, 100 - suma de penalizaciones)
 *  resultado: falla nivel 1 -> RECHAZADO; falla nivel 2 -> OBSERVACION; si no -> APROBADO
 *  (el resultado depende del nivel de las fallas, NO de la nota)
 */
function calcularResultado(detalles, catalogo) {
  const nivelPorItem = new Map(catalogo.map((i) => [i.id, i.nivel]));
  const fallasPorNivel = { 1: 0, 2: 0, 3: 0, 4: 0 };

  for (const d of detalles) {
    if (d.estado === 'no_cumple') {
      const nivel = nivelPorItem.get(d.item_id);
      if (nivel) fallasPorNivel[nivel] += 1;
    }
  }

  let penalizacion = 0;
  for (const nivel of [1, 2, 3, 4]) {
    penalizacion += fallasPorNivel[nivel] * PENALIZACION[nivel];
  }
  const nota = Math.max(0, 100 - penalizacion);

  let resultado = 'APROBADO';
  if (fallasPorNivel[1] >= 1) resultado = 'RECHAZADO';
  else if (fallasPorNivel[2] >= 1) resultado = 'OBSERVACION';

  return { nota, resultado, fallasPorNivel };
}

/**
 * Valida que se pueda finalizar la inspección. Devuelve un arreglo de errores
 * (vacío si todo está correcto).
 *  - todos los ítems del catálogo deben tener estado
 *  - no_cumple: descripción de la falla (mín. 10 caracteres) y al menos 1 foto
 *  - no_aplica: motivo (mín. 3 caracteres)
 */
function validarDetalles(detalles, catalogo) {
  const errores = [];
  const porItem = new Map();
  for (const d of detalles || []) porItem.set(d.item_id, d);

  for (const item of catalogo) {
    const d = porItem.get(item.id);
    if (!d || !ESTADOS_ITEM.includes(d.estado)) {
      errores.push(`${item.id}: falta indicar el estado`);
      continue;
    }
    if (d.estado === 'no_cumple') {
      if (!d.descripcion_falla || d.descripcion_falla.trim().length < 10) {
        errores.push(`${item.id}: la descripción de la falla debe tener al menos 10 caracteres`);
      }
      if (!Array.isArray(d.fotos) || d.fotos.length < 1) {
        errores.push(`${item.id}: falta al menos una foto de evidencia`);
      } else if (d.fotos.length > MAX_FOTOS_POR_ITEM) {
        errores.push(`${item.id}: máximo ${MAX_FOTOS_POR_ITEM} fotos por ítem`);
      }
    }
    if (d.estado === 'no_aplica') {
      if (!d.motivo_no_aplica || d.motivo_no_aplica.trim().length < 3) {
        errores.push(`${item.id}: el motivo de "no aplica" debe tener al menos 3 caracteres`);
      }
    }
  }
  return errores;
}

module.exports = { PENALIZACION, ESTADOS_ITEM, MAX_FOTOS_POR_ITEM, calcularResultado, validarDetalles };
