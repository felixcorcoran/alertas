/** PUT /api/frecuencia/{token}: cada cuánto recibe los avisos, {"frecuencia":"diaria"|"semanal"} */
import { bd, cuerpo, manejar, tokenDe } from '../_lib/http.mjs';
import { cambiarFrecuencia } from '../_lib/suscripciones.mjs';

export const PUT = manejar(async (request) => Response.json(await cambiarFrecuencia(bd(), tokenDe(request), await cuerpo(request))));
