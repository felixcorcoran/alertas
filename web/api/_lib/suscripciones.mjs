/**
 * Alta con doble confirmación, cambios y baja: lo mismo que
 * SuscripcionService.java, para las funciones de Vercel. Recibe el
 * repositorio (la base de datos) y el envío de correo, así se prueba sin
 * ninguno de los dos.
 *
 * La respuesta al apuntarse es siempre la misma, esté o no el email: no
 * sirve para averiguar quién está apuntado.
 */
import { createHash, randomBytes } from 'node:crypto';
import { confirmar as correoConfirmar, yaApuntado } from './correo.mjs';
import { error as errorPerfil, normalizar } from './perfil.mjs';

/** Versión del aviso de privacidad que se acepta (Ajustes.PRIVACIDAD en la API Java) */
export const PRIVACIDAD = '2026-10-26';
/** Entre dos correos de alta a la misma dirección */
export const ENTRE_ALTAS_MS = 10 * 60_000;
/** Altas por IP cada 10 minutos */
export const MAX_POR_IP = 5;
/** Correos de alta al día, para no gastar el cupo de Resend que necesitan los avisos */
export const MAX_ALTAS_DIA = 60;

export const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class ErrorHttp extends Error {
  constructor(estado, motivo) {
    super(motivo);
    this.estado = estado;
    this.motivo = motivo;
  }
}

/** 256 bits al azar: el enlace de cada persona es su única llave */
export const nuevoToken = () => randomBytes(32).toString('base64url');

/** La IP no se guarda: solo su huella, diez minutos, para el límite */
export const huella = (ip) => createHash('sha256').update(`alertas:${ip}`).digest('hex');

export const vista = (s) => ({
  email: s.email,
  perfil: {
    provincia: s.provincia,
    municipio: s.municipio,
    forma: s.forma,
    empleados: s.empleados,
    antiguedad: s.antiguedad,
    sector: s.sector,
  },
  confirmado: s.estado === 'ACTIVO',
});

function perfilValido(p) {
  const perfil = normalizar(p);
  const e = errorPerfil(perfil);
  if (e) throw new ErrorHttp(400, e);
  return perfil;
}

export async function apuntar(repo, enviar, alta, ip, ahora = new Date()) {
  const email = String(alta?.email ?? '').trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 254) throw new ErrorHttp(400, 'email');
  if (alta?.acepto !== true) throw new ErrorHttp(400, 'acepto');
  const perfil = perfilValido(alta?.perfil);

  if ((await repo.contarIp(huella(ip), ahora)) > MAX_POR_IP) throw new ErrorHttp(429, 'demasiadas');
  if ((await repo.altasUltimoDia(ahora)) >= MAX_ALTAS_DIA) throw new ErrorHttp(429, 'cupo');

  const existente = await repo.porEmail(email);
  if (!existente) {
    const token = nuevoToken();
    const id = await repo.crear({ email, perfil, token, consentimiento: PRIVACIDAD, ahora });
    try {
      await enviar(correoConfirmar(email, perfil, token));
    } catch (e) {
      // Sin correo no hay forma de confirmar: que pueda volver a intentarlo
      await repo.borrar(id);
      throw e;
    }
    return;
  }

  const ultimo = existente.ultimo_alta ? new Date(existente.ultimo_alta).getTime() : 0;
  if (ultimo + ENTRE_ALTAS_MS > ahora.getTime()) return;
  await repo.marcarAlta(existente.id, ahora);
  if (existente.estado === 'PENDIENTE') {
    // Aún sin confirmar: vale el último perfil, que es el que se confirmará
    await repo.cambiarPerfil(existente.id, perfil, PRIVACIDAD);
    await enviar(correoConfirmar(email, perfil, existente.token));
  } else {
    // Ya apuntado: no se cambia nada sin el enlace de su correo
    await enviar(yaApuntado(email, existente.token));
  }
}

async function porToken(repo, token) {
  const s = TOKEN.test(token ?? '') ? await repo.porToken(token) : null;
  if (!s) throw new ErrorHttp(404, 'enlace');
  return s;
}

export async function confirmar(repo, token, ahora = new Date()) {
  const s = await porToken(repo, token);
  if (s.estado === 'PENDIENTE') {
    await repo.activar(s.id, ahora);
    s.estado = 'ACTIVO';
  }
  return vista(s);
}

export async function ver(repo, token) {
  return vista(await porToken(repo, token));
}

export async function cambiar(repo, token, p) {
  const perfil = perfilValido(p);
  const s = await porToken(repo, token);
  await repo.cambiarPerfil(s.id, perfil, null);
  return vista({ ...s, ...perfil });
}

/** La baja borra la dirección y sus avisos pendientes: no queda nada */
export async function borrar(repo, token) {
  if (!TOKEN.test(token ?? '')) return;
  const s = await repo.porToken(token);
  if (s) await repo.borrar(s.id);
}
