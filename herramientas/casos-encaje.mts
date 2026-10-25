/**
 * Genera los casos de EncajeContratoTest: el encaje calculado por el código
 * del radar (src/lib/encaje.ts de subvenciones) para convocatorias reales y
 * de prueba y muchos negocios distintos. El Java tiene que dar lo mismo,
 * motivo por motivo.
 *
 *   npx tsx herramientas/casos-encaje.mts ../subvenciones
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const radar = resolve(process.argv[2] ?? '../subvenciones');
const importar = (ruta: string) => import(pathToFileURL(resolve(radar, ruta)).href);
const { encaje } = await importar('src/lib/encaje.ts');
const { analisis, convocatoria } = await importar('tests/ayudas.ts');
const provincias: { codigo: string }[] = JSON.parse(readFileSync(resolve(radar, 'src/data/provincias.json'), 'utf8'));
const reales = JSON.parse(readFileSync(resolve(radar, 'datos/convocatorias.json'), 'utf8')).convocatorias;

// Azar con semilla: los mismos casos cada vez
let semilla = 20261025;
const azar = () => ((semilla = (semilla * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const uno = <T>(xs: readonly T[]): T => xs[Math.floor(azar() * xs.length)];

const SINO = ['si', 'no', 'no_consta'] as const;
const MUNICIPIOS = ['', '', 'Marbella', 'Málaga', 'O Carballiño', 'Sant Cugat del Vallès', 'Las Palmas de Gran Canaria', 'Vitoria'];

// Convocatorias de prueba que pasan por todas las ramas
const prueba = Array.from({ length: 160 }, (_, i) =>
	convocatoria({
		codigo: `P${i}`,
		fin: uno(['2026-12-31', '2026-10-01', null]),
		organo: uno([
			{ nivel1: 'AUTONOMICA', nivel2: 'ANDALUCÍA', nivel3: 'CONSEJERÍA DE EMPLEO' },
			{ nivel1: 'LOCAL', nivel2: 'MARBELLA', nivel3: 'AYUNTAMIENTO DE MARBELLA' },
			{ nivel1: 'LOCAL', nivel2: 'CARBALLIÑO, O', nivel3: 'CONCELLO DO CARBALLIÑO' },
			{ nivel1: 'LOCAL', nivel2: 'SANT CUGAT DEL VALLÈS', nivel3: 'AJUNTAMENT DE SANT CUGAT' },
			{ nivel1: 'LOCAL', nivel2: 'MÁLAGA', nivel3: 'DIPUTACIÓN PROVINCIAL DE MÁLAGA' },
		]),
		regiones: uno([
			[{ codigo: 'ES61', nombre: 'ANDALUCIA' }],
			[{ codigo: 'ES', nombre: 'ESPAÑA' }],
			[{ codigo: 'ES617', nombre: 'Málaga' }],
			[{ codigo: 'ES21', nombre: 'PAIS VASCO' }, { codigo: 'ES30', nombre: 'MADRID' }],
			[],
			[{ codigo: 'FR10', nombre: 'Île-de-France' }],
		]),
		beneficiarios: uno([
			['PYME Y PERSONAS FÍSICAS QUE DESARROLLAN ACTIVIDAD ECONÓMICA'],
			['GRAN EMPRESA'],
			['PYME Y PERSONAS FÍSICAS QUE DESARROLLAN ACTIVIDAD ECONÓMICA', 'GRAN EMPRESA'],
			['SIN INFORMACION ESPECIFICA'],
			['PERSONAS FÍSICAS QUE NO DESARROLLAN ACTIVIDAD ECONÓMICA'],
		]),
		sectores: uno([
			[],
			[{ codigo: 'I', nombre: 'HOSTELERÍA' }],
			[{ codigo: '56', nombre: 'Servicios de comidas y bebidas' }],
			[{ codigo: 'G', nombre: 'COMERCIO' }, { codigo: '47.1', nombre: 'Comercio al por menor' }],
			[{ codigo: 'C', nombre: 'INDUSTRIA' }],
			'ABCDEFGHI'.split('').map((l) => ({ codigo: l, nombre: l })),
			[{ codigo: 'XX', nombre: 'Desconocido' }],
		]),
		ia: azar() < 0.15
			? null
			: analisis(
					{ plazoFin: uno([null, null, '2026-11-15', '2026-09-30']), dudas: uno([null, null, 'No queda claro si admite comunidades de bienes.']) },
					{
						autonomos: uno(SINO),
						sociedades: uno(SINO),
						emprendedores: uno(SINO),
						maxEmpleados: uno([null, null, 0, 1, 9, 10, 49, 250]),
						antiguedadMinMeses: uno([null, null, 0, 6, 12, 24, 36]),
						antiguedadMaxMeses: uno([null, null, 12, 24, 36, 60]),
						municipio: uno([null, null, null, 'Marbella', 'Vitoria-Gasteiz']),
					},
				),
	}),
);

const convocatorias = [...reales, ...prueba];
const perfiles = Array.from({ length: 60 }, () => {
	const forma = uno(['autonomo', 'sociedad', 'emprender'] as const);
	return {
		provincia: azar() < 0.5 ? 'ES617' : uno(provincias.map((p) => p.codigo)),
		municipio: uno(MUNICIPIOS),
		forma,
		empleados: forma === 'emprender' ? 0 : uno([0, 1, 10, 50, 250]),
		antiguedad: forma === 'emprender' ? 'nada' : uno(['menos1', '1a3', 'mas3']),
		sector: uno(['', 'I', 'G', 'C', 'T', 'K']),
	};
});

const casos = [];
for (let c = 0; c < convocatorias.length; c++) {
	for (let n = 0; n < 12; n++) {
		const p = Math.floor(azar() * perfiles.length);
		const hoy = uno(['2026-10-25', '2026-10-25', '2027-01-10']);
		const r = encaje(convocatorias[c], perfiles[p], hoy);
		casos.push({ c, p, hoy, estado: r.estado, motivos: r.motivos });
	}
}

const salida = resolve('api/src/test/resources/encaje/casos.json');
writeFileSync(salida, JSON.stringify({ convocatorias, perfiles, casos }));
const cuenta = (e: string) => casos.filter((x) => x.estado === e).length;
console.log(`${casos.length} casos (si ${cuenta('si')}, revisa ${cuenta('revisa')}, no ${cuenta('no')}) → ${salida}`);
