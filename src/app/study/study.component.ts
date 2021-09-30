import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContextService } from '../context.service';
import { HttpClient } from '@angular/common/http';
import { EntityEnum, ExternalReferenceService } from '../shared/external-reference/external-reference.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EXTERNAL_REFERENCE_SOURCE } from '../app.constants';
import { brapiAll } from '../util/brapi-all';

declare const BrAPI: any;

@Component({
  selector: 'app-study',
  templateUrl: './study.component.html',
  styleUrls: ['./study.component.css']
})
export class StudyComponent implements OnInit {

  loading = false;
  isSaving = false;
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

  async loadStudyDetail() {
    this.loading = true;
    await brapiAll(this.brapiSource.studies_detail({ studyDbId: this.context.sourceStudy.studyDbId })
    ).then((studyDetails: any) => {
      this.studyDetail = studyDetails[0];
      this.searchLocationByName(this.studyDetail.locationName);
      this.checkStudyAlreadyExists();
    }, (error: any) => {
      this.errors.push({ message: 'Cannot load the study detail due to internal server error.' });
    });
    this.loading = false;
  }

  loadTrialFromDestination() {
    this.brapiDestination.trials({
      externalReferenceId: this.externalReferenceService.getReferenceId(EntityEnum.TRIALS, this.context.sourceTrial.trialDbId),
      externalReferenceSource: EXTERNAL_REFERENCE_SOURCE
    }).all((result: any) => {
      this.context.targetTrial = result[0];
    });
  }

  onStudySelect(): void {
    if (this.context.sourceStudy && this.context.sourceStudy.studyDbId) {
      this.reset();
      this.loadStudyDetail();
      this.loadTrialFromDestination();
    }
  }

  async next(): Promise<void> {
    this.router.navigate(['observation-unit']);
  }

  cancel(): void {
    this.router.navigate(['entity-selector']);
  }

  async post() {
    this.reset();
    this.isSaving = true;
    await this.http.post(this.context.destination + '/studies', [this.transform(this.studyDetail)]).toPromise().then((response: any) => {
      if (response.metadata) {
        this.errors = response.metadata.status.filter((s: any) => s.messageType === 'ERROR');
        this.info = response.metadata.status.filter((s: any) => s.messageType === 'INFO');
        this.studySaved = this.errors.length === 0;
        this.context.targetStudy = response.result.data[0];
      }
    });
    this.isSaving = false;
  }

  searchLocationByName(locationName: string) {
    // FIXME: The Brapi GET locations doesn't have a parameter to search location by name,
    // as a workaround, we load all locations and then search the location by name.
    this.brapiDestination.locations({}).all((locations: any[]) => {
      this.context.targetLocation = locations.find((loc) => {
        return loc.locationName === locationName;
      });
      if (!this.context.targetLocation) {
        this.errors.push({ message: `"${locationName}" does not match any location records in the destination server.` });
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
      environmentParameters: studyDetail.environmentParameters,
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
    return this.context.targetLocation && this.context.targetLocation.locationDbId
      && !this.studyAlreadyExists && !this.studySaved && !this.loading && !this.isSaving;
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
