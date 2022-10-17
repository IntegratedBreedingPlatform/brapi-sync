import { Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ContextService } from '../context.service';
import { Germplasm } from '../shared/brapi/2.0/model/germplasm';
import { CrossExternalReferences } from '../shared/brapi/2.0/model/cross-external-references';

@Component({
  selector: 'app-germplasm-details',
  templateUrl: './germplasm-source-modal.component.html'
})
export class GermplasmSourceModalComponent implements OnInit {

  sourceGermplasm: Germplasm = {};
  additionalInfo: any = {};
  externalReferences: Array<CrossExternalReferences> = [];

  constructor(private activeModal: NgbActiveModal,
              private context: ContextService) {
  }

  clear(): void {
    this.activeModal.dismiss();
  }

  ngOnInit(): void {
    this.additionalInfo = this.sourceGermplasm.additionalInfo? this.sourceGermplasm.additionalInfo: {};
    this.externalReferences = this.sourceGermplasm.externalReferences? this.sourceGermplasm.externalReferences: [];
  }

}
