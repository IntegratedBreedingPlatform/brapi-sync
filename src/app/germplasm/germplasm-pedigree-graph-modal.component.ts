import { Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { PedigreeNode } from '../shared/brapi/2.1/model/pedigree-node';
import { PedigreeService } from '../shared/brapi/2.1/api/pedigree.service';
import { ContextService } from '../context.service';
import { Germplasm } from '../shared/brapi/2.0/model/germplasm';
import { PedigreeUtilService } from '../shared/pedigree/pedigree-util.service';
import { GraphNode } from '../shared/pedigree-graph/graph-node';
import { GermplasmService } from '../shared/brapi/2.0/api/germplasm.service';
import { BreedingMethod } from '../shared/brapi/2.0/model/breeding-method';

@Component({
  selector: 'app-germplasm-pedigree-graph',
  templateUrl: './germplasm-pedigree-graph-modal.component.html',
  styleUrls: ['./germplasm-pedigree-graph-modal.component.css']
})
export class GermplasmPedigreeGraphModalComponent implements OnInit {

  sourceGermplasm: Germplasm = {};
  numberOfGenerations = 1;
  showSourcePedigreeTree = false;
  showDestinationPreviewTree = false;
  isAttemptToConnectTargetAncestors = false;

  germplasmInDestinationByPUIs: { [p: string]: Germplasm } = {};
  germplasmInDestinationByReferenceIds: { [p: string]: Germplasm } = {};
  germplasmWithAncestors: Germplasm[] = [];
  pedigreeMapSource: Map<string, PedigreeNode> = new Map<string, PedigreeNode>();
  pedigreeMapDestination: Map<string, PedigreeNode> = new Map<string, PedigreeNode>();
  breedingMethodsDestinationById: { [p: string]: BreedingMethod } = {};

  constructor(private activeModal: NgbActiveModal,
              private context: ContextService,
              private pedigreeService: PedigreeService,
              private pedigreeUtilService: PedigreeUtilService,
              private germplasmService: GermplasmService) {
  }

  clear(): void {
    this.activeModal.dismiss();
  }

  ngOnInit(): void {
  }

  async getGermplasmTreeNode(isPreviewTarget: boolean): Promise<GraphNode | undefined> {

    // Get the existing germplasm from the target server
    const existingGermplasmFromDestination: Germplasm[] = [];
    this.germplasmWithAncestors.forEach(o => {
      const existingGermplasm = this.pedigreeUtilService.getMatchingGermplasmInDestination(o,
        this.germplasmInDestinationByPUIs, this.germplasmInDestinationByReferenceIds);
      if (existingGermplasm) {
        existingGermplasmFromDestination.push(existingGermplasm);
      }
    });

    if (this.sourceGermplasm?.germplasmDbId) {
      if (isPreviewTarget) {
        return this.pedigreeUtilService.generateGermplasmTreeGraphNode(this.sourceGermplasm?.germplasmDbId, this.numberOfGenerations,
          this.isAttemptToConnectTargetAncestors, this.pedigreeMapSource, this.pedigreeMapDestination, this.germplasmInDestinationByPUIs,
          this.germplasmInDestinationByReferenceIds, this.breedingMethodsDestinationById);
      } else {
        return this.pedigreeUtilService.generateGermplasmTreeGraphNode(this.sourceGermplasm?.germplasmDbId, this.numberOfGenerations,
          this.isAttemptToConnectTargetAncestors, this.pedigreeMapSource);
      }
    }
    return;
  }

}
