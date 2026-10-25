import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Api, mensajeDeError } from '../api';
import { CamposPerfil, formularioPerfil, perfilDe } from '../campos-perfil';
import { deParametros, resumen } from '../perfil';

/**
 * Apuntarse. Desde los resultados del radar se llega con el negocio ya en la
 * dirección; solo falta el email.
 */
@Component({
  selector: 'app-alta',
  imports: [ReactiveFormsModule, CamposPerfil, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (enviado(); as email) {
      <section class="hecho" aria-live="polite">
        <p class="eyebrow">Casi está</p>
        <h1>Revisa tu correo</h1>
        <p>
          Te hemos escrito a <strong>{{ email }}</strong
          >. Pulsa el enlace del correo para confirmar y empezar a recibir los avisos.
        </p>
        <p class="nota">
          ¿No llega? Mira en la carpeta de spam o promociones. Sin confirmar no te enviaremos nada, y
          tu dirección se borra en 48 horas.
        </p>
      </section>
    } @else {
      <header class="intro">
        <p class="eyebrow">Avisos por email</p>
        <h1>Las ayudas nuevas para tu negocio, en tu correo</h1>
        <p class="entradilla">
          Cada mañana el
          <a href="https://subvenciones.felixcorcoran.es">Radar de subvenciones</a>
          recoge las convocatorias nuevas de toda España. Si alguna encaja con tu negocio, te llega
          un correo con lo que financia, el importe y el plazo. Gratis y sin cuenta: te das de baja
          con un clic.
        </p>
      </header>

      <form [formGroup]="formulario" (ngSubmit)="enviar()" novalidate>
        @if (desdeRadar()) {
          <p class="desde-radar">
            <span class="eyebrow">Tu negocio</span>
            {{ resumenRadar }}
            <button type="button" class="enlace" (click)="desdeRadar.set(false)">Cambiar</button>
          </p>
        } @else {
          <app-campos-perfil [grupo]="formulario.controls.perfil" />
        }

        <label class="campo">
          <span>Tu email</span>
          <input
            type="email"
            formControlName="email"
            autocomplete="email"
            inputmode="email"
            required
            [attr.aria-invalid]="error() === 'email' || null"
          />
        </label>

        <label class="acepto">
          <input type="checkbox" formControlName="acepto" required />
          <span>
            He leído la <a routerLink="/privacidad" target="_blank">política de privacidad</a>: mi
            email y los datos de mi negocio solo se usan para enviarme estos avisos.
          </span>
        </label>

        @if (error(); as e) {
          <p class="error" role="alert">{{ e === 'email' ? 'Escribe un email válido.' : e === 'acepto' ? 'Para apuntarte, marca que has leído la política de privacidad.' : e }}</p>
        }

        <button class="boton" type="submit" [disabled]="enviando()">
          {{ enviando() ? 'Enviando…' : 'Avisarme de las ayudas nuevas' }}
        </button>
        @if (lento()) {
          <p class="nota" aria-live="polite">
            El servidor se estaba echando la siesta: puede tardar hasta un minuto en despertar.
          </p>
        }
      </form>
    }
  `,
})
export class Alta {
  private readonly api = inject(Api);

  private readonly inicial = deParametros(new URLSearchParams(location.search));
  protected readonly desdeRadar = signal(this.inicial !== null);
  protected readonly resumenRadar = this.inicial ? resumen(this.inicial) : '';

  protected readonly formulario = new FormGroup({
    perfil: formularioPerfil(this.inicial),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    acepto: new FormControl(false, { nonNullable: true, validators: Validators.requiredTrue }),
  });

  protected readonly enviando = signal(false);
  protected readonly lento = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly enviado = signal<string | null>(null);

  constructor() {
    this.api.despertar();
  }

  protected async enviar() {
    const f = this.formulario.controls;
    f.email.setValue(f.email.value.trim());
    if (f.perfil.invalid) {
      this.desdeRadar.set(false);
      this.error.set('Elige tu provincia o isla.');
      return;
    }
    if (f.email.invalid) return this.error.set('email');
    if (f.acepto.invalid) return this.error.set('acepto');

    this.error.set(null);
    this.enviando.set(true);
    const aviso = setTimeout(() => this.lento.set(true), 4000);
    try {
      await this.api.apuntar(f.email.value, perfilDe(f.perfil));
      this.enviado.set(f.email.value);
      scrollTo({ top: 0 });
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      clearTimeout(aviso);
      this.enviando.set(false);
      this.lento.set(false);
    }
  }
}
