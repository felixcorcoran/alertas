import { ChangeDetectionStrategy, Component } from '@angular/core';

import { aParametros, deParametros, respuestas } from '../perfil';

const RADAR = 'https://subvenciones.felixcorcoran.es';

/**
 * La portada. Apuntarse se hace en el radar, al terminar sus preguntas (las
 * mismas que harían falta aquí): esta página lo explica y lleva allí. Si
 * llega con un negocio en la dirección (enlaces antiguos), lleva directo a
 * sus resultados, donde está el recuadro de los avisos.
 */
@Component({
  selector: 'app-alta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="centro">
      <p class="eyebrow">Avisos por email</p>
      <h1>Las ayudas nuevas para tu negocio, en tu correo</h1>
      <p class="lead">
        Cada mañana el Radar de subvenciones recoge las convocatorias nuevas de toda España. Si
        alguna encaja con tu negocio, te llega un correo con lo que financia, el importe y el plazo.
        Gratis, sin cuenta y con baja en un clic.
      </p>

      @if (respuestasRadar.length) {
        <ul class="respuestas">
          @for (r of respuestasRadar; track r) {
            <li>{{ r }}</li>
          }
        </ul>
      }

      <div class="acciones">
        <a class="boton" [href]="enlace" data-site-link>
          {{ respuestasRadar.length ? 'Ver tus ayudas y apuntarte' : 'Responder las preguntas' }}
          <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1.5 6h9M7 2.5 10.5 6 7 9.5"></path></svg>
        </a>
      </div>
      <p class="nota">
        Son seis preguntas sobre tu negocio en el radar. Al final te enseña las ayudas abiertas y,
        debajo, te apuntas a los avisos con tu email.
      </p>
      <p class="nota">¿Ya los recibes? Para cambiar tu negocio o darte de baja, usa los enlaces del pie de cada correo.</p>
    </section>
  `,
})
export class Alta {
  private readonly perfil = deParametros(new URLSearchParams(location.search));
  protected readonly respuestasRadar = this.perfil ? respuestas(this.perfil) : [];
  protected readonly enlace = this.perfil ? `${RADAR}/?${aParametros(this.perfil)}#avisos` : `${RADAR}/?empezar`;
}
