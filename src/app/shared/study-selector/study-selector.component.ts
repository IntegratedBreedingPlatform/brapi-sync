import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ContextService } from 'src/app/context.service';
import { StudyFilterComponent } from './study-filter.component';

@Component({
  selector: 'app-study-selector',
  templateUrl: './study-selector.component.html',
  styleUrls: ['./study-selector.component.css']
})
export class StudySelectorComponent implements OnInit {

  @Input() trialDisabled: boolean = false;
  @Input() studyDisabled: boolean = false;
  @Input() locationDisabled: boolean = false;
  @Output() onSelect = new EventEmitter<any>();

  searchOptions: any[] = [{ id: 1, name: 'Study' }];
  searchSelected: number = 1;

  constructor(public modalService: NgbModal,
    public context: ContextService) { }

  ngOnInit(): void {
  }
  
  openSearchModal() {
    const modalReference = this.modalService.open(StudyFilterComponent);
    modalReference.componentInstance.trialSelected = this.context.sourceTrial;
    modalReference.componentInstance.studySelected = this.context.sourceStudy;
    modalReference.componentInstance.locationSelected = this.context.sourceLocation;
    modalReference.componentInstance.isTrialDisabled = this.trialDisabled;
    modalReference.componentInstance.isStudyDisabled = this.studyDisabled;
    modalReference.componentInstance.isLocationDisabled = this.locationDisabled;
    modalReference.result.then(() => {
      if (this.context.sourceStudy && this.context.sourceStudy.studyDbId) {
        this.onSelect.emit();
      }
    });
  }

}
