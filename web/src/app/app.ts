import { ChangeDetectionStrategy, Component, DOCUMENT, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

/** Enlaces a felixcorcoran.es y a las otras herramientas (los mismos que el radar) */
const SITE = {
  home: 'https://felixcorcoran.es/',
  work: 'https://felixcorcoran.es/#trabajo',
  contact: 'https://felixcorcoran.es/contacto',
  radar: 'https://subvenciones.felixcorcoran.es/',
  diagnostico: 'https://diagnostico.felixcorcoran.es/',
  legal: 'https://felixcorcoran.es/aviso-legal',
  email: 'contacto@felixcorcoran.es',
};

/**
 * La cabecera y el pie del Radar de subvenciones (Navbar.astro y Footer.astro
 * de su repositorio), que a su vez son los de felixcorcoran.es: la píldora
 * con el tema y la firma de eje a eje.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:click)': 'llevarTema($event)' },
  template: `
    <header class="nav">
      <nav class="pill" aria-label="Principal">
        <a class="logo" [href]="site.home" aria-label="Félix Corcoran, inicio" data-site-link>
          <span class="logo-first">felix</span><span class="logo-last">corcoran</span>
        </a>
        <ul class="links">
          <li class="theme-item">
            <button
              class="theme"
              type="button"
              [attr.aria-pressed]="oscuro()"
              aria-label="Cambiar el tema"
              title="Cambiar el tema"
              (click)="cambiarTema($event)"
            >
              <svg class="moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"></path>
              </svg>
              <svg class="sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <circle cx="12" cy="12" r="4"></circle>
                <path
                  d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"
                ></path>
              </svg>
            </button>
          </li>
          <li><a [href]="site.work" data-site-link>Trabajo</a></li>
          <li><a class="highlight" [href]="site.contact" data-site-link>Contacto</a></li>
        </ul>
      </nav>
    </header>

    <main>
      <router-outlet />
    </main>

    <footer class="footer">
      <div class="inner">
        <p class="brand" aria-hidden="true">
          <span class="brand-first">felix</span><span class="brand-last">corcoran</span>
        </p>
        <div class="fine">
          <a class="foot-cta" [href]="site.contact" data-site-link>
            Solicitar auditoría gratuita
            <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
              <path d="M1.5 6h9M7 2.5 10.5 6 7 9.5"></path>
            </svg>
          </a>
          <a class="mail" [href]="'mailto:' + site.email">{{ site.email }}</a>
          <!-- Las otras herramientas gratuitas de felixcorcoran.es -->
          <a class="mail" [href]="site.radar" data-site-link>Radar de subvenciones</a>
          <a class="mail" [href]="site.diagnostico" data-site-link>Diagnóstico web</a>
          <span class="legal">
            <a [href]="site.legal" data-site-link>Aviso legal</a>
            <a routerLink="/privacidad">Privacidad</a>
          </span>
        </div>
      </div>
    </footer>
  `,
})
export class App {
  protected readonly site = SITE;
  private readonly document = inject(DOCUMENT);
  private readonly root = this.document.documentElement;
  protected readonly oscuro = signal(this.root.dataset['theme'] === 'dark');

  /**
   * El tema nuevo se abre en círculo desde la luna hasta cubrir la pantalla,
   * como en felixcorcoran.es (View Transitions). Sin soporte o con movimiento
   * reducido, el cambio es directo.
   */
  protected cambiarTema(evento: MouseEvent) {
    const cambiar = () => {
      const oscuro = !this.oscuro();
      if (oscuro) this.root.dataset['theme'] = 'dark';
      else delete this.root.dataset['theme'];
      this.document.querySelector('[data-theme-color]')?.setAttribute('content', oscuro ? '#131211' : '#FAF9F6');
      try {
        if (oscuro) localStorage.setItem('tema', 'oscuro');
        else localStorage.removeItem('tema');
      } catch {}
      this.oscuro.set(oscuro);
    };

    const doc = this.document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
    if (!doc.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return cambiar();
    const { left, top, width, height } = (evento.currentTarget as HTMLElement).getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const radio = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    doc.startViewTransition(cambiar).ready.then(() => {
      this.root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radio}px at ${x}px ${y}px)`] },
        { duration: 700, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    });
  }

  /**
   * Los enlaces a las otras webs se llevan el tema: son otro origen y no
   * pueden leer lo que se guarda aquí. Se añade al pulsar, así vale también
   * si el tema se cambia después de cargar.
   */
  protected llevarTema(evento: Event) {
    const enlace = (evento.target as Element | null)?.closest<HTMLAnchorElement>('a[data-site-link]');
    if (!enlace) return;
    const url = new URL(enlace.href);
    url.searchParams.set('tema', this.oscuro() ? 'oscuro' : 'claro');
    enlace.href = url.href;
  }
}
