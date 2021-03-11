import { Component, OnInit } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ContextService } from '../context.service';
declare const BrAPI: any;

@Component({
  selector: 'app-study-filter',
  templateUrl: './study-filter.component.html',
  styleUrls: ['./study-filter.component.css']
})
export class StudyFilterComponent implements OnInit {

  trials: any[] = [];

  constructor(
    private modal: NgbActiveModal,
    public context: ContextService
  ) {
    const brapi = BrAPI(this.context.source, '2.0', this.context.sourceToken);
    brapi.trials({programDbId: this.context.programSelected.programDbId})
      .all((trials: any[]) => this.trials = trials);
  }

  ngOnInit(): void {
  }

  dismiss(): void {
    this.modal.dismiss();
  }

  filter(): void {
    // TODO
    this.modal.close();
  }

}
