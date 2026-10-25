import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Api, Suscripcion, mensajeDeError, tokenValido } from '../api';
import { aParametros, resumen } from '../perfil';

/** El enlace del primer correo: confirma la dirección */
@Component({
  selector: 'app-confirmar',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (hecha(); as s) {
      <section>
        <p class="eyebrow">Confirmado</p>
        <h1>Listo: te avisaremos</h1>
        <p class="lead">
          Cuando salga una ayuda nueva que encaje con tu negocio, te llegará a
          <strong>{{ s.email }}</strong>. Como mucho, un correo al día.
        </p>
        <p class="nota">{{ resumen(s) }}</p>
        <p class="acciones">
          <a class="boton" [href]="radar(s)">Ver las ayudas abiertas ahora <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1.5 6h9M7 2.5 10.5 6 7 9.5"></path></svg></a>
          <a class="enlace" routerLink="/gestionar" [queryParams]="{ t: t() }">Cambiar mi negocio</a>
        </p>
      </section>
    } @else if (error(); as e) {
      <section>
        <h1>No se ha podido confirmar</h1>
        <p class="error" role="alert">{{ e }}</p>
        <p><a routerLink="/">Apuntarme de nuevo</a></p>
      </section>
    } @else {
      <p class="cargando" aria-live="polite">Confirmando…</p>
    }
  `,
})
export class Confirmar implements OnInit {
  /** ?t= del enlace */
  readonly t = input<string | null>(null);

  private readonly api = inject(Api);
  protected readonly hecha = signal<Suscripcion | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly resumen = (s: Suscripcion) => resumen(s.perfil);
  protected readonly radar = (s: Suscripcion) =>
    `https://subvenciones.felixcorcoran.es/?${aParametros(s.perfil)}`;

  async ngOnInit() {
    const t = this.t();
    if (!tokenValido(t)) return this.error.set('Este enlace no es válido o ya te diste de baja.');
    try {
      this.hecha.set(await this.api.confirmar(t));
    } catch (e) {
      this.error.set(mensajeDeError(e));
    }
  }
}
