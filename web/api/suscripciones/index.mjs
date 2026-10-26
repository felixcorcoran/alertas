/** POST /api/suscripciones: apuntarse (siempre 202, esté o no el email). Lo llaman el panel y el radar */
import { bd, cuerpo, enviar, ipDe, manejar, opciones } from '../_lib/http.mjs';
import { apuntar } from '../_lib/suscripciones.mjs';

export const POST = manejar(async (request) => {
  await apuntar(bd(), enviar, await cuerpo(request), ipDe(request));
  return new Response(null, { status: 202 });
});

export const OPTIONS = opciones;
