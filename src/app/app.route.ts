import { Route } from '@angular/router';
import { ConnectionsComponent } from './connections/connections.component';
import { ProgramComponent } from './program/program.component';
import { GermplasmComponent } from './germplasm/germplasm.component';
import { EntitySelectorComponent } from './entity-selector/entity-selector.component';
import { TrialComponent } from './trial/trial.component';
import { StudyComponent } from './study/study.component';

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
  },
  {
    path: 'germplasm',
    component: GermplasmComponent
  },
  {
    path: 'trial',
    component: TrialComponent
  },
  {
    path: 'study',
    component: StudyComponent
  },
  {
    path: 'entity-selector',
    component: EntitySelectorComponent
  }
];
