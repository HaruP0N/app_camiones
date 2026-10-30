import { colors } from './theme';

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const pad = (n) => String(n).padStart(2, '0');

export const diaCorto = (d) => DIAS[d.getDay()];

export function formatFechaHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

// "HXRT42" -> "HXRT-42"
export function formatPatente(p) {
  if (!p) return '';
  const s = String(p).toUpperCase();
  return /^[A-Z]{4}\d{2}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4)}` : s;
}

export const CARROCERIAS = {
  RIFER: 'Rifer (cámara de frío)',
  TRACTO: 'Tracto + remolque',
  PAQUETERO: 'Paquetero',
  CARRO: 'Camión con carro',
};

export const NIVELES = {
  1: { nombre: 'CRÍTICO', fg: colors.danger, bg: colors.dangerBg, penalizacion: 30 },
  2: { nombre: 'ALTO', fg: colors.warn, bg: colors.warnBg, penalizacion: 15 },
  3: { nombre: 'MEDIO', fg: '#8A7A0F', bg: '#FDF6D3', penalizacion: 7 },
  4: { nombre: 'BAJO', fg: colors.neutral, bg: colors.neutralBg, penalizacion: 2 },
};

export const ESTADOS = {
  PROGRAMADA: { label: 'PROGRAMADA', fg: colors.info, bg: colors.infoBg },
  EN_PROGRESO: { label: 'EN PROGRESO', fg: colors.warn, bg: colors.warnBg },
  COMPLETADA: { label: 'COMPLETADA', fg: colors.neutral, bg: colors.neutralBg },
};

export const RESULTADOS = {
  APROBADO: { label: 'APROBADO', fg: colors.success, bg: colors.successBg },
  OBSERVACION: { label: 'CON OBSERVACIONES', fg: colors.warn, bg: colors.warnBg },
  RECHAZADO: { label: 'RECHAZADO', fg: colors.danger, bg: colors.dangerBg },
};
