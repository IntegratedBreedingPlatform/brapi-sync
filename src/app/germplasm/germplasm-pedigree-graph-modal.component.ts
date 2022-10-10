import { Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { PedigreeNode } from '../shared/brapi/2.1/model/pedigree-node';
import { PedigreeSearchRequest } from '../shared/brapi/2.1/model/pedigree-search-request';
import { PedigreeService } from '../shared/brapi/2.1/api/pedigree.service';
import { ContextService } from '../context.service';
import { Germplasm } from '../shared/brapi/2.0/model/germplasm';
import { PedigreeUtilService } from '../shared/pedigree/pedigree-util.service';
import { GermplasmTreeNode } from '../shared/pedigree-graph/germplasm-tree-node';

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

  async getGermplasmTreeNode(): Promise<GermplasmTreeNode | undefined> {
    // Retrieve the pedigree of the germplasm
    // This will return the pedigree nodes of the germplasm including all their ancestors
    const pedigreeMapSource = await this.getPedigreeMap(this.context.source, this.sourceGermplasm.germplasmDbId,
      this.numberOfGenerations);

    // Find germplasm in destination by Permanent Unique Identifier (germplasmPUI)
    const germplasmInDestinationByPUIs = await this.pedigreeUtilService.searchInTargetByPUIs([{
      germplasmPUI: this.sourceGermplasm.germplasmPUI
    }]);
    // Find germplasm in destination by reference Id (germplasmDbId)
    const germplasmInDestinationByReferenceIds = await this.pedigreeUtilService.searchInTargetByReferenceIds([{
      germplasmDbId: this.sourceGermplasm.germplasmDbId
    }]);

    // Get the existing germplasm from the target server
    const existingGermplasm = this.pedigreeUtilService.getMatchingGermplasmInDestination(this.sourceGermplasm,
      germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);

    let pedigreeMapDestination: Map<string, PedigreeNode> = new Map<string, PedigreeNode>();
    if (existingGermplasm) {
      // Get the pedigree information of the existing germplasm from the target server, we will use
      // this to compare the pedigree of the source to the pedigree of the target.
      pedigreeMapDestination = await this.getPedigreeMap(this.context.destination, existingGermplasm.germplasmDbId,
        this.numberOfGenerations);
    }

    if (this.sourceGermplasm?.germplasmDbId) {
      return this.pedigreeUtilService.createGermplasmTreeNode(this.sourceGermplasm?.germplasmDbId, this.numberOfGenerations,
        pedigreeMapSource, pedigreeMapDestination);
    }
    return;
  }

  async getPedigreeMap(basePath: string, germplasmDbId: string | undefined, pedigreeDepth: number): Promise<Map<string, PedigreeNode>> {

    if (!germplasmDbId) {
      return new Map<string, PedigreeNode>();
    }

    const pedigreeSearchRequest: PedigreeSearchRequest = {
      germplasmDbIds: [germplasmDbId],
      includeFullTree: true,
      pedigreeDepth,
      includeParents: true
    };
    // This will return the germplasm as well as their pedigree (ancestors) within the specified level
    return await this.searchPedigree(basePath, pedigreeSearchRequest);
  }

  async searchPedigree(basePath: string, request: PedigreeSearchRequest): Promise<Map<string, PedigreeNode>> {
    // Search pedigree nodes
    const searchPedigreePost = await this.pedigreeService.searchPedigreePost(basePath, request).toPromise();
    if (searchPedigreePost.body && searchPedigreePost.body.result) {
      // Get the actual search results based ob the searchResultsDbId
      const searchPedigreeGetResult = await this.pedigreeService.searchPedigreeSearchResultsDbIdGet(basePath,
        searchPedigreePost.body.result.searchResultsDbId).toPromise();
      // Convert the array of PedigreeNodes to Map
      const map = new Map<string, PedigreeNode>();
      if (searchPedigreeGetResult.body && searchPedigreeGetResult.body.result) {
        searchPedigreeGetResult.body.result.data.forEach(value => {
          if (value.germplasmDbId) {
            map.set(value.germplasmDbId, value);
          }
        });
      }
      return map;
    }
    return new Map<string, PedigreeNode>();
  }

}
