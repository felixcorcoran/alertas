import { describe, expect, it } from 'vitest';

import { COMUNIDADES, PROVINCIAS, SECTORES, aParametros, deParametros, resumen } from './perfil';
import { formularioPerfil, perfilDe } from './campos-perfil';

const q = (s: string) => new URLSearchParams(s);

describe('el perfil que llega del radar', () => {
  it('lee los parámetros de los resultados del radar', () => {
    expect(deParametros(q('provincia=ES617&forma=autonomo&sector=I&municipio=Marbella&empleados=0&antiguedad=1a3'))).toEqual({
      provincia: 'ES617',
      municipio: 'Marbella',
      forma: 'autonomo',
      empleados: 0,
      antiguedad: '1a3',
      sector: 'I',
    });
  });

  it('sin provincia o forma válidas no hay perfil', () => {
    expect(deParametros(q('provincia=ES999&forma=autonomo'))).toBeNull();
    expect(deParametros(q('provincia=ES617&forma=cooperativa'))).toBeNull();
    expect(deParametros(q(''))).toBeNull();
  });

  it('lo que no es una respuesta del formulario vuelve a su valor por defecto', () => {
    const p = deParametros(q('provincia=ES617&forma=sociedad&empleados=7&antiguedad=siempre&sector=Z'))!;
    expect(p.empleados).toBe(0);
    expect(p.antiguedad).toBe('1a3');
    expect(p.sector).toBe('');
  });

  it('quien aún no ha empezado no tiene plantilla ni antigüedad', () => {
    const p = deParametros(q('provincia=ES617&forma=emprender&empleados=10&antiguedad=mas3'))!;
    expect(p.empleados).toBe(0);
    expect(p.antiguedad).toBe('nada');
    expect(aParametros(p)).toBe('provincia=ES617&forma=emprender&sector=');
  });

  it('ida y vuelta: los parámetros del radar dan el mismo perfil', () => {
    const p = deParametros(q('provincia=ES300&forma=sociedad&sector=G&empleados=10&antiguedad=mas3'))!;
    expect(deParametros(q(aParametros(p)))).toEqual(p);
  });
});

describe('textos', () => {
  it('el resumen del negocio se lee como una frase', () => {
    expect(resumen({ provincia: 'ES617', municipio: 'Marbella', forma: 'autonomo', empleados: 0, antiguedad: '1a3', sector: 'I' })).toBe(
      'Autónomo o autónoma en Marbella (Málaga) · Hostelería · nadie, solo yo · de 1 a 3 años',
    );
  });

  it('todas las provincias e islas, agrupadas por comunidad; sin los sectores que no son negocios', () => {
    expect(PROVINCIAS).toHaveLength(59);
    expect(COMUNIDADES.flatMap((c) => c.provincias)).toHaveLength(59);
    expect(SECTORES.map((s) => s.letra)).not.toContain('U');
  });
});

describe('el formulario', () => {
  it('manda el municipio sin espacios y, a quien no ha empezado, sin plantilla ni antigüedad', () => {
    const f = formularioPerfil();
    f.setValue({ provincia: 'ES617', municipio: '  Ronda ', forma: 'emprender', empleados: 50, antiguedad: 'mas3', sector: '' });
    expect(perfilDe(f)).toEqual({ provincia: 'ES617', municipio: 'Ronda', forma: 'emprender', empleados: 0, antiguedad: 'nada', sector: '' });
  });

  it('sin provincia no es válido', () => {
    expect(formularioPerfil().valid).toBe(false);
  });
});
