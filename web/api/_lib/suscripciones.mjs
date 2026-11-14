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
import { calendarioIcs } from './calendario.mjs';

/** Versión del aviso de privacidad que se acepta (Ajustes.PRIVACIDAD en la API Java) */
export const PRIVACIDAD = '2026-11-14';
/** Como mucho, las ayudas guardadas que se siguen de una vez (Seguimientos.MAX_SEGUIDAS) */
export const MAX_SEGUIDAS = 50;
/** Guardadas que se cuentan por IP cada 10 minutos (GuardadaController) */
export const MAX_GUARDADAS_POR_IP = 30;
/** Entre dos correos de alta a la misma dirección */
export const ENTRE_ALTAS_MS = 10 * 60_000;
/** Altas por IP cada 10 minutos */
export const MAX_POR_IP = 5;
/** Correos de alta al día, para no gastar el cupo de Resend que necesitan los avisos */
export const MAX_ALTAS_DIA = 60;

export const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const CODIGO = /^\d{1,12}$/;
const FRECUENCIAS = { diaria: 'DIARIA', semanal: 'SEMANAL' };
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
  frecuencia: (s.frecuencia ?? 'DIARIA').toLowerCase(),
  calendario: s.calendario ?? null,
});

/** «diaria» o «semanal» → como en la base de datos; vacía, diaria si se permite (al apuntarse) */
function frecuencia(texto, vaciaVale) {
  const t = String(texto ?? '').trim().toLowerCase();
  if (!t && vaciaVale) return 'DIARIA';
  const f = FRECUENCIAS[t];
  if (!f) throw new ErrorHttp(400, 'frecuencia');
  return f;
}

/** Solo códigos de la BDNS, sin repetir y con tope; lo demás se ignora (Seguimientos.validas) */
export const seguidasValidas = (lista) =>
  Array.isArray(lista)
    ? [...new Set(lista.filter((c) => typeof c === 'string').map((c) => c.trim()).filter((c) => CODIGO.test(c)))].slice(0, MAX_SEGUIDAS)
    : [];

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
  const cada = frecuencia(alta?.frecuencia, true);
  const seguidas = seguidasValidas(alta?.seguidas);

  if ((await repo.contarIp(huella(ip), ahora)) > MAX_POR_IP) throw new ErrorHttp(429, 'demasiadas');
  if ((await repo.altasUltimoDia(ahora)) >= MAX_ALTAS_DIA) throw new ErrorHttp(429, 'cupo');

  const existente = await repo.porEmail(email);
  if (!existente) {
    const token = nuevoToken();
    const id = await repo.crear({ email, perfil, token, consentimiento: PRIVACIDAD, frecuencia: cada, ahora });
    await repo.seguir(id, seguidas, ahora);
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
    await repo.cambiarFrecuencia(existente.id, cada);
    await repo.seguir(existente.id, seguidas, ahora);
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

/** Al abrir su panel; la primera vez se crea la dirección de su calendario de plazos (aparte del token) */
export async function ver(repo, token) {
  const s = await porToken(repo, token);
  if (!s.calendario) {
    s.calendario = nuevoToken();
    await repo.ponerCalendario(s.id, s.calendario);
  }
  return vista(s);
}

/**
 * El .ics de una dirección de calendario (Calendario.java). Solo da acceso a la
 * lista de plazos; `convocatorias` son las del radar.
 */
export async function calendario(repo, id, leerConvocatorias, ahora = new Date()) {
  const s = TOKEN.test(id ?? '') ? await repo.porCalendario(id) : null;
  if (!s) throw new ErrorHttp(404, 'calendario');
  return calendarioIcs(await leerConvocatorias(), await repo.codigosAvisos(s.id), ahora);
}

export async function cambiar(repo, token, p) {
  const perfil = perfilValido(p);
  const s = await porToken(repo, token);
  await repo.cambiarPerfil(s.id, perfil, null);
  return vista({ ...s, ...perfil });
}

/** Cada cuánto recibe los avisos: hay que decir cuál (vacía no vale) */
export async function cambiarFrecuencia(repo, token, cuerpo) {
  const cada = frecuencia(cuerpo?.frecuencia, false);
  const s = await porToken(repo, token);
  await repo.cambiarFrecuencia(s.id, cada);
  return vista({ ...s, frecuencia: cada });
}

/**
 * El radar avisa de que alguien ha guardado una ayuda (GuardadaController):
 * solo se suma a la cuenta de la ayuda de hoy, sin ningún dato de quién.
 */
export async function sumarGuardada(repo, cuerpo, ip, ahora = new Date()) {
  let codigo;
  try {
    codigo = JSON.parse(String(cuerpo ?? ''))?.codigo;
  } catch {
    throw new ErrorHttp(400, 'json');
  }
  if (typeof codigo !== 'string' || !CODIGO.test(codigo)) throw new ErrorHttp(400, 'codigo');
  if ((await repo.contarIp(huella(`guardadas:${ip}`), ahora)) > MAX_GUARDADAS_POR_IP) throw new ErrorHttp(429, 'demasiadas');
  await repo.sumarGuardada(codigo, ahora);
}

/** La baja borra la dirección y sus avisos pendientes: no queda nada */
export async function borrar(repo, token) {
  if (!TOKEN.test(token ?? '')) return;
  const s = await repo.porToken(token);
  if (s) await repo.borrar(s.id);
}
