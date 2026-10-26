/**
 * El negocio de cada persona, como en Perfil.java: mismas respuestas, mismas
 * reglas. Las funciones de Vercel validan con esto antes de guardar.
 */
import provincias from '../../../datos/provincias.json' with { type: 'json' };
import sectores from '../../../datos/sectores.json' with { type: 'json' };

const FORMAS = ['autonomo', 'sociedad', 'emprender'];
const TRAMOS = [0, 1, 10, 50, 250];
const ANTIGUEDADES = ['nada', 'menos1', '1a3', 'mas3'];

/**
 * Limpia el perfil que llega (espacios, mayúsculas) y, a quien aún no ha
 * empezado, le quita plantilla y antigüedad. No valida: eso es error().
 * @returns {{provincia: string, municipio: string, forma: string, empleados: number, antiguedad: string, sector: string}}
 */
export function normalizar(p) {
  const perfil = {
    provincia: String(p?.provincia ?? ''),
    municipio: String(p?.municipio ?? '').trim(),
    forma: String(p?.forma ?? ''),
    empleados: Number(p?.empleados),
    antiguedad: String(p?.antiguedad ?? ''),
    sector: String(p?.sector ?? '').trim().toUpperCase(),
  };
  if (perfil.forma === 'emprender') {
    perfil.empleados = 0;
    perfil.antiguedad = 'nada';
  }
  return perfil;
}

/** Lo que no cuadra (el nombre del campo), o null si el perfil vale */
export function error(p) {
  if (!provincias.some((x) => x.codigo === p.provincia)) return 'provincia';
  if (p.municipio.length > 80) return 'municipio';
  if (!FORMAS.includes(p.forma)) return 'forma';
  if (!TRAMOS.includes(p.empleados)) return 'empleados';
  if (!ANTIGUEDADES.includes(p.antiguedad) || (p.antiguedad === 'nada' && p.forma !== 'emprender')) return 'antiguedad';
  if (p.sector && !/^[A-V]$/.test(p.sector)) return 'sector';
  return null;
}

const NOMBRE_FORMA = { autonomo: 'Autónomo o autónoma', sociedad: 'Empresa (sociedad)', emprender: 'Aún no ha empezado' };
const NOMBRE_PLANTILLA = { 0: 'solo yo', 1: 'de 1 a 9 personas', 10: 'de 10 a 49 personas', 50: 'de 50 a 249 personas', 250: '250 personas o más' };
const NOMBRE_ANTIGUEDAD = { menos1: 'menos de un año', '1a3': 'de 1 a 3 años', mas3: 'más de 3 años' };

/** «Autónomo o autónoma en Marbella (Málaga) · Hostelería · solo yo · de 1 a 3 años», como Plantillas.resumen */
export function resumen(p) {
  const provincia = provincias.find((x) => x.codigo === p.provincia)?.nombre ?? p.provincia;
  const partes = [
    `${NOMBRE_FORMA[p.forma]} en ${p.municipio ? `${p.municipio} (${provincia})` : provincia}`,
    p.sector ? (sectores.find((s) => s.letra === p.sector)?.nombre ?? p.sector) : 'cualquier sector',
  ];
  if (p.forma !== 'emprender') partes.push(NOMBRE_PLANTILLA[p.empleados], NOMBRE_ANTIGUEDAD[p.antiguedad]);
  return partes.join(' · ');
}
