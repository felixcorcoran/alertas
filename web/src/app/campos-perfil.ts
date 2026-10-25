import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ANTIGUEDAD, Antiguedad, COMUNIDADES, FORMAS, Forma, PLANTILLA, Perfil, SECTORES } from './perfil';

export type FormularioPerfil = FormGroup<{
  provincia: FormControl<string>;
  municipio: FormControl<string>;
  forma: FormControl<Forma>;
  empleados: FormControl<number>;
  antiguedad: FormControl<Antiguedad>;
  sector: FormControl<string>;
}>;

export function formularioPerfil(p?: Perfil | null): FormularioPerfil {
  return new FormGroup({
    provincia: new FormControl(p?.provincia ?? '', { nonNullable: true, validators: Validators.required }),
    municipio: new FormControl(p?.municipio ?? '', { nonNullable: true, validators: Validators.maxLength(80) }),
    forma: new FormControl<Forma>(p?.forma ?? 'autonomo', { nonNullable: true }),
    empleados: new FormControl(p?.empleados ?? 0, { nonNullable: true }),
    antiguedad: new FormControl<Antiguedad>(
      p && p.antiguedad !== 'nada' ? p.antiguedad : '1a3',
      { nonNullable: true },
    ),
    sector: new FormControl(p?.sector ?? '', { nonNullable: true }),
  });
}

/** Lo que se manda a la API: quien aún no ha empezado no tiene plantilla ni antigüedad */
export function perfilDe(f: FormularioPerfil): Perfil {
  const v = f.getRawValue();
  const emprender = v.forma === 'emprender';
  return {
    ...v,
    municipio: v.municipio.trim(),
    empleados: emprender ? 0 : Number(v.empleados),
    antiguedad: emprender ? 'nada' : v.antiguedad,
  };
}

/** Las preguntas del negocio, las mismas que en el radar */
@Component({
  selector: 'app-campos-perfil',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset [formGroup]="grupo()">
      <legend class="eyebrow">Tu negocio</legend>

      <div class="dos">
        <label class="campo">
          <span>Provincia o isla</span>
          <select formControlName="provincia" required>
            <option value="" disabled>Elige una</option>
            @for (c of comunidades; track c.nombre) {
              <optgroup [label]="c.nombre">
                @for (p of c.provincias; track p.codigo) {
                  <option [value]="p.codigo">{{ p.nombre }}</option>
                }
              </optgroup>
            }
          </select>
        </label>
        <label class="campo">
          <span>Municipio <small>(opcional)</small></span>
          <input formControlName="municipio" maxlength="80" autocomplete="address-level2" />
        </label>
      </div>

      <div class="campo" role="radiogroup" aria-labelledby="forma-titulo">
        <span id="forma-titulo">Tu negocio es…</span>
        <div class="tarjetas">
          @for (f of formas; track f[0]) {
            <label class="tarjeta">
              <input type="radio" name="forma" formControlName="forma" [value]="f[0]" />
              <span class="titulo">{{ f[1].titulo }}</span>
              <span class="sub">{{ f[1].sub }}</span>
            </label>
          }
        </div>
      </div>

      @if (forma() !== 'emprender') {
        <div class="dos">
          <label class="campo">
            <span>¿Cuántas personas trabajan contigo?</span>
            <select formControlName="empleados">
              @for (t of plantilla; track t[0]) {
                <option [ngValue]="t[0]">{{ t[1] }}</option>
              }
            </select>
          </label>
          <label class="campo">
            <span>¿Cuánto llevas con el negocio?</span>
            <select formControlName="antiguedad">
              @for (a of antiguedad; track a[0]) {
                <option [value]="a[0]">{{ a[1] }}</option>
              }
            </select>
          </label>
        </div>
      }

      <label class="campo">
        <span>¿A qué se dedica?</span>
        <select formControlName="sector">
          @for (s of sectores; track s.letra) {
            <option [value]="s.letra">{{ s.nombre }}</option>
          }
          <option value="">No lo sé o es otra cosa</option>
        </select>
      </label>
    </fieldset>
  `,
  styles: `
    fieldset {
      margin: 0;
      padding: 0;
      border: 0;
      display: grid;
      gap: 1.25rem;
      min-width: 0;
    }
    legend {
      padding: 0;
      margin-bottom: 1rem;
    }
    .dos {
      display: grid;
      gap: 1.25rem;
      grid-template-columns: repeat(auto-fit, minmax(min(16rem, 100%), 1fr));
    }
    .tarjetas {
      display: grid;
      gap: 0.75rem;
      grid-template-columns: repeat(auto-fit, minmax(min(11rem, 100%), 1fr));
    }
    /* Las tarjetas del asistente del radar */
    .tarjeta {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      padding: 1.125rem 1.25rem;
      border-radius: 1rem;
      border: 1px solid rgb(var(--ink) / 0.12);
      background: var(--bg);
      font-weight: 400;
      line-height: 1.35;
      cursor: pointer;
      transition:
        border-color 0.25s var(--ease-out),
        transform 0.25s var(--ease-out),
        box-shadow 0.25s var(--ease-out);
    }
    .tarjeta:hover {
      border-color: rgb(var(--ink) / 0.3);
      transform: translateY(-2px);
      box-shadow: 0 12px 24px -16px rgb(var(--ink) / 0.35);
    }
    .tarjeta:has(input:checked) {
      border-color: var(--text);
      box-shadow: inset 0 0 0 1px var(--text);
    }
    .tarjeta:has(input:focus-visible) {
      outline: 2px solid var(--text);
      outline-offset: 3px;
    }
    .tarjeta input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }
    .titulo {
      font-size: 1.0625rem;
      font-weight: 500;
      letter-spacing: -0.01em;
    }
    .sub {
      font-size: 0.875rem;
      color: var(--text-muted);
    }
  `,
})
export class CamposPerfil {
  readonly grupo = input.required<FormularioPerfil>();

  protected readonly comunidades = COMUNIDADES;
  protected readonly formas = Object.entries(FORMAS) as [Forma, (typeof FORMAS)[Forma]][];
  protected readonly plantilla = PLANTILLA;
  protected readonly antiguedad = ANTIGUEDAD;
  protected readonly sectores = SECTORES;

  /** Quien aún no ha empezado no tiene plantilla ni antigüedad */
  protected readonly forma = () => this.grupo().controls.forma.value;
}
