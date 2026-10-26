/** Lo común a las funciones: errores como en la API Java y la IP de quien llama */
import { enviar } from './correo.mjs';
import { repositorio } from './repositorio.mjs';
import { ErrorHttp } from './suscripciones.mjs';

let repo;
/** Un repositorio por instancia de la función (se reutiliza mientras siga caliente) */
export const bd = () => (repo ??= repositorio());
export { enviar };

/** El radar se apunta desde su propia web (otro origen): solo él puede llamar desde el navegador */
const ORIGENES = ['https://subvenciones.felixcorcoran.es', 'http://localhost:4321'];

function conCors(request, respuesta) {
  const origen = request.headers.get('origin');
  if (origen && ORIGENES.includes(origen)) {
    respuesta.headers.set('Access-Control-Allow-Origin', origen);
    respuesta.headers.set('Vary', 'Origin');
  }
  return respuesta;
}

/** Envuelve una función: ErrorHttp → su estado; cualquier otra cosa → 500 sin detalles */
export const manejar = (fn) => async (request) => {
  try {
    return conCors(request, await fn(request));
  } catch (e) {
    if (e instanceof ErrorHttp) return conCors(request, Response.json({ error: e.motivo }, { status: e.estado }));
    console.error(e);
    return conCors(request, Response.json({ error: 'interno' }, { status: 500 }));
  }
};

/** La pregunta previa del navegador antes de un POST con JSON desde otro origen */
export const opciones = (request) => {
  const r = conCors(request, new Response(null, { status: 204 }));
  r.headers.set('Access-Control-Allow-Methods', 'POST');
  r.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  r.headers.set('Access-Control-Max-Age', '86400');
  return r;
};

/** El último trozo de la ruta: /api/suscripciones/{token} */
export const tokenDe = (request) => new URL(request.url).pathname.split('/').filter(Boolean).pop();

/** Vercel pone la IP real del visitante en x-forwarded-for */
export const ipDe = (request) =>
  (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || request.headers.get('x-real-ip') || 'desconocida';

export async function cuerpo(request) {
  try {
    return await request.json();
  } catch {
    throw new ErrorHttp(400, 'json');
  }
}
