/**
 * El calendario de plazos de cada persona (.ics), como Calendario.java: las
 * ayudas que le hemos enviado o va a recibir y las que sigue, con fecha de
 * cierre y aún abiertas. Todo el día del cierre, con aviso tres días antes.
 */
export const RADAR = 'https://subvenciones.felixcorcoran.es';

const escapar = (s) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\;');

/** Las líneas de un .ics no pasan de 75 octetos: se parten con un espacio delante */
function plegar(linea) {
  const bytes = (s) => new TextEncoder().encode(s).length;
  if (bytes(linea) <= 75) return linea;
  const partes = [];
  let actual = '';
  for (const ch of linea) {
    if (bytes(actual + ch) > (partes.length ? 74 : 75)) {
      partes.push(actual);
      actual = '';
    }
    actual += ch;
  }
  partes.push(actual);
  return partes.join('\r\n ');
}

const cierre = (c) => c.ia?.plazoFin ?? c.fin ?? null;
const dia = (iso) => iso.replaceAll('-', '');
const siguiente = (iso) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};
export const hoyMadrid = (ahora = new Date()) => ahora.toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });

/** El .ics con las convocatorias de esos códigos que siguen abiertas y tienen fecha */
export function calendarioIcs(convocatorias, codigos, ahora = new Date()) {
  const suyas = new Set(codigos);
  const hoy = hoyMadrid(ahora);
  const lista = convocatorias
    .filter((c) => suyas.has(c.codigo) && cierre(c) && cierre(c) >= hoy)
    .sort((a, b) => cierre(a).localeCompare(cierre(b)));
  const sello = `${ahora.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//felixcorcoran.es//Avisos del Radar de subvenciones//ES',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapar('Tus ayudas · Radar de subvenciones')}`,
    'X-WR-TIMEZONE:Europe/Madrid',
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    'X-PUBLISHED-TTL:PT12H',
  ];
  for (const c of lista) {
    const nombre = c.ia?.titular ?? c.ia?.resumen ?? c.titulo;
    const corto = nombre.length > 90 ? `${nombre.slice(0, 87).trimEnd()}…` : nombre;
    const ficha = `${RADAR}/ayudas/${c.codigo}`;
    const fin = cierre(c);
    lineas.push(
      'BEGIN:VEVENT',
      `UID:bdns-${c.codigo}@subvenciones.felixcorcoran.es`,
      `DTSTAMP:${sello}`,
      `DTSTART;VALUE=DATE:${dia(fin)}`,
      `DTEND;VALUE=DATE:${dia(siguiente(fin))}`,
      `SUMMARY:${escapar(`Cierra el plazo: ${corto}`)}`,
      `DESCRIPTION:${escapar(`${c.titulo}\n\nFicha: ${ficha}`)}`,
      `URL:${ficha}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapar(`Quedan 3 días para pedir: ${corto}`)}`,
      'TRIGGER:-P3D',
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lineas.push('END:VCALENDAR');
  return lineas.map(plegar).join('\r\n') + '\r\n';
}
