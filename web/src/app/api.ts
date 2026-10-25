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
 * La API de los avisos (Spring Boot). En producción, Vercel pasa /api a
 * Render (vercel.json); en local, el proxy de ng serve (proxy.conf.json).
 */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);

  /**
   * El plan gratuito de Render duerme la API si nadie la usa: se la despierta
   * al abrir la página, para que al enviar el formulario ya esté en pie.
   */
  despertar(): void {
    this.http.get('/actuator/health').subscribe({ error: () => {} });
  }

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
