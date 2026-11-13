import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Política de privacidad de los avisos (RGPD art. 13). Si cambia lo que se
 * guarda o quién lo trata, hay que cambiarla aquí y subir Ajustes.PRIVACIDAD
 * en la API (Ajustes.java) y en web/api/_lib/suscripciones.mjs.
 */
@Component({
  selector: 'app-privacidad',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="texto">
      <p class="eyebrow">Avisos del Radar de subvenciones</p>
      <h1>Política de privacidad</h1>
      <p class="nota">Última revisión: 13 de noviembre de 2026</p>

      <h2>Quién trata tus datos</h2>
      <p>
        Félix Miguel Corcoran Bond. Escríbeme a
        <a href="mailto:contacto@felixcorcoran.es">contacto&#64;felixcorcoran.es</a>. El resto de
        datos del titular están en el <a href="https://felixcorcoran.es/aviso-legal">aviso legal</a>.
      </p>

      <h2>Qué se guarda</h2>
      <ul>
        <li>Tu email.</li>
        <li>
          Los datos de tu negocio que eliges en el formulario: provincia, municipio (si lo pones),
          si eres autónomo o empresa, tramo de plantilla, antigüedad y sector. No se pide tu nombre
          ni el de tu negocio.
        </li>
        <li>
          Las fechas en que te apuntaste, confirmaste y recibiste el último correo, la versión de
          esta política que aceptaste, cada cuánto quieres los avisos (cada día o a la semana) y qué
          ayudas te hemos enviado, con su plazo, para no repetirlas y avisarte si cambia.
        </li>
        <li>
          Si al apuntarte lo pides, los códigos de las ayudas que tenías guardadas en el radar, para
          avisarte también si cambia su plazo.
        </li>
      </ul>
      <p>
        Aparte, cuando alguien guarda una ayuda en el radar se suma uno a la cuenta de esa ayuda
        de ese día, para saber qué interesa. Esa cuenta no lleva ningún dato de quien la guarda.
      </p>
      <p>
        De la IP desde la que te apuntas no se guarda la dirección, solo una huella cifrada
        (SHA-256), durante diez minutos, para frenar abusos. Después se borra.
      </p>

      <h2>Para qué y con qué base</h2>
      <p>
        Solo para enviarte por email las ayudas nuevas que encajan con tu negocio y los cambios de
        plazo de las que te enviamos o sigues, como mucho un correo al día (o a la semana, si lo
        eliges). La base es tu consentimiento (artículo 6.1.a del RGPD), que das al marcar la
        casilla y confirmar tu dirección, y que puedes retirar en cualquier momento.
      </p>

      <h2>Cuánto tiempo</h2>
      <p>
        Hasta que te des de baja: en ese momento se borra todo. Si te apuntas y no confirmas tu
        dirección, se borra a las 48 horas.
      </p>

      <h2>Quién más los trata</h2>
      <p>Para que el servicio funcione, estos proveedores tratan los datos por encargo:</p>
      <ul>
        <li><a href="https://vercel.com/legal/privacy-policy">Vercel</a>, que aloja esta página y recibe los formularios.</li>
        <li><a href="https://neon.com/privacy-policy">Neon</a>, que aloja la base de datos.</li>
        <li><a href="https://resend.com/legal/privacy-policy">Resend</a>, que envía los correos.</li>
        <li><a href="https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement">GitHub</a>, donde se ejecuta cada mañana el reparto de las ayudas.</li>
      </ul>
      <p>
        Algunos son empresas de Estados Unidos; en sus políticas de privacidad explican las
        garantías que aplican a las transferencias internacionales. Tus datos no se ceden ni se
        venden a nadie, ni se usan para publicidad.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Puedes cambiar los datos de tu negocio o darte de baja desde los enlaces del pie de cada
        correo. Para ejercer cualquier otro derecho (acceso, rectificación, supresión, oposición,
        limitación o portabilidad), escribe a
        <a href="mailto:contacto@felixcorcoran.es">contacto&#64;felixcorcoran.es</a>. Si crees que no
        se han respetado, puedes reclamar ante la
        <a href="https://www.aepd.es">Agencia Española de Protección de Datos</a>.
      </p>
    </article>
  `,
  styles: `
    .texto {
      max-width: 44rem;
    }
    h2 {
      margin: 2rem 0 0.5rem;
      font-size: 1.125rem;
    }
    ul {
      padding-left: 1.25rem;
    }
    li + li {
      margin-top: 0.4rem;
    }
  `,
})
export class Privacidad {}
