/** GET, PUT y DELETE /api/suscripciones/{token}: ver, cambiar el negocio y darse de baja */
import { bd, cuerpo, manejar, tokenDe } from '../_lib/http.mjs';
import { borrar, cambiar, ver } from '../_lib/suscripciones.mjs';

export const GET = manejar(async (request) => Response.json(await ver(bd(), tokenDe(request))));

export const PUT = manejar(async (request) => Response.json(await cambiar(bd(), tokenDe(request), await cuerpo(request))));

export const DELETE = manejar(async (request) => {
  await borrar(bd(), tokenDe(request));
  return new Response(null, { status: 204 });
});
