import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, input, output, signal, viewChild } from '@angular/core';

import formas from '../../../datos/formas.json';
import { ANTIGUEDAD, Antiguedad, COMUNIDADES, FORMAS, Forma, PLANTILLA, Perfil, SECTORES } from './perfil';

type Paso = 'comunidad' | 'provincia' | 'municipio' | 'forma' | 'empleados' | 'antiguedad' | 'sector';
const ORDEN: Paso[] = ['comunidad', 'provincia', 'municipio', 'forma', 'empleados', 'antiguedad', 'sector'];
const ISLAS = new Set(['ES53', 'ES70']);
const SILUETAS = formas as { comunidades: Record<string, string>; provincias: Record<string, string> };

type Respuestas = Partial<Perfil> & { comunidad?: string };

const sinTildes = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

/**
 * Las preguntas del negocio, una a una: el mismo asistente que el Radar de
 * subvenciones (src/components/Asistente.astro), con las siluetas de cada
 * comunidad y provincia (datos/formas.json) y los municipios de cada
 * provincia para autocompletar (public/municipios). Los dos ficheros los
 * genera el radar; aquí son una copia.
 */
@Component({
  selector: 'app-asistente',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './asistente.html',
  styleUrl: './asistente.css',
})
export class Asistente {
  /** Las respuestas de partida (las que ya tiene guardadas) */
  readonly inicial = input<Perfil | null>(null);
  readonly terminado = output<Perfil>();
  readonly cancelado = output<void>();

  protected readonly comunidades = COMUNIDADES;
  protected readonly siluetas = SILUETAS;
  protected readonly formas = Object.entries(FORMAS) as [Forma, (typeof FORMAS)[Forma]][];
  protected readonly plantilla = PLANTILLA;
  protected readonly antiguedades = ANTIGUEDAD;
  protected readonly sectores = SECTORES;

  protected readonly paso = signal<Paso>('comunidad');
  protected readonly r = signal<Respuestas>({});
  private historial: Paso[] = [];

  protected readonly comunidad = computed(() => this.comunidades.find((c) => c.codigo === this.r().comunidad));
  protected readonly islas = computed(() => ISLAS.has(this.r().comunidad ?? ''));

  private saltar(p: Paso, r = this.r()): boolean {
    const c = this.comunidades.find((x) => x.codigo === r.comunidad);
    return (
      (p === 'provincia' && (c?.provincias.length ?? 0) <= 1) ||
      ((p === 'empleados' || p === 'antiguedad') && r.forma === 'emprender')
    );
  }

  /** «Pregunta 2 de 6»: provincia cuenta con comunidad, como en el radar */
  protected readonly contador = computed(() => {
    const lista = ORDEN.filter((p) => !this.saltar(p) && p !== 'provincia');
    const p = this.paso();
    return `Pregunta ${lista.indexOf(p === 'provincia' ? 'comunidad' : p) + 1} de ${lista.length}`;
  });
  protected readonly progreso = computed(() => Math.round((ORDEN.indexOf(this.paso()) / ORDEN.length) * 100));

  private readonly buscador = viewChild<ElementRef<HTMLInputElement>>('buscador');

  constructor() {
    // Empieza con lo que ya tenía, para que vea marcadas sus respuestas
    effect(() => {
      const p = this.inicial();
      if (!p) return;
      const comunidad = COMUNIDADES.find((c) => c.provincias.some((x) => x.codigo === p.provincia))?.codigo;
      this.r.set({ ...p, comunidad });
    });
    // El buscador de municipios, con el foco al llegar
    effect(() => {
      const el = this.buscador()?.nativeElement;
      if (el) setTimeout(() => el.focus({ preventScroll: true }), 350);
    });
  }

  protected elegido(clave: keyof Respuestas, valor: string | number): boolean {
    const r = this.r();
    if (clave === 'sector') return r.sector !== undefined && r.sector === valor && this.tocado.has('sector');
    return r[clave] !== undefined && String(r[clave]) === String(valor);
  }
  /** El sector vacío («No lo sé») solo sale marcado si lo eligió */
  private readonly tocado = new Set<string>();

  private mostrar(p: Paso) {
    this.paso.set(p);
    // Cada pregunta, desde arriba: si la anterior era larga, no se queda a medias con el pie asomando
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (p === 'municipio') this.cargarMunicipios();
  }

  private siguiente(desde: Paso) {
    this.historial.push(desde);
    let i = ORDEN.indexOf(desde) + 1;
    while (i < ORDEN.length && this.saltar(ORDEN[i])) i++;
    if (i >= ORDEN.length) return this.terminar();
    this.mostrar(ORDEN[i]);
  }

  /** En la primera pregunta, «Atrás» cierra el asistente */
  protected atras() {
    const p = this.historial.pop();
    if (p) this.mostrar(p);
    else this.cancelado.emit();
  }

  private terminar() {
    const r = this.r();
    const emprender = r.forma === 'emprender';
    this.terminado.emit({
      provincia: r.provincia!,
      municipio: r.municipio ?? '',
      forma: r.forma!,
      empleados: emprender ? 0 : (r.empleados ?? 0),
      antiguedad: emprender ? 'nada' : r.antiguedad && r.antiguedad !== 'nada' ? r.antiguedad : '1a3',
      sector: r.sector ?? '',
    });
  }

  private poner(cambio: Respuestas) {
    this.r.update((r) => ({ ...r, ...cambio }));
  }

  protected elegirComunidad(codigo: string) {
    const c = this.comunidades.find((x) => x.codigo === codigo)!;
    const cambio: Respuestas = { comunidad: codigo };
    if (c.provincias.length === 1) cambio.provincia = c.provincias[0].codigo;
    else if (!c.provincias.some((p) => p.codigo === this.r().provincia)) cambio.provincia = undefined;
    this.poner(cambio);
    this.siguiente('comunidad');
  }

  protected elegirProvincia(codigo: string) {
    if (codigo !== this.r().provincia) this.poner({ municipio: undefined });
    this.poner({ provincia: codigo });
    this.siguiente('provincia');
  }

  protected elegirForma(forma: Forma) {
    this.poner({ forma });
    this.siguiente('forma');
  }

  protected elegirEmpleados(empleados: number) {
    this.poner({ empleados });
    this.siguiente('empleados');
  }

  protected elegirAntiguedad(antiguedad: Antiguedad) {
    this.poner({ antiguedad });
    this.siguiente('antiguedad');
  }

  protected elegirSector(sector: string) {
    this.tocado.add('sector');
    this.poner({ sector });
    this.siguiente('sector');
  }

  // Municipio, con sugerencias de los de la provincia elegida
  private municipios: string[] = [];
  private cargados = '';
  protected readonly escrito = signal('');
  protected readonly activo = signal(-1);
  protected readonly abierto = signal(false);

  protected readonly sugerencias = computed(() => {
    const q = sinTildes(this.escrito());
    if (!q || !this.abierto()) return [];
    const empiezan = this.municipios.filter((m) => sinTildes(m).startsWith(q));
    const contienen = this.municipios.filter((m) => !sinTildes(m).startsWith(q) && sinTildes(m).includes(q));
    // La parte escrita, en negrita (quitar tildes no cambia la longitud)
    return [...empiezan, ...contienen].slice(0, 8).map((m) => {
      const k = sinTildes(m).indexOf(q);
      return { m, antes: m.slice(0, k), marca: m.slice(k, k + q.length), despues: m.slice(k + q.length) };
    });
  });

  private async cargarMunicipios() {
    this.escrito.set(this.r().municipio ?? '');
    this.abierto.set(false);
    const provincia = this.r().provincia!;
    if (this.cargados === provincia) return;
    this.cargados = provincia;
    try {
      this.municipios = (await (await fetch(`/municipios/${provincia}.json`)).json()) as string[];
    } catch {
      this.municipios = [];
    }
  }

  protected escribir(valor: string) {
    this.escrito.set(valor);
    this.activo.set(-1);
    this.abierto.set(true);
  }

  protected teclas(e: KeyboardEvent) {
    const lista = this.sugerencias();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!lista.length) return;
      e.preventDefault();
      this.activo.update((a) => (a + (e.key === 'ArrowDown' ? 1 : -1) + lista.length) % lista.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const a = this.activo();
      if (a >= 0 && lista[a]) this.elegirMunicipio(lista[a].m);
      else if (lista.length === 1) this.elegirMunicipio(lista[0].m);
      else this.seguirMunicipio();
    } else if (e.key === 'Escape') this.abierto.set(false);
  }

  protected cerrarSugerencias() {
    setTimeout(() => this.abierto.set(false), 100);
  }

  protected elegirMunicipio(m: string) {
    this.escrito.set(m);
    this.abierto.set(false);
    this.poner({ municipio: m });
    this.siguiente('municipio');
  }

  protected seguirMunicipio() {
    const escrito = this.escrito().trim();
    const exacto = this.municipios.find((m) => sinTildes(m) === sinTildes(escrito));
    this.poner({ municipio: (exacto ?? escrito).slice(0, 80) });
    this.siguiente('municipio');
  }

  protected saltarMunicipio() {
    this.escrito.set('');
    this.poner({ municipio: '' });
    this.siguiente('municipio');
  }
}
