/**
 * Las consultas a Neon (las mismas tablas que crea Flyway en la API Java,
 * api/src/main/resources/db/migration). Driver HTTP de Neon: cada función de
 * Vercel hace sus consultas sin mantener conexiones abiertas.
 */
import { neon } from '@neondatabase/serverless';

const DIEZ_MINUTOS = 10 * 60_000;
const UN_DIA = 24 * 60 * 60_000;

export function repositorio(sql = neon(process.env.DATABASE_URL)) {
  const uno = (filas) => filas[0] ?? null;
  return {
    porEmail: async (email) => uno(await sql`select * from suscriptores where email = ${email}`),
    porToken: async (token) => uno(await sql`select * from suscriptores where token = ${token}`),

    crear: async ({ email, perfil: p, token, consentimiento, ahora }) =>
      uno(
        await sql`insert into suscriptores
          (id, email, provincia, municipio, forma, empleados, antiguedad, sector, token, estado, consentimiento, creado, ultimo_alta)
          values (gen_random_uuid(), ${email}, ${p.provincia}, ${p.municipio}, ${p.forma}, ${p.empleados}, ${p.antiguedad},
                  ${p.sector}, ${token}, 'PENDIENTE', ${consentimiento}, ${ahora}, ${ahora})
          returning id`,
      ).id,

    marcarAlta: (id, ahora) => sql`update suscriptores set ultimo_alta = ${ahora} where id = ${id}`,
    activar: (id, ahora) => sql`update suscriptores set estado = 'ACTIVO', confirmado = ${ahora} where id = ${id}`,

    /** consentimiento null: no se toca */
    cambiarPerfil: (id, p, consentimiento) =>
      sql`update suscriptores set provincia = ${p.provincia}, municipio = ${p.municipio}, forma = ${p.forma},
            empleados = ${p.empleados}, antiguedad = ${p.antiguedad}, sector = ${p.sector},
            consentimiento = coalesce(${consentimiento}, consentimiento)
          where id = ${id}`,

    /** Los avisos pendientes se van con él (on delete cascade) */
    borrar: (id) => sql`delete from suscriptores where id = ${id}`,

    /** Cuenta esta alta para la huella de la IP y dice cuántas lleva en su ventana de 10 minutos */
    contarIp: async (clave, ahora) => {
      await sql`delete from limites where desde < ${new Date(ahora.getTime() - DIEZ_MINUTOS)}`;
      return uno(
        await sql`insert into limites (clave, desde, veces) values (${clave}, ${ahora}, 1)
          on conflict (clave) do update set veces = limites.veces + 1
          returning veces`,
      ).veces;
    },

    altasUltimoDia: async (ahora) =>
      Number(
        uno(await sql`select count(*) as n from suscriptores where ultimo_alta > ${new Date(ahora.getTime() - UN_DIA)}`).n,
      ),
  };
}
