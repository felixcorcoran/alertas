/**
 * Las funciones de Vercel tienen que portarse como SuscripcionApiTest.java
 * dice que se porta la API Java: mismas reglas, mismas respuestas. Aquí con
 * una base de datos falsa en memoria (el SQL real se prueba al desplegar).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { error, normalizar, resumen } from '../api/_lib/perfil.mjs';
import {
  ENTRE_ALTAS_MS,
  ErrorHttp,
  MAX_ALTAS_DIA,
  MAX_POR_IP,
  MAX_GUARDADAS_POR_IP,
  MAX_SEGUIDAS,
  apuntar,
  borrar,
  cambiar,
  cambiarFrecuencia,
  seguidasValidas,
  sumarGuardada,
  confirmar,
  huella,
  ver,
} from '../api/_lib/suscripciones.mjs';

const PERFIL = { provincia: 'ES617', municipio: '', forma: 'autonomo', empleados: 0, antiguedad: '1a3', sector: 'I' };
const OTRO = { provincia: 'ES300', municipio: '', forma: 'sociedad', empleados: 10, antiguedad: 'mas3', sector: 'G' };
const INICIO = new Date('2026-10-26T08:30:00Z');

function repoEnMemoria() {
  const filas = [];
  const limites = new Map();
  const avisos = [];
  const guardadas = new Map();
  let siguiente = 1;
  return {
    filas,
    avisos,
    guardadas,
    porEmail: async (email) => filas.find((s) => s.email === email) ?? null,
    porToken: async (token) => filas.find((s) => s.token === token) ?? null,
    crear: async ({ email, perfil, token, consentimiento, frecuencia, ahora }) => {
      const id = siguiente++;
      filas.push({ id, email, ...perfil, token, estado: 'PENDIENTE', consentimiento, frecuencia, creado: ahora, ultimo_alta: ahora });
      return id;
    },
    cambiarFrecuencia: async (id, frecuencia) => (filas.find((s) => s.id === id).frecuencia = frecuencia),
    seguir: async (id, codigos) => {
      for (const codigo of codigos)
        if (!avisos.some((a) => a.id === id && a.codigo === codigo)) avisos.push({ id, codigo, seguida: true });
    },
    sumarGuardada: async (codigo) => guardadas.set(codigo, (guardadas.get(codigo) ?? 0) + 1),
    marcarAlta: async (id, ahora) => (filas.find((s) => s.id === id).ultimo_alta = ahora),
    activar: async (id) => (filas.find((s) => s.id === id).estado = 'ACTIVO'),
    cambiarPerfil: async (id, p) => Object.assign(filas.find((s) => s.id === id), p),
    borrar: async (id) => {
      filas.splice(filas.findIndex((s) => s.id === id), 1);
      // on delete cascade
      for (let i = avisos.length - 1; i >= 0; i--) if (avisos[i].id === id) avisos.splice(i, 1);
    },
    contarIp: async (clave, ahora) => {
      const l = limites.get(clave);
      const nuevo = !l || ahora - l.desde > 10 * 60_000 ? { desde: ahora, veces: 1 } : { ...l, veces: l.veces + 1 };
      limites.set(clave, nuevo);
      return nuevo.veces;
    },
    altasUltimoDia: async (ahora) => filas.filter((s) => ahora - s.ultimo_alta < 24 * 3600_000).length,
  };
}

let repo, buzon, ip;
const enviar = async (m) => buzon.push(m);
const tokenDe = (m) => m.texto.match(/t=([A-Za-z0-9_-]{43})/)[1];
const alta = (email, perfil = PERFIL, ahora = INICIO, desde = `203.0.113.${ip++}`) =>
  apuntar(repo, enviar, { email, perfil, acepto: true }, desde, ahora);
const despues = (ms) => new Date(INICIO.getTime() + ms);
const motivo = (promesa) => promesa.then(() => 'ok', (e) => (e instanceof ErrorHttp ? `${e.estado} ${e.motivo}` : e.message));

beforeEach(() => {
  repo = repoEnMemoria();
  buzon = [];
  ip = 1;
});

describe('apuntarse', () => {
  it('llega un correo para confirmar y hasta entonces no está activo', async () => {
    await alta(' Ana@Ejemplo.es ');
    expect(buzon).toHaveLength(1);
    expect(buzon[0].para).toBe('ana@ejemplo.es');
    expect(buzon[0].asunto).toBe('Confirma tus avisos de ayudas');
    expect(buzon[0].texto).toContain('Autónomo o autónoma en Málaga · Hostelería · solo yo · de 1 a 3 años');
    const t = tokenDe(buzon[0]);
    expect((await ver(repo, t)).confirmado).toBe(false);

    // Confirmar dos veces da lo mismo
    expect((await confirmar(repo, t)).confirmado).toBe(true);
    expect(await confirmar(repo, t)).toMatchObject({ confirmado: true, perfil: { provincia: 'ES617' } });
  });

  it('si ya está apuntado no se cambia nada y solo se le recuerda su enlace', async () => {
    await alta('ana@ejemplo.es');
    const t = tokenDe(buzon[0]);
    await confirmar(repo, t);

    await alta('ana@ejemplo.es', OTRO, despues(3600_000));
    expect(buzon.at(-1).asunto).toBe('Ya recibes los avisos de ayudas');
    expect(tokenDe(buzon.at(-1))).toBe(t);
    expect((await ver(repo, t)).perfil.provincia).toBe('ES617');
  });

  it('sin confirmar vale el último perfil, pero no se repite el correo en diez minutos', async () => {
    await alta('ana@ejemplo.es');
    await alta('ana@ejemplo.es', OTRO, despues(60_000));
    expect(buzon).toHaveLength(1);

    await alta('ana@ejemplo.es', OTRO, despues(ENTRE_ALTAS_MS + 60_000));
    expect(buzon).toHaveLength(2);
    expect(tokenDe(buzon[1])).toBe(tokenDe(buzon[0]));
    expect((await ver(repo, tokenDe(buzon[1]))).perfil.provincia).toBe('ES300');
  });

  it('datos que no valen', async () => {
    expect(await motivo(alta('no-es-un-email'))).toBe('400 email');
    expect(await motivo(alta('ana@ejemplo.es', { ...PERFIL, provincia: 'ES999' }))).toBe('400 provincia');
    expect(await motivo(alta('ana@ejemplo.es', { ...PERFIL, empleados: 7 }))).toBe('400 empleados');
    expect(await motivo(apuntar(repo, enviar, { email: 'ana@ejemplo.es', perfil: PERFIL, acepto: false }, 'x'))).toBe('400 acepto');
    expect(buzon).toHaveLength(0);
  });

  it('una misma IP no puede apuntar direcciones sin parar', async () => {
    for (let i = 0; i < MAX_POR_IP; i++) await alta(`persona${i}@ejemplo.es`, PERFIL, INICIO, '198.51.100.7');
    expect(await motivo(alta('otra@ejemplo.es', PERFIL, INICIO, '198.51.100.7'))).toBe('429 demasiadas');
    // A los diez minutos, vuelve a poder
    expect(await motivo(alta('otra@ejemplo.es', PERFIL, despues(11 * 60_000), '198.51.100.7'))).toBe('ok');
  });

  it('hay un tope diario de altas para no gastar el cupo de correos de los avisos', async () => {
    for (let i = 0; i < MAX_ALTAS_DIA; i++) await alta(`persona${i}@ejemplo.es`);
    expect(await motivo(alta('una-mas@ejemplo.es'))).toBe('429 cupo');
  });

  it('si el correo no sale, el alta no se queda a medias', async () => {
    const falla = async () => {
      throw new Error('Resend respondió 500');
    };
    expect(await motivo(apuntar(repo, falla, { email: 'ana@ejemplo.es', perfil: PERFIL, acepto: true }, 'x', INICIO))).toBe(
      'Resend respondió 500',
    );
    expect(repo.filas).toHaveLength(0);
  });

  it('de la IP solo queda una huella', () => {
    expect(huella('203.0.113.1')).toMatch(/^[0-9a-f]{64}$/);
    expect(huella('203.0.113.1')).not.toContain('203');
  });
});

describe('con su enlace', () => {
  it('cambia su negocio y se da de baja', async () => {
    await alta('ana@ejemplo.es');
    const t = tokenDe(buzon[0]);
    expect((await cambiar(repo, t, OTRO)).perfil.forma).toBe('sociedad');
    expect(await motivo(cambiar(repo, t, { ...OTRO, provincia: 'XX' }))).toBe('400 provincia');

    await borrar(repo, t);
    expect(await motivo(ver(repo, t))).toBe('404 enlace');
    expect(repo.filas).toHaveLength(0);
  });

  it('un enlace que no existe no da nada', async () => {
    expect(await motivo(ver(repo, 'a'.repeat(43)))).toBe('404 enlace');
    expect(await motivo(confirmar(repo, 'corto'))).toBe('404 enlace');
    await borrar(repo, 'corto');
  });
});

describe('el perfil, como Perfil.java', () => {
  it('quien aún no ha empezado no tiene plantilla ni antigüedad', () => {
    const p = normalizar({ ...PERFIL, forma: 'emprender', empleados: 50, antiguedad: 'mas3', sector: 'i ' });
    expect(p).toMatchObject({ empleados: 0, antiguedad: 'nada', sector: 'I' });
    expect(error(p)).toBeNull();
    expect(resumen(p)).toBe('Aún no ha empezado en Málaga · Hostelería');
  });

  it('cada respuesta tiene que ser de las del formulario', () => {
    expect(error(normalizar({ ...PERFIL, forma: 'cooperativa' }))).toBe('forma');
    expect(error(normalizar({ ...PERFIL, antiguedad: 'nada' }))).toBe('antiguedad');
    expect(error(normalizar({ ...PERFIL, sector: 'Z' }))).toBe('sector');
    expect(error(normalizar({ ...PERFIL, municipio: 'x'.repeat(81) }))).toBe('municipio');
  });
});

describe('frecuencia de los avisos, como SuscripcionApiTest.java', () => {
  it('se elige al apuntarse (diaria si no se dice) y se cambia con su enlace', async () => {
    await apuntar(repo, enviar, { email: 'ana@ejemplo.es', perfil: PERFIL, acepto: true, frecuencia: 'semanal' }, '203.0.113.1', INICIO);
    const t = tokenDe(buzon[0]);
    expect((await ver(repo, t)).frecuencia).toBe('semanal');
    expect((await cambiarFrecuencia(repo, t, { frecuencia: 'diaria' })).frecuencia).toBe('diaria');
    expect(await motivo(cambiarFrecuencia(repo, t, { frecuencia: 'mensual' }))).toBe('400 frecuencia');
    expect(await motivo(cambiarFrecuencia(repo, t, {}))).toBe('400 frecuencia');
    expect(await motivo(cambiarFrecuencia(repo, 'a'.repeat(43), { frecuencia: 'diaria' }))).toBe('404 enlace');

    await alta('luis@ejemplo.es');
    expect((await ver(repo, tokenDe(buzon.at(-1)))).frecuencia).toBe('diaria');
    expect(
      await motivo(apuntar(repo, enviar, { email: 'eva@ejemplo.es', perfil: PERFIL, acepto: true, frecuencia: 'mensual' }, '203.0.113.9', INICIO)),
    ).toBe('400 frecuencia');
  });
});

describe('ayudas que sigue desde el radar, como Seguimientos.java', () => {
  it('se apuntan al darse de alta, solo códigos válidos, sin repetir y con tope', async () => {
    expect(seguidasValidas(['938128', ' 938129 ', 'x', 938130, '938128'])).toEqual(['938128', '938129']);
    expect(seguidasValidas(Array.from({ length: 80 }, (_, i) => String(900000 + i)))).toHaveLength(MAX_SEGUIDAS);
    expect(seguidasValidas('938128')).toEqual([]);

    await apuntar(repo, enviar, { email: 'ana@ejemplo.es', perfil: PERFIL, acepto: true, seguidas: ['1', '2'] }, '203.0.113.1', INICIO);
    expect(repo.avisos.map((a) => a.codigo)).toEqual(['1', '2']);
  });

  it('ya apuntada, no se cambia nada sin el enlace de su correo; la baja las borra', async () => {
    await alta('ana@ejemplo.es');
    const t = tokenDe(buzon[0]);
    await confirmar(repo, t);
    await apuntar(repo, enviar, { email: 'ana@ejemplo.es', perfil: PERFIL, acepto: true, seguidas: ['3'] }, '203.0.113.2', despues(ENTRE_ALTAS_MS + 1));
    expect(repo.avisos).toEqual([]);

    await apuntar(repo, enviar, { email: 'luis@ejemplo.es', perfil: PERFIL, acepto: true, seguidas: ['4'] }, '203.0.113.3', INICIO);
    await borrar(repo, tokenDe(buzon.at(-1)));
    expect(repo.avisos).toEqual([]);
  });
});

describe('guardadas en el radar, como GuardadaController.java', () => {
  it('se cuentan por ayuda, sin datos de nadie; con límite por IP', async () => {
    for (let i = 0; i < 3; i++) await sumarGuardada(repo, '{"codigo":"938128"}', '198.51.100.1', INICIO);
    expect(repo.guardadas.get('938128')).toBe(3);
    expect(await motivo(sumarGuardada(repo, '{"codigo":"x"}', '198.51.100.1', INICIO))).toBe('400 codigo');
    expect(await motivo(sumarGuardada(repo, 'no es json', '198.51.100.1', INICIO))).toBe('400 json');
    for (let i = 3; i < MAX_GUARDADAS_POR_IP; i++) await sumarGuardada(repo, '{"codigo":"1"}', '198.51.100.1', INICIO);
    expect(await motivo(sumarGuardada(repo, '{"codigo":"1"}', '198.51.100.1', INICIO))).toBe('429 demasiadas');
  });
});
