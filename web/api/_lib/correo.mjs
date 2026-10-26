/**
 * Los dos correos que salen al momento (confirmar el alta y «ya estabas
 * apuntado»), con el mismo HTML que Plantillas.java. El de las ayudas lo
 * manda la pasada diaria de Spring Boot.
 */
import { resumen } from './perfil.mjs';

const WEB = process.env.ALERTAS_WEB ?? 'https://alertas.felixcorcoran.es';
const REMITENTE = process.env.ALERTAS_REMITENTE ?? 'Radar de subvenciones <avisos@felixcorcoran.es>';

const escapar = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const boton = (texto, enlace) =>
  `<a href="${escapar(enlace)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#171717;color:#FAF9F6;text-decoration:none;font-weight:600">${escapar(texto)}</a>\n`;

function caja(titulo, cuerpo) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapar(titulo)}</title></head>
<body style="margin:0;padding:24px 12px;background:#FAF9F6;color:#171717;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55">
<div style="max-width:560px;margin:0 auto">
<p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#C2513C">Radar de subvenciones</p>
<h1 style="margin:0 0 20px;font-size:22px;line-height:1.25">${escapar(titulo)}</h1>
${cuerpo}
<p style="margin:32px 0 0;padding-top:16px;border-top:1px solid #E7E4DE;color:#6B6B6B;font-size:12px">Hecho por <a href="https://felixcorcoran.es" style="color:#6B6B6B">Félix Corcoran</a> · <a href="${escapar(WEB)}/privacidad" style="color:#6B6B6B">Privacidad</a></p>
</div></body></html>
`;
}

export function confirmar(email, perfil, token) {
  const enlace = `${WEB}/confirmar?t=${token}`;
  const asunto = 'Confirma tus avisos de ayudas';
  const texto = `Has pedido recibir por email las ayudas nuevas que encajen con tu negocio:
${resumen(perfil)}

Para empezar, confirma tu dirección:
${enlace}

Si no lo has pedido tú, ignora este correo: sin confirmar no te enviaremos nada y borraremos tu dirección en 48 horas.
`;
  const html = caja(
    asunto,
    `<p style="margin:0 0 12px">Has pedido recibir por email las ayudas nuevas que encajen con tu negocio:</p>
<p style="margin:0 0 24px;color:#6B6B6B">${escapar(resumen(perfil))}</p>
${boton('Confirmar mis avisos', enlace)}<p style="margin:24px 0 0;color:#6B6B6B;font-size:13px">Si no lo has pedido tú, ignora este correo: sin confirmar no te enviaremos nada y borraremos tu dirección en 48 horas.</p>
`,
  );
  return { para: email, asunto, html, texto };
}

/** Alguien ha vuelto a escribir un email que ya está apuntado: no se cambia nada, solo se le recuerda su enlace */
export function yaApuntado(email, token) {
  const enlace = `${WEB}/gestionar?t=${token}`;
  const asunto = 'Ya recibes los avisos de ayudas';
  const texto = `Alguien (seguramente tú) ha vuelto a apuntar esta dirección a los avisos del Radar de subvenciones. Ya estaba apuntada, así que no hemos cambiado nada.

Para cambiar los datos de tu negocio o darte de baja:
${enlace}
`;
  const html = caja(
    asunto,
    `<p style="margin:0 0 24px">Alguien (seguramente tú) ha vuelto a apuntar esta dirección a los avisos del Radar de subvenciones. Ya estaba apuntada, así que no hemos cambiado nada.</p>
${boton('Cambiar mi negocio o darme de baja', enlace)}`,
  );
  return { para: email, asunto, html, texto };
}

/** Por la API HTTP de Resend; sin RESEND_API_KEY (en local) solo se escribe en el log */
export async function enviar(m) {
  const clave = process.env.RESEND_API_KEY;
  if (!clave) {
    console.log(`Correo a ${m.para}: ${m.asunto}\n${m.texto}`);
    return;
  }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: REMITENTE, to: [m.para], subject: m.asunto, html: m.html, text: m.texto }),
  });
  if (!r.ok) throw new Error(`Resend respondió ${r.status}`);
}
