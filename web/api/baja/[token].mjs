/** POST /api/baja/{token}: baja con un clic desde el gestor de correo (List-Unsubscribe-Post, RFC 8058) */
import { bd, manejar, tokenDe } from '../_lib/http.mjs';
import { borrar } from '../_lib/suscripciones.mjs';

export const POST = manejar(async (request) => {
  await borrar(bd(), tokenDe(request));
  return new Response(null, { status: 200 });
});
