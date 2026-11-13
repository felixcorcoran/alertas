/**
 * POST /api/guardadas {"codigo":"938128"}: el radar avisa de que alguien ha
 * guardado una ayuda. Llega con navigator.sendBeacon, en texto plano (sin
 * pregunta previa de CORS), así que el cuerpo se lee como texto.
 */
import { bd, ipDe, manejar } from './_lib/http.mjs';
import { sumarGuardada } from './_lib/suscripciones.mjs';

export const POST = manejar(async (request) => {
  await sumarGuardada(bd(), await request.text(), ipDe(request));
  return new Response(null, { status: 204 });
});
