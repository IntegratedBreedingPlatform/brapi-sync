import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ContextService } from '../context.service';
import { StudyFilterComponent } from '../study-filter/study-filter.component';
import { HttpClient } from '@angular/common/http';
import { ExternalReferenceService } from '../shared/external-reference/external-reference.service';

declare const BrAPI: any;

@Component({
  selector: 'app-trial',
  templateUrl: './trial.component.html',
  styleUrls: ['./trial.component.css']
})
export class TrialComponent implements OnInit {

  searchOptions: any[] = [{ id: 1, name: 'Study' }];
  searchSelected: number = 1;
  loading = false;
  info: any = [];
  errors: any = [];
  trialAlreadyExists: boolean = false;
  trialSaved: boolean = false;

  constructor(private router: Router,
              private http: HttpClient,
              private externalReferenceService: ExternalReferenceService,
              public context: ContextService,
              public modalService: NgbModal) {
  }

  ngOnInit(): void {
    this.checkTrialAlreadyExists();
  }

  openSearchModal() {
    this.modalService.open(StudyFilterComponent).result.then((result) => {
      this.reset();
      this.checkTrialAlreadyExists();
    });
  }

  async next(): Promise<void> {
    this.router.navigate(['study']);
  }

  back(): void {
    this.router.navigate(['entity-selector']);
  }

  async post() {
    this.reset();
    this.loading = true;
    await this.http.post(this.context.destination + '/trials', [this.transform(this.context.trialSelected)]).toPromise().then((response: any) => {
      if (response.metadata) {
        this.errors = response.metadata.status.filter((s: any) => s.messageType === 'ERROR');
        this.info = response.metadata.status.filter((s: any) => s.messageType === 'INFO');
        this.trialSaved = this.errors.length === 0;
        this.context.targetTrial = response.result.data[0];
      }
    });
    this.loading = false;
  }

  transform(trial: any) {
    return {
      active: trial.active,
      additionalInfo: trial.additionalInfo,
      datasetAuthorships: trial.datasetAuthorships,
      documentationURL: trial.documentationURL,
      endDate: trial.endDate,
      externalReferences: this.externalReferenceService.generateExternalReference(trial.trialDbId, 'trials', trial.externalReferences),
      programDbId: this.context.targetProgramSelected.programDbId,
      programName: this.context.targetProgramSelected.programName,
      publications: trial.publications,
      startDate: trial.startDate,
      trialName: trial.trialName,
      trialDescription: trial.trialDescription,
      trialPUI: trial.trialPUI
    };
  }

  checkTrialAlreadyExists() {
    // Check if the trial to be imported already exists in the destination server
    if (this.context.trialSelected && this.context.trialSelected.trialDbId) {
      const brapiDestination = BrAPI(this.context.destination, '2.0', this.context.destinationToken);
      brapiDestination.trials({
        externalReferenceId: this.externalReferenceService.getReferenceId('trials', this.context.trialSelected.trialDbId),
        externalReferenceSource: 'brapi-sync'
      }).all((result: any) => {
        if (result.length) {
          this.trialAlreadyExists = true;
        }
      });
    }
  }

  isValid(): boolean {
    return this.context.trialSelected.trialDbId && this.context.studySelected.studyDbId
      && !this.trialAlreadyExists && !this.trialSaved && !this.loading;
  }

  canProceed(): boolean {
    return !this.loading && (this.trialSaved || this.trialAlreadyExists);
  }

  reset() {
    this.loading = false;
    this.info = [];
    this.errors = [];
    this.trialSaved = false;
    this.trialAlreadyExists = false;
  }


}
