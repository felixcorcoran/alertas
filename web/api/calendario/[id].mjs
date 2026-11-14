/** GET /api/calendario/{calendario}.ics: el calendario de plazos de alguien (_lib/calendario.mjs) */
import { bd, manejar, tokenDe } from '../_lib/http.mjs';
import { RADAR } from '../_lib/calendario.mjs';
import { calendario } from '../_lib/suscripciones.mjs';

/** Las convocatorias abiertas, de la propia web del radar (la lista ligera) */
async function convocatorias() {
  const r = await fetch(`${RADAR}/convocatorias.json`, { signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`radar ${r.status}`);
  return (await r.json()).convocatorias;
}

export const GET = manejar(async (request) => {
  const id = tokenDe(request).replace(/\.ics$/, '');
  return new Response(await calendario(bd(), id, convocatorias), {
    headers: { 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
});
