import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ConnectionsComponent } from './connections/connections.component';
import { routes } from './app.route';
import { ProgramComponent } from './program/program.component';
import { GermplasmComponent } from './germplasm/germplasm.component';
import { NgbPaginationModule, NgbToastModule } from '@ng-bootstrap/ng-bootstrap';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { AuthInterceptor } from './auth.interceptor';
import { EntitySelectorComponent } from './entity-selector/entity-selector.component';
import { CollapsibleComponent } from './shared/collapsible/collapsible.component';
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCaretDown, faCaretRight, faCheck, faExclamationTriangle, faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';
import { TrialComponent } from './trial/trial.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgxJsonViewerModule } from 'ngx-json-viewer';
import { ExpandableJsonViewerComponent } from './shared/expandable-json-viewer/expandable-json-viewer.component';
import { StudyComponent } from './study/study.component';
import { ObservationUnitComponent } from './observation-unit/observation-unit.component';
import { VariableComponent } from './variable/variable.component';
import { ObservationComponent } from './observation/observation.component';
import { ObjectKeysPipe } from './shared/pipes/object-keys.pipe';
import { StudySelectorComponent } from './shared/study-selector/study-selector.component';
import { StudyFilterComponent } from './shared/study-selector/study-filter.component';
import { ToastsContainer } from './shared/alert/toast-container.component';
import { AlertService } from './shared/alert/alert.service';
import { ToastService } from './shared/alert/toast.service';
import { DropdownVirtualScrollComponent } from './shared/dropdown-virtual-scroll/dropdown-vritual-scroll.component';
import { OAuthModule, OAuthService } from 'angular-oauth2-oidc';
import { DelegatedAuthenticationService } from './auth/delegated-authentication.service';
import { BlockUIModule, BlockUIService } from 'ng-block-ui';
import { PedigreeService } from './shared/brapi/2.1/api/pedigree.service';
import { GermplasmService } from './shared/brapi/2.0/api/germplasm.service';

@NgModule({
  declarations: [
    AppComponent,
    ConnectionsComponent,
    ProgramComponent,
    GermplasmComponent,
    StudyFilterComponent,
    EntitySelectorComponent,
    CollapsibleComponent,
    TrialComponent,
    ExpandableJsonViewerComponent,
    StudyComponent,
    ObservationUnitComponent,
    VariableComponent,
    ObservationComponent,
    ObjectKeysPipe,
    StudySelectorComponent,
    ToastsContainer,
    DropdownVirtualScrollComponent
  ],
  imports: [
    OAuthModule.forRoot(),
    BlockUIModule.forRoot({
      delayStart: 3000,
      delayStop: 500
    }),
    BrowserModule,
    FormsModule,
    RouterModule.forRoot(routes),
    RouterModule,
    NgbPaginationModule,
    HttpClientModule,
    FontAwesomeModule,
    NgSelectModule,
    NgxJsonViewerModule,
    NgbToastModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    ToastService,
    AlertService,
    OAuthService,
    DelegatedAuthenticationService,
    BlockUIService,
    GermplasmService,
    PedigreeService
  ],
  bootstrap: [AppComponent]
})
export class AppModule {

  constructor(faIconLibrary: FaIconLibrary) {
    // Add an icon to the library for convenient access in other components
    // Only add specific icons explicitly to avoid loading all icons to the bundle.
    faIconLibrary.addIcons(faCaretDown, faCaretRight, faPlus, faCheck, faTimes, faExclamationTriangle);
  }

}
