import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Api, Frecuencia, mensajeDeError, tokenValido } from '../api';
import { Asistente } from '../asistente';
import { Perfil, respuestas } from '../perfil';

/** Desde el pie de cada correo: cambiar el negocio (pregunta a pregunta, como en el radar) o darse de baja */
@Component({
  selector: 'app-gestionar',
  imports: [Asistente, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .frecuencia {
      margin: 1.75rem auto 0;
      padding: 0;
      border: 0;
      max-width: 30rem;
      text-align: left;
    }
    .frecuencia legend {
      margin-bottom: 0.5rem;
      font-weight: 600;
    }
    .frecuencia label {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.35rem 0;
      cursor: pointer;
    }
    .frecuencia input {
      width: 1.1rem;
      height: 1.1rem;
      accent-color: var(--accent-text, #c2513c);
    }
    .frecuencia .nota {
      margin-top: 0.5rem;
    }
    .calendario {
      max-width: 30rem;
      margin: 1.5rem auto 0;
      text-align: left;
    }
    .calendario h2 {
      margin: 0 0 0.25rem;
      font-size: 1rem;
    }
    .calendario .enlaces {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.25rem;
    }
  `,
  template: `
    @if (borrada()) {
      <section class="centro">
        <p class="eyebrow">Avisos por email</p>
        <h1>Te has dado de baja</h1>
        <p class="lead">Hemos borrado tu email y los datos de tu negocio. No te llegará nada más.</p>
        <div class="acciones"><a class="enlace" href="https://subvenciones.felixcorcoran.es" data-site-link>Volver al radar</a></div>
      </section>
    } @else if (perfil(); as p) {
      @if (cambiando()) {
        <header class="centro centro--arriba">
          <p class="eyebrow">Tus avisos</p>
          <h1>Cambia tu negocio</h1>
        </header>
        <app-asistente [inicial]="p" (terminado)="guardar($event)" (cancelado)="cambiando.set(false)" />
      } @else {
        <section class="centro">
          <p class="eyebrow">Tus avisos</p>
          <h1>Tu negocio</h1>
          <p class="lead">
            Los avisos llegan a <strong>{{ email() }}</strong> cuando sale una ayuda nueva que encaja con
            esto:
          </p>
          <ul class="respuestas">
            @for (r of respuestas(p); track r) {
              <li>{{ r }}</li>
            }
          </ul>
          <fieldset class="frecuencia" [disabled]="ocupado()">
            <legend>¿Cada cuánto quieres los avisos?</legend>
            <label>
              <input type="radio" name="frecuencia" value="diaria" [checked]="frecuencia() === 'diaria'" (change)="cambiarFrecuencia('diaria')" />
              Cada día que haya algo nuevo
            </label>
            <label>
              <input type="radio" name="frecuencia" value="semanal" [checked]="frecuencia() === 'semanal'" (change)="cambiarFrecuencia('semanal')" />
              Un resumen a la semana
            </label>
            <p class="nota">También te avisamos si cambia el plazo de una ayuda que te enviamos o que seguías desde el radar.</p>
          </fieldset>
          @if (calendario(); as cal) {
            <section class="calendario" aria-labelledby="calendario-titulo">
              <h2 id="calendario-titulo">Tus plazos en el calendario</h2>
              <p class="nota">
                Las ayudas que te enviamos y las que sigues, con su fecha de cierre y un aviso tres días antes. Se
                actualiza solo.
              </p>
              <p class="enlaces">
                <a [href]="webcal(cal)">Añadir a mi calendario</a>
                <a [href]="google(cal)" target="_blank" rel="noopener">En Google Calendar ↗</a>
              </p>
            </section>
          }
          @if (mensaje(); as m) {
            <p [class]="m.ok ? 'ok' : 'error'" role="status">{{ m.texto }}</p>
          }
          <div class="acciones">
            <button class="boton" type="button" (click)="cambiando.set(true)" [disabled]="ocupado()">
              Cambiar mi negocio
              <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1.5 6h9M7 2.5 10.5 6 7 9.5"></path></svg>
            </button>
            <button class="enlace" type="button" (click)="baja()" [disabled]="ocupado()">Darme de baja</button>
          </div>
        </section>
      }
    } @else if (error(); as e) {
      <section class="centro">
        <p class="eyebrow">Avisos por email</p>
        <h1>Enlace no válido</h1>
        <p class="error" role="alert">{{ e }}</p>
        <div class="acciones"><a class="enlace" routerLink="/">Apuntarme a los avisos</a></div>
      </section>
    } @else {
      <p class="centro cargando" aria-live="polite">Cargando…</p>
    }
  `,
})
export class Gestionar implements OnInit {
  readonly t = input<string | null>(null);

  private readonly api = inject(Api);
  protected readonly perfil = signal<Perfil | null>(null);
  protected readonly email = signal('');
  protected readonly frecuencia = signal<Frecuencia>('diaria');
  protected readonly calendario = signal<string | null>(null);
  /** webcal:// para Apple y Outlook; Google Calendar, con la misma dirección */
  protected readonly webcal = (cal: string) => `webcal://${location.host}/api/calendario/${cal}.ics`;
  protected readonly google = (cal: string) => `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(this.webcal(cal))}`;
  protected readonly cambiando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly mensaje = signal<{ ok: boolean; texto: string } | null>(null);
  protected readonly ocupado = signal(false);
  protected readonly borrada = signal(false);
  protected readonly respuestas = respuestas;

  async ngOnInit() {
    const t = this.t();
    if (!tokenValido(t)) return this.error.set('Este enlace no es válido o ya te diste de baja.');
    try {
      const s = await this.api.ver(t);
      this.email.set(s.email);
      this.perfil.set(s.perfil);
      this.frecuencia.set(s.frecuencia ?? 'diaria');
      this.calendario.set(s.calendario ?? null);
    } catch (e) {
      this.error.set(mensajeDeError(e));
    }
  }

  protected async guardar(nuevo: Perfil) {
    this.cambiando.set(false);
    scrollTo({ top: 0, behavior: 'instant' });
    await this.hacer(async () => {
      const s = await this.api.cambiar(this.t()!, nuevo);
      this.perfil.set(s.perfil);
      this.mensaje.set({ ok: true, texto: 'Guardado. Las próximas ayudas se compararán con esto.' });
    });
  }

  protected async cambiarFrecuencia(nueva: Frecuencia) {
    const antes = this.frecuencia();
    this.frecuencia.set(nueva);
    await this.hacer(async () => {
      try {
        const s = await this.api.cambiarFrecuencia(this.t()!, nueva);
        this.frecuencia.set(s.frecuencia);
        this.mensaje.set({
          ok: true,
          texto: s.frecuencia === 'semanal' ? 'Guardado: te llegará un resumen a la semana.' : 'Guardado: te avisaremos cada día que haya algo.',
        });
      } catch (e) {
        this.frecuencia.set(antes);
        throw e;
      }
    });
  }

  protected async baja() {
    if (!confirm('¿Darte de baja? Se borrarán tu email y los datos de tu negocio.')) return;
    await this.hacer(async () => {
      await this.api.borrar(this.t()!);
      this.borrada.set(true);
    });
  }

  private async hacer(accion: () => Promise<void>) {
    this.ocupado.set(true);
    this.mensaje.set(null);
    try {
      await accion();
    } catch (e) {
      this.mensaje.set({ ok: false, texto: mensajeDeError(e) });
    } finally {
      this.ocupado.set(false);
    }
  }
}
