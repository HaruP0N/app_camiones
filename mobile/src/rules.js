// Réplica en el cliente de las reglas del servidor, para mostrar la nota en vivo
// y validar antes de enviar. La nota OFICIAL siempre la calcula el servidor.
import { NIVELES } from './utils';

export const MAX_FOTOS_POR_ITEM = 3;

export function calcularResultado(respuestas, catalogo) {
  const fallasPorNivel = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let cumple = 0;
  let noAplica = 0;

  for (const item of catalogo) {
    const r = respuestas[item.id];
    if (!r) continue;
    if (r.estado === 'no_cumple') fallasPorNivel[item.nivel] += 1;
    if (r.estado === 'cumple') cumple += 1;
    if (r.estado === 'no_aplica') noAplica += 1;
  }

  let penalizacion = 0;
  for (const n of [1, 2, 3, 4]) penalizacion += fallasPorNivel[n] * NIVELES[n].penalizacion;
  const nota = Math.max(0, 100 - penalizacion);

  let resultado = 'APROBADO';
  if (fallasPorNivel[1] >= 1) resultado = 'RECHAZADO';
  else if (fallasPorNivel[2] >= 1) resultado = 'OBSERVACION';

  const fallas = Object.values(fallasPorNivel).reduce((a, b) => a + b, 0);
  return { nota, resultado, fallasPorNivel, cumple, noAplica, fallas };
}

// Devuelve una lista de { item_id, nivel, mensaje }
export function validarRespuestas(respuestas, catalogo) {
  const errores = [];
  for (const item of catalogo) {
    const r = respuestas[item.id];
    if (!r || !r.estado) {
      errores.push({ item_id: item.id, nivel: item.nivel, mensaje: `${item.id} · falta indicar el estado` });
      continue;
    }
    if (r.estado === 'no_cumple') {
      if (!r.descripcion_falla || r.descripcion_falla.trim().length < 10) {
        errores.push({ item_id: item.id, nivel: item.nivel, mensaje: `${item.id} · describe la falla (mín. 10 caracteres)` });
      }
      if (!r.fotos || r.fotos.length < 1) {
        errores.push({ item_id: item.id, nivel: item.nivel, mensaje: `${item.id} · agrega al menos una foto de evidencia` });
      }
    }
    if (r.estado === 'no_aplica' && (!r.motivo_no_aplica || r.motivo_no_aplica.trim().length < 3)) {
      errores.push({ item_id: item.id, nivel: item.nivel, mensaje: `${item.id} · indica el motivo de "no aplica"` });
    }
  }
  return errores;
}
