import { Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ContextService } from '../context.service';

declare const BrAPI: any;

@Component({
  selector: 'app-study-filter',
  templateUrl: './study-filter.component.html',
  styleUrls: ['./study-filter.component.css']
})
export class StudyFilterComponent implements OnInit {

  isTrialDisabled = false;
  brapiSource: any;
  trials: any[] = [];
  studies: any[] = [];
  locations: any[] = [];
  trialSelected: any;
  studySelected: any;
  locationSelected: any;
  loading = false;

  constructor(public activeModal: NgbActiveModal,
              public context: ContextService) {
    this.brapiSource = BrAPI(this.context.source, '2.0', this.context.sourceToken);
  }

  ngOnInit(): void {
    this.loadTrials();
    this.loadLocations();
    this.loadStudies();
  }

  loadTrials(): void {
    // TODO: Enable virtual scrolling
    this.brapiSource.trials({
      programDbId: this.context.sourceProgram.programDbId
    }).all((result: any[]) => {
      this.trials = result;
    });
  }

  loadLocations(): void {
    // TODO: Enable virtual scrolling
    this.brapiSource.locations({}).all((result: any[]) => {
      this.locations = result;
    });
  }

  loadStudies(): void {
    // TODO: Enable virtual scrolling
    const params: any = {};
    if (this.trialSelected) {
      params.trialDbId = this.trialSelected.trialDbId;
    }
    if (this.locationSelected && this.locationSelected.locationDbId) {
      params.locationDbId = this.locationSelected.locationDbId;
    }
    this.studySelected = null;
    this.brapiSource.studies(Object.assign({
      programDbId: this.context.sourceProgram.programDbId,
      active: true,
      // put a limit for now (default page=1000). TODO paginated dropdown
      pageRange: [0, 1],
    }, params)).all((result: any[]) => {
      this.studies = result;
    });
  }

  select(): void {
    this.context.sourceStudy = this.studySelected;
    this.context.sourceTrial = this.trialSelected;
    this.context.sourceLocation = this.locationSelected;
    this.activeModal.close();
  }

  cancel(): void {
    this.activeModal.close();
  }

  isValid() {
    return !this.loading && this.studySelected;
  }

}
