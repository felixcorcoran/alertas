import { Routes } from '@angular/router';

import { Alta } from './paginas/alta';
import { Baja } from './paginas/baja';
import { Confirmar } from './paginas/confirmar';
import { Gestionar } from './paginas/gestionar';
import { Privacidad } from './paginas/privacidad';

export const routes: Routes = [
  { path: '', component: Alta, title: 'Avisos de ayudas para tu negocio · Radar de subvenciones' },
  { path: 'confirmar', component: Confirmar, title: 'Confirmar los avisos · Radar de subvenciones' },
  { path: 'gestionar', component: Gestionar, title: 'Tus avisos · Radar de subvenciones' },
  { path: 'baja', component: Baja, title: 'Darse de baja · Radar de subvenciones' },
  { path: 'privacidad', component: Privacidad, title: 'Privacidad de los avisos · Radar de subvenciones' },
  { path: '**', redirectTo: '' },
];
