import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContextService } from '../context.service';
import { HttpClient } from '@angular/common/http';
import { EntityEnum, ExternalReferenceService } from '../shared/external-reference/external-reference.service';
import { StudyFilterComponent } from '../study-filter/study-filter.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EXTERNAL_REFERENCE_SOURCE } from '../app.constants';

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
  studyAlreadyExists: boolean = false;
  studySaved: boolean = false;
  info: any = [];
  errors: any = [];

  brapiSource: any;
  brapiDestination: any;

  constructor(private router: Router,
              private http: HttpClient,
              private externalReferenceService: ExternalReferenceService,
              public modalService: NgbModal,
              public context: ContextService) {
    this.brapiSource = BrAPI(this.context.source, '2.0', this.context.sourceToken);
    this.brapiDestination = BrAPI(this.context.destination, '2.0', this.context.destinationToken);
  }

  ngOnInit(): void {
    // Load the study detail from the source server to make sure we have the properties we need to import it
    this.loadStudyDetail();
    // Get the imported Trial from destination server so that we know its trialDbId
    this.loadTrialFromDestination();
  }

  loadStudyDetail() {
    this.brapiSource.studies_detail({ studyDbId: this.context.sourceStudy.studyDbId }).all((result: any) => {
      this.studyDetail = result[0];
      this.searchLocationByName(this.studyDetail.locationName);
      this.checkStudyAlreadyExists();
    });
  }

  loadTrialFromDestination() {
    this.brapiDestination.trials({
      externalReferenceId: this.externalReferenceService.getReferenceId(EntityEnum.TRIALS, this.context.sourceTrial.trialDbId),
      externalReferenceSource: EXTERNAL_REFERENCE_SOURCE
    }).all((result: any) => {
      this.context.targetTrial = result[0];
    });
  }

  openSearchModal() {
    const modalReference = this.modalService.open(StudyFilterComponent)
    modalReference.componentInstance.trialSelected = this.context.sourceTrial;
    modalReference.componentInstance.studySelected = this.context.sourceStudy;
    modalReference.componentInstance.locationSelected = this.context.sourceLocation;
    modalReference.componentInstance.isTrialDisabled = true;
    modalReference.result.then(() => {
      if (this.context.sourceStudy && this.context.sourceStudy.studyDbId) {
        this.reset();
        this.loadStudyDetail();
        this.loadTrialFromDestination();
      }
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
    await this.http.post(this.context.destination + '/studies', [this.transform(this.studyDetail)]).toPromise().then((response: any) => {
      if (response.metadata) {
        this.errors = response.metadata.status.filter((s: any) => s.messageType === 'ERROR');
        this.info = response.metadata.status.filter((s: any) => s.messageType === 'INFO');
        this.studySaved = this.errors.length === 0;
        this.context.targetStudy = response.result.data[0];
      }
    });
    this.loading = false;
  }

  searchLocationByName(locationName: string) {
    // FIXME: The Brapi GET locations doesn't have a parameter to search location by name,
    // as a workaround, we load all locations and then search the location by name.
    this.brapiDestination.locations({}).all((locations: any[]) => {
      this.context.targetLocation = locations.find((loc) => {
        return loc.locationName === locationName;
      });
      if (!this.context.targetLocation) {
        this.errors.push({message: `"${locationName}" does not match any location records in the destination server.`});
      }
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
      externalReferences: this.externalReferenceService.generateExternalReference(studyDetail.studyDbId, EntityEnum.STUDIES, studyDetail.externalReferences),
      locationDbId: this.context.targetLocation.locationDbId,
      locationDbName: this.context.targetLocation.locationName,
      observationUnitsDescription: '',
      studyName: studyDetail.studyName,
      studyPUI: studyDetail.studyPUI,
      trialDbId: this.context.targetTrial.trialDbId,
      trialName: this.context.targetTrial.trialName
    };
  }

  checkStudyAlreadyExists() {
    // Check if the study to be imported already exists in the destination server
    if (this.studyDetail && this.studyDetail.studyDbId) {
      this.brapiDestination.studies({
        externalReferenceId: this.externalReferenceService.getReferenceId(EntityEnum.STUDIES, this.studyDetail.studyDbId),
        externalReferenceSource: EXTERNAL_REFERENCE_SOURCE
      }).all((result: any) => {
        if (result.length) {
          this.studyAlreadyExists = true;
          this.context.targetStudy = result[0];
        }
      });
    }
  }

  isValid() {
    return this.context.targetLocation && this.context.targetLocation.locationDbId && !this.studyAlreadyExists && !this.studySaved && !this.loading;
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
