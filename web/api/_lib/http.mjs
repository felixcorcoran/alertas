/** Lo común a las funciones: errores como en la API Java y la IP de quien llama */
import { enviar } from './correo.mjs';
import { repositorio } from './repositorio.mjs';
import { ErrorHttp } from './suscripciones.mjs';

let repo;
/** Un repositorio por instancia de la función (se reutiliza mientras siga caliente) */
export const bd = () => (repo ??= repositorio());
export { enviar };

/** Envuelve una función: ErrorHttp → su estado; cualquier otra cosa → 500 sin detalles */
export const manejar = (fn) => async (request) => {
  try {
    return await fn(request);
  } catch (e) {
    if (e instanceof ErrorHttp) return Response.json({ error: e.motivo }, { status: e.estado });
    console.error(e);
    return Response.json({ error: 'interno' }, { status: 500 });
  }
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
