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

@NgModule({
  declarations: [
    AppComponent,
    ConnectionsComponent,
    ProgramComponent,
    GermplasmComponent,
    StudyFilterComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    RouterModule.forRoot(routes),
    RouterModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
