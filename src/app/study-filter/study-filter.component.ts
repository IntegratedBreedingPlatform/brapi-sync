import { Component, OnInit } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ContextService } from '../context.service';
import { HttpClient } from '@angular/common/http';

declare const BrAPI: any;

@Component({
  selector: 'app-study-filter',
  templateUrl: './study-filter.component.html',
  styleUrls: ['./study-filter.component.css']
})
export class StudyFilterComponent implements OnInit {

  trials: any[] = [];
  locations: any[] = [];
  studies: any[] = [];

  studySelected: any = null;

  constructor(
    private modal: NgbActiveModal,
    public context: ContextService
  ) {
    let brapi = BrAPI(this.context.source, '2.0', this.context.sourceToken);
    brapi.trials({ programDbId: this.context.programSelected.programDbId })
      .all((trials: any[]) => this.trials = trials);

    brapi = BrAPI(this.context.source, '2.0', this.context.sourceToken);
    brapi.locations({ programDbId: this.context.programSelected.programDbId })
      .all((locations: any[]) => this.locations = locations);

  }

  ngOnInit(): void {
  }

  onChange(): void {
    const params: any = {};
    if (this.context.trialSelected.trialDbId) {
      params.trialDbId = this.context.trialSelected.trialDbId;
    }
    if (this.context.locationSelected.locationDbId) {
      params.locationDbId = this.context.locationSelected.locationDbId;
    }
    this.studySelected = null;
    const brapi = BrAPI(this.context.source, '2.0', this.context.sourceToken);
    brapi.studies(Object.assign({
      programDbId: this.context.programSelected.programDbId,
      active: true,
    }, params)).all((studies: any[]) => this.studies = studies);
  }

  dismiss(): void {
    this.modal.dismiss();
  }

  select(): void {
    this.context.studySelected = this.studySelected;
    this.modal.close();
  }

}
