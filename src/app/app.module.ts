import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ConnectionsComponent } from './connections/connections.component';
import { routes } from './app.route';
import { ProgramComponent } from './program/program.component';
import { GermplasmComponent } from './germplasm/germplasm.component';
import { StudyFilterComponent } from './study-filter/study-filter.component';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { AuthInterceptor } from './auth.interceptor';
import { EntitySelectorComponent } from './entity-selector/entity-selector.component';
import { CollapsibleComponent } from './shared/collapsible/collapsible.component';
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCaretDown, faCaretRight, faPlus } from '@fortawesome/free-solid-svg-icons';
import { StudyComponent } from './study/study.component';
import { StudySelectModalComponent } from './study/study-select-modal/study-select-modal.component';
import { NgSelectModule } from '@ng-select/ng-select';

@NgModule({
  declarations: [
    AppComponent,
    ConnectionsComponent,
    ProgramComponent,
    GermplasmComponent,
    StudyFilterComponent,
    EntitySelectorComponent,
    CollapsibleComponent,
    StudyComponent,
    StudySelectModalComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    RouterModule.forRoot(routes),
    RouterModule,
    NgbPaginationModule,
    HttpClientModule,
    FontAwesomeModule,
    NgSelectModule,
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {

  constructor(faIconLibrary: FaIconLibrary) {
    // Add an icon to the library for convenient access in other components
    // Only add specific icons explicitly to avoid loading all icons to the bundle.
    faIconLibrary.addIcons(faCaretDown, faCaretRight, faPlus);
  }

}
