import { Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { PedigreeNode } from '../shared/brapi/2.1/model/pedigree-node';
import { PedigreeService } from '../shared/brapi/2.1/api/pedigree.service';
import { ContextService } from '../context.service';
import { Germplasm } from '../shared/brapi/2.0/model/germplasm';
import { PedigreeUtilService } from '../shared/pedigree/pedigree-util.service';
import { GraphNode } from '../shared/pedigree-graph/graph-node';

@Component({
  selector: 'app-germplasm-pedigree-graph',
  templateUrl: './germplasm-pedigree-graph-modal.component.html',
  styleUrls: ['./germplasm-pedigree-graph-modal.component.css']
})
export class GermplasmPedigreeGraphModalComponent implements OnInit {

  sourceGermplasm: Germplasm = {};
  numberOfGenerations = 1;

  constructor(private activeModal: NgbActiveModal,
              private context: ContextService,
              private pedigreeService: PedigreeService,
              private pedigreeUtilService: PedigreeUtilService) {
  }

  clear(): void {
    this.activeModal.dismiss();
  }

  ngOnInit(): void {
  }

  async getGermplasmTreeNode(): Promise<GraphNode | undefined> {
    // Retrieve the pedigree of the germplasm
    // This will return the pedigree nodes of the germplasm including all their ancestors
    const pedigreeMapSource = await this.pedigreeUtilService.getPedigreeMap(this.context.source,
      [{ germplasmDbId: this.sourceGermplasm.germplasmDbId }],
      this.numberOfGenerations);

    // Retrieve the details of the germplasm and of their pedigree (ancestors)
    const germplasmWithAncestors = await this.pedigreeUtilService.searchGermplasm(this.context.source,
      { germplasmDbIds: Array.from(pedigreeMapSource.keys()) });

    // Find germplasm in destination by Permanent Unique Identifier (germplasmPUI)
    const germplasmInDestinationByPUIs = await this.pedigreeUtilService.searchInTargetByPUIs(germplasmWithAncestors);
    // Find germplasm in destination by reference Id (germplasmDbId)
    const germplasmInDestinationByReferenceIds = await this.pedigreeUtilService.searchInTargetByReferenceIds(germplasmWithAncestors);

    // Get the existing germplasm from the target server
    const existingGermplasmFromDestination: Germplasm[] = [];
    germplasmWithAncestors.forEach(o => {
      const existingGermplasm = this.pedigreeUtilService.getMatchingGermplasmInDestination(o,
        germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
      if (existingGermplasm) {
        existingGermplasmFromDestination.push(existingGermplasm);
      }
    });

    let pedigreeMapDestination: Map<string, PedigreeNode> = new Map<string, PedigreeNode>();
    if (existingGermplasmFromDestination) {
      // Get the pedigree information of the existing germplasm from the target server, we will use
      // this to compare the pedigree of the source to the pedigree of the target.
      pedigreeMapDestination = await this.pedigreeUtilService.getPedigreeMap(this.context.destination, existingGermplasmFromDestination,
        this.numberOfGenerations);
    }

    if (this.sourceGermplasm?.germplasmDbId) {
      return this.pedigreeUtilService.generateGermplasmTreeGraphNode(this.sourceGermplasm?.germplasmDbId, this.numberOfGenerations,
        pedigreeMapSource, pedigreeMapDestination, germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
    }
    return;
  }

}
