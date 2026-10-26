import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Perfil } from './perfil';

export interface Suscripcion {
  email: string;
  perfil: Perfil;
  confirmado: boolean;
}

/**
 * La API de los avisos. En producción la sirven las funciones de Vercel
 * (web/api/); en local, la API Spring Boot a través del proxy de ng serve
 * (proxy.conf.json). Las dos responden igual.
 */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);

  apuntar(email: string, perfil: Perfil): Promise<unknown> {
    return firstValueFrom(this.http.post('/api/suscripciones', { email, perfil, acepto: true }));
  }

  confirmar(token: string): Promise<Suscripcion> {
    return firstValueFrom(this.http.post<Suscripcion>('/api/suscripciones/confirmar', { token }));
  }

  ver(token: string): Promise<Suscripcion> {
    return firstValueFrom(this.http.get<Suscripcion>(`/api/suscripciones/${token}`));
  }

  cambiar(token: string, perfil: Perfil): Promise<Suscripcion> {
    return firstValueFrom(this.http.put<Suscripcion>(`/api/suscripciones/${token}`, perfil));
  }

  borrar(token: string): Promise<unknown> {
    return firstValueFrom(this.http.delete(`/api/suscripciones/${token}`));
  }
}

/** Lo que se le dice a la persona cuando algo falla */
export function mensajeDeError(e: unknown): string {
  const estado = e instanceof HttpErrorResponse ? e.status : 0;
  if (estado === 400) return 'Revisa los datos: alguno no es válido.';
  if (estado === 404) return 'Este enlace no es válido o ya te diste de baja.';
  if (estado === 429) return 'Demasiados intentos seguidos. Prueba de nuevo en unos minutos.';
  return 'No hemos podido conectar. Inténtalo de nuevo en un momento.';
}

/** Los enlaces de los correos llevan un token de 43 caracteres */
export const tokenValido = (t: string | null): t is string => !!t && /^[A-Za-z0-9_-]{43}$/.test(t);
