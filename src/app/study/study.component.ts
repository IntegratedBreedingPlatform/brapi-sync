import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContextService } from '../context.service';
import { HttpClient } from '@angular/common/http';
import { ExternalReferenceService } from '../shared/external-reference/external-reference.service';

declare const BrAPI: any;

@Component({
  selector: 'app-study',
  templateUrl: './study.component.html',
  styleUrls: ['./study.component.css']
})
export class StudyComponent implements OnInit {

  searchOptions: any[] = [{ id: 1, name: 'Study' }];
  searchSelected: number = 1;
  loading = false;
  studyDetail: any = {};
  importedTrial: any = {};

  constructor(private router: Router,
              private http: HttpClient,
              private externalReferenceService: ExternalReferenceService,
              public context: ContextService) {
  }

  ngOnInit(): void {
    // Load the study detail from Brapi
    const brapi = BrAPI(this.context.source, '2.0', this.context.sourceToken);
    brapi.studies_detail({ studyDbId: this.context.studySelected.studyDbId }).all((result: any) => {
      this.studyDetail = result[0];
    });

    // Get the imported Trial from destination server
    const brapiDestination = BrAPI(this.context.destination, '2.0', this.context.destinationToken);
    brapiDestination.trials({
      externalReferenceId: this.externalReferenceService.getReferenceId('trials', this.context.trialSelected.trialDbId),
      externalReferenceSource: 'brapi-sync'
    }).all((result: any) => {
      this.importedTrial = result[0];
      console.log(this.context.trialSelected);
      console.log('Imported Trial');
      console.log(this.importedTrial);
    });
  }

  async next(): Promise<void> {
    this.router.navigate(['observation']);
  }

  back(): void {
    this.router.navigate(['trial']);
  }

  async post() {
    this.loading = true;
    await this.http.post(this.context.destination + '/studies', [this.transform(this.studyDetail)]).toPromise();
    this.loading = false;
  }

  transform(data: any) {
    return {
      active: data.active,
      additionalInfo: data.additionalInfo,
      culturalPractices: data.culturalPractices,
      dataLinks: data.dataLinks,
      documentationURL: data.documentationURL,
      experimentalDesign: data.experimentalDesign,
      externalReferences: data.externalReferences,
      locationDbId: '9016', // TODO: Map the location
      locationDbName: 'Unspecified Location', // TODO: Map the location
      observationUnitsDescription: '',
      studyName: data.studyName,
      studyPUI: data.studyPUI,
      trialDbId: this.importedTrial.trialDbId,
      trialName: this.importedTrial.trialName
    };
  }


}
