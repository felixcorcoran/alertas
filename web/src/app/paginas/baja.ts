import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Api, mensajeDeError, tokenValido } from '../api';

/**
 * «Darme de baja» en cada correo. Pide pulsar un botón: algunos gestores de
 * correo abren los enlaces solos para revisarlos, y no deberían dar de baja a
 * nadie (la baja con un clic del propio gestor va por List-Unsubscribe).
 */
@Component({
  selector: 'app-baja',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="centro">
      @if (hecha()) {
        <h1>Te has dado de baja</h1>
        <p class="lead">Hemos borrado tu email y los datos de tu negocio. No te llegará nada más.</p>
        <div class="acciones"><a class="enlace" href="https://subvenciones.felixcorcoran.es" data-site-link>Volver al radar</a></div>
      } @else {
        <p class="eyebrow">Avisos por email</p>
        <h1>¿Dejar de recibir los avisos?</h1>
        <p class="lead">Se borrarán tu email y los datos de tu negocio. Puedes volver a apuntarte cuando quieras.</p>
        @if (error(); as e) {
          <p class="error" role="alert">{{ e }}</p>
        }
        <p class="acciones">
          <button class="boton" type="button" (click)="baja()" [disabled]="ocupado()">
            Darme de baja
          </button>
          @if (valido) {
            <a class="enlace" routerLink="/gestionar" [queryParams]="{ t: t() }">Mejor cambiar mi negocio</a>
          }
        </p>
      }
    </section>
  `,
})
export class Baja {
  readonly t = input<string | null>(null);

  private readonly api = inject(Api);
  protected readonly hecha = signal(false);
  protected readonly ocupado = signal(false);
  protected readonly error = signal<string | null>(null);

  protected get valido() {
    return tokenValido(this.t());
  }

  protected async baja() {
    const t = this.t();
    if (!tokenValido(t)) return this.error.set('Este enlace no es válido o ya te diste de baja.');
    this.ocupado.set(true);
    try {
      await this.api.borrar(t);
      this.hecha.set(true);
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.ocupado.set(false);
    }
  }
}
