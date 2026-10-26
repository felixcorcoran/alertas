/** POST /api/suscripciones/confirmar { token }: el enlace del primer correo */
import { bd, cuerpo, manejar } from '../_lib/http.mjs';
import { confirmar } from '../_lib/suscripciones.mjs';

export const POST = manejar(async (request) => {
  const { token } = await cuerpo(request);
  return Response.json(await confirmar(bd(), token));
});
