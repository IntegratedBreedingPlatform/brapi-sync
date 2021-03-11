import { Route } from '@angular/router';
import { ConnectionsComponent } from './connections/connections.component';
import { ProgramComponent } from './program/program.component';

export const routes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'connections'
  },
  {
    path: 'connections',
    component: ConnectionsComponent
  },
  {
    path: 'program',
    component: ProgramComponent
  }
];
