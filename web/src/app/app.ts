import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

/** Cabecera y pie como los del radar: las mismas webs, el mismo aire */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="cabecera">
      <a class="logo" href="https://felixcorcoran.es" aria-label="Félix Corcoran, inicio">
        <span class="logo-first">felix</span><span class="logo-last">corcoran</span>
      </a>
      <a class="volver" href="https://subvenciones.felixcorcoran.es">Radar de subvenciones</a>
    </header>
    <main>
      <router-outlet />
    </main>
    <footer class="pie">
      <p>
        Los resúmenes de las ayudas son orientativos: lo que vale es la convocatoria oficial. Datos
        del Sistema Nacional de Publicidad de Subvenciones.
      </p>
      <nav aria-label="Otras herramientas">
        <a href="https://subvenciones.felixcorcoran.es">Radar de subvenciones</a>
        <a href="https://diagnostico.felixcorcoran.es">Diagnóstico web</a>
        <a routerLink="/privacidad">Privacidad</a>
        <a class="cta" href="https://felixcorcoran.es/contacto">Solicitar auditoría gratuita</a>
      </nav>
      <p class="firma">Hecho por <a href="https://dev.felixcorcoran.es">Félix Corcoran</a></p>
    </footer>
  `,
})
export class App {}
