import { Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ContextService } from '../../context.service';

declare const BrAPI: any;

@Component({
  selector: 'app-study-select-modal',
  templateUrl: './trial-select-modal.component.html',
  styleUrls: ['./trial-select-modal.component.css']
})
export class TrialSelectModalComponent implements OnInit {

  brapi: any;
  trials: any[] = [];
  studies: any[] = [];
  locations: any[] = [];
  selectedTrial: any;
  selectedStudy: any;
  selectedLocation: any;
  loading = false;

  constructor(public activeModal: NgbActiveModal,
              public context: ContextService) {
  }

  ngOnInit(): void {
    this.brapi = BrAPI(this.context.source, '2.0', this.context.sourceToken);
    this.loadTrials();
    this.loadLocations();
  }

  loadTrials(): void {
    this.brapi.trials({
      programDbId: this.context.programSelected.programDbId
    }).all((result: any[]) => {
      this.trials = result;
    });
  }

  loadLocations(): void {
    // TODO: Enable virtual scrolling
    this.brapi.locations({}).all((result: any[]) => {
      this.locations = result;
    });
  }

  loadStudies(): void {
    // TODO: Filter studies by selected location
    this.brapi.studies({
      trialDbId: this.selectedTrial.trialDbId
    }).all((result: any[]) => {
      this.studies = result;
    });
  }

  select(): void {
    this.activeModal.close(this.selectedStudy);
  }

  cancel(): void {
    this.activeModal.dismiss();
  }

}
