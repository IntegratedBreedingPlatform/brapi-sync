import { Route } from '@angular/router';
import { ConnectionsComponent } from './connections/connections.component';
import { ProgramComponent } from './program/program.component';
import { GermplasmComponent } from './germplasm/germplasm.component';
import { EntitySelectorComponent } from './entity-selector/entity-selector.component';
import { TrialComponent } from './trial/trial.component';
import { StudyComponent } from './study/study.component';
import { ObservationUnitComponent } from './observation-unit/observation-unit.component';
import { VariableComponent } from './variable/variable.component';
import { ObservationComponent } from './observation/observation.component';

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
    path: 'entity-selector',
    component: EntitySelectorComponent
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
    path: 'observation-unit',
    component: ObservationUnitComponent
  },
  {
    path: 'variable',
    component: VariableComponent
  },
  {
    path: 'observation',
    component: ObservationComponent
  }
];
