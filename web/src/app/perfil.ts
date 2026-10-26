/**
 * El negocio: las mismas respuestas que el formulario del Radar de
 * subvenciones, y los mismos parámetros en la dirección
 * (?provincia=ES617&forma=autonomo&empleados=0&antiguedad=1a3&sector=I).
 */
import provincias from '../../../datos/provincias.json';
import sectores from '../../../datos/sectores.json';

export type Forma = 'autonomo' | 'sociedad' | 'emprender';
export type Antiguedad = 'nada' | 'menos1' | '1a3' | 'mas3';

export interface Perfil {
  provincia: string;
  municipio: string;
  forma: Forma;
  empleados: number;
  antiguedad: Antiguedad;
  sector: string;
}

export interface Provincia {
  codigo: string;
  nombre: string;
  comunidad: string;
  codigoComunidad: string;
}

export const PROVINCIAS: Provincia[] = provincias;

/** Comunidades por orden alfabético, cada una con sus provincias o islas */
export const COMUNIDADES = Object.values(
  PROVINCIAS.reduce<Record<string, { codigo: string; nombre: string; provincias: Provincia[] }>>((acc, p) => {
    (acc[p.codigoComunidad] ??= { codigo: p.codigoComunidad, nombre: p.comunidad, provincias: [] }).provincias.push(p);
    return acc;
  }, {}),
)
  .map((c) => ({ ...c, provincias: c.provincias.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')) }))
  .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

/** Las secciones de la CNAE que pregunta el radar (sin administración, hogares ni organismos) */
export const SECTORES = sectores.filter((s) => !['P', 'U', 'V'].includes(s.letra));

export const FORMAS: Record<Forma, { titulo: string; sub: string }> = {
  autonomo: { titulo: 'Autónomo o autónoma', sub: 'Trabajas por tu cuenta' },
  sociedad: { titulo: 'Una empresa', sub: 'Una sociedad: SL, SA, cooperativa…' },
  emprender: { titulo: 'Aún no he empezado', sub: 'Quieres montar tu negocio' },
};

export const PLANTILLA: [number, string][] = [
  [0, 'Nadie, solo yo'],
  [1, 'De 1 a 9'],
  [10, 'De 10 a 49'],
  [50, 'De 50 a 249'],
  [250, '250 o más'],
];

export const ANTIGUEDAD: [Antiguedad, string][] = [
  ['menos1', 'Menos de un año'],
  ['1a3', 'De 1 a 3 años'],
  ['mas3', 'Más de 3 años'],
];

/** El perfil de la dirección, o null si falta algo o no vale (como en el radar) */
export function deParametros(q: URLSearchParams): Perfil | null {
  const provincia = q.get('provincia') ?? '';
  const forma = q.get('forma') as Forma | null;
  if (!PROVINCIAS.some((p) => p.codigo === provincia) || !forma || !(forma in FORMAS)) return null;
  const empleados = Number(q.get('empleados') ?? 0);
  const antiguedad = q.get('antiguedad') as Antiguedad | null;
  const sector = (q.get('sector') ?? '').slice(0, 1).toUpperCase();
  return {
    provincia,
    municipio: (q.get('municipio') ?? '').slice(0, 80),
    forma,
    empleados: forma === 'emprender' || !PLANTILLA.some(([v]) => v === empleados) ? 0 : empleados,
    antiguedad:
      forma === 'emprender' ? 'nada' : ANTIGUEDAD.some(([v]) => v === antiguedad) ? antiguedad! : '1a3',
    sector: SECTORES.some((s) => s.letra === sector) ? sector : '',
  };
}

/** Los parámetros del radar para ver todas las ayudas de este negocio */
export function aParametros(p: Perfil): string {
  const q = new URLSearchParams({ provincia: p.provincia, forma: p.forma, sector: p.sector });
  if (p.municipio) q.set('municipio', p.municipio);
  if (p.forma !== 'emprender') {
    q.set('empleados', String(p.empleados));
    q.set('antiguedad', p.antiguedad);
  }
  return q.toString();
}

/** Las respuestas, una por una, como las enseña el radar en sus resultados */
export function respuestas(p: Perfil): string[] {
  const provincia = PROVINCIAS.find((x) => x.codigo === p.provincia)?.nombre ?? p.provincia;
  return [
    provincia,
    p.municipio,
    FORMAS[p.forma].titulo,
    p.forma === 'emprender' ? '' : (PLANTILLA.find(([v]) => v === p.empleados)?.[1] ?? ''),
    p.forma === 'emprender' ? '' : (ANTIGUEDAD.find(([v]) => v === p.antiguedad)?.[1] ?? ''),
    SECTORES.find((s) => s.letra === p.sector)?.nombre ?? '',
  ].filter(Boolean);
}

/** «Autónomo o autónoma en Marbella (Málaga) · Hostelería» */
export function resumen(p: Perfil): string {
  const provincia = PROVINCIAS.find((x) => x.codigo === p.provincia)?.nombre ?? p.provincia;
  const donde = p.municipio ? `${p.municipio} (${provincia})` : provincia;
  const sector = SECTORES.find((s) => s.letra === p.sector)?.nombre ?? 'cualquier sector';
  const partes = [`${FORMAS[p.forma].titulo} en ${donde}`, sector];
  if (p.forma !== 'emprender') {
    partes.push(PLANTILLA.find(([v]) => v === p.empleados)?.[1].toLowerCase() ?? '');
    partes.push(ANTIGUEDAD.find(([v]) => v === p.antiguedad)?.[1].toLowerCase() ?? '');
  }
  return partes.join(' · ');
}
