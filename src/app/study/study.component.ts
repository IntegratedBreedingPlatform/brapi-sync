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
  targetLocation: any = {};
  studyAlreadyExists: boolean = false;
  studySaved: boolean = false;
  info: any = [];
  errors: any = [];

  constructor(private router: Router,
              private http: HttpClient,
              private externalReferenceService: ExternalReferenceService,
              public context: ContextService) {
  }

  ngOnInit(): void {
    // Load the study detail from the source server to make sure we have the properties we need to import it
    const brapi = BrAPI(this.context.source, '2.0', this.context.sourceToken);
    brapi.studies_detail({ studyDbId: this.context.studySelected.studyDbId }).all((result: any) => {
      this.studyDetail = result[0];
      this.searchLocationByName(this.studyDetail.locationName);
      this.checkStudyAlreadyExists();
    });

    // Get the imported Trial from destination server so that we know its trialDbId
    const brapiDestination = BrAPI(this.context.destination, '2.0', this.context.destinationToken);
    brapiDestination.trials({
      externalReferenceId: this.externalReferenceService.getReferenceId('trials', this.context.trialSelected.trialDbId),
      externalReferenceSource: 'brapi-sync'
    }).all((result: any) => {
      this.importedTrial = result[0];
    });

  }

  async next(): Promise<void> {
    this.router.navigate(['observation']);
  }

  back(): void {
    this.router.navigate(['trial']);
  }

  async post() {
    this.reset();
    this.loading = true;
    await this.http.post(this.context.destination + '/studies', [this.transform(this.studyDetail)]).toPromise().then((result: any) => {
      if (result.metadata) {
        this.errors = result.metadata.status.filter((s: any) => s.messageType === 'ERROR');
        this.info = result.metadata.status.filter((s: any) => s.messageType === 'INFO');
        this.studySaved = this.errors.length === 0;
      }
    });
    this.loading = false;
  }

  searchLocationByName(locationName: string) {
    const brapi = BrAPI(this.context.destination, '2.0', this.context.destinationToken);
    // FIXME: The Brapi GET locations doesn't have a parameter to search location by name,
    // as a workaround, we load all locations and then search the location by name.
    brapi.locations({}).all((locations: any[]) => {
      this.targetLocation = locations.find((loc) => {
        return loc.locationName === locationName;
      });
    });
  }

  transform(studyDetail: any) {
    return {
      active: studyDetail.active,
      additionalInfo: studyDetail.additionalInfo,
      culturalPractices: studyDetail.culturalPractices,
      dataLinks: studyDetail.dataLinks,
      documentationURL: studyDetail.documentationURL,
      experimentalDesign: studyDetail.experimentalDesign,
      externalReferences: this.externalReferenceService.generateExternalReference(studyDetail.studyDbId, 'studies', studyDetail.externalReferences),
      locationDbId: this.targetLocation.locationDbId,
      locationDbName: this.targetLocation.locationName,
      observationUnitsDescription: '',
      studyName: studyDetail.studyName,
      studyPUI: studyDetail.studyPUI,
      trialDbId: this.importedTrial.trialDbId,
      trialName: this.importedTrial.trialName
    };
  }

  checkStudyAlreadyExists() {
    // Check if the study to be imported already exists in the destination server
    if (this.studyDetail && this.studyDetail.studyDbId) {
      const brapiDestination = BrAPI(this.context.destination, '2.0', this.context.destinationToken);
      brapiDestination.studies({
        externalReferenceId: this.externalReferenceService.getReferenceId('studies', this.studyDetail.studyDbId),
        externalReferenceSource: 'brapi-sync'
      }).all((result: any) => {
        if (result.length) {
          this.studyAlreadyExists = true;
        }
      });
    }
  }

  isValid() {
    return this.targetLocation && !this.studyAlreadyExists && !this.loading;
  }

  canProceed(): boolean {
    return !this.loading && (this.studyAlreadyExists || this.studySaved);
  }

  reset() {
    this.loading = false;
    this.info = [];
    this.errors = [];
    this.studyAlreadyExists = false;
    this.studySaved = false;
  }

}
