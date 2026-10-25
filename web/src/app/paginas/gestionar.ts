import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Api, mensajeDeError, tokenValido } from '../api';
import { CamposPerfil, FormularioPerfil, formularioPerfil, perfilDe } from '../campos-perfil';

/** Desde el pie de cada correo: cambiar los datos del negocio o darse de baja */
@Component({
  selector: 'app-gestionar',
  imports: [ReactiveFormsModule, CamposPerfil, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (borrada()) {
      <section>
        <h1>Te has dado de baja</h1>
        <p class="lead">Hemos borrado tu email y los datos de tu negocio. No te llegará nada más.</p>
        <p><a href="https://subvenciones.felixcorcoran.es">Volver al radar</a></p>
      </section>
    } @else if (formulario(); as f) {
      <header class="intro">
        <p class="eyebrow">Tus avisos</p>
        <h1>Tu negocio</h1>
        <p class="lead">
          Los avisos llegan a <strong>{{ email() }}</strong>. Si cambia algo de tu negocio,
          actualízalo aquí y las próximas ayudas se compararán con lo nuevo.
        </p>
      </header>
      <form class="caja" [formGroup]="f" (ngSubmit)="guardar(f)">
        <app-campos-perfil [grupo]="f" />
        @if (mensaje(); as m) {
          <p [class]="m.ok ? 'ok' : 'error'" role="status">{{ m.texto }}</p>
        }
        <div class="acciones">
          <button class="boton" type="submit" [disabled]="ocupado()">Guardar los cambios</button>
          <button class="boton boton--suave" type="button" (click)="baja()" [disabled]="ocupado()">
            Darme de baja
          </button>
        </div>
      </form>
    } @else if (error(); as e) {
      <section>
        <h1>Enlace no válido</h1>
        <p class="error" role="alert">{{ e }}</p>
        <p><a routerLink="/">Apuntarme a los avisos</a></p>
      </section>
    } @else {
      <p class="cargando" aria-live="polite">Cargando…</p>
    }
  `,
})
export class Gestionar implements OnInit {
  readonly t = input<string | null>(null);

  private readonly api = inject(Api);
  protected readonly formulario = signal<FormularioPerfil | null>(null);
  protected readonly email = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly mensaje = signal<{ ok: boolean; texto: string } | null>(null);
  protected readonly ocupado = signal(false);
  protected readonly borrada = signal(false);

  async ngOnInit() {
    const t = this.t();
    if (!tokenValido(t)) return this.error.set('Este enlace no es válido o ya te diste de baja.');
    try {
      const s = await this.api.ver(t);
      this.email.set(s.email);
      this.formulario.set(formularioPerfil(s.perfil));
    } catch (e) {
      this.error.set(mensajeDeError(e));
    }
  }

  protected async guardar(f: FormularioPerfil) {
    await this.hacer(async () => {
      await this.api.cambiar(this.t()!, perfilDe(f));
      this.mensaje.set({ ok: true, texto: 'Guardado. Las próximas ayudas se compararán con estos datos.' });
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
