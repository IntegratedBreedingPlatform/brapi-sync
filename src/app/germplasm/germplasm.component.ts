import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContextService } from '../context.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { brapiAll } from '../util/brapi-all';
import { EXTERNAL_REFERENCE_SOURCE } from '../app.constants';
import { EntityEnum, ExternalReferenceService } from '../shared/external-reference/external-reference.service';
import { AlertService } from '../shared/alert/alert.service';
import { BlockUIService } from 'ng-block-ui';
import { PedigreeService } from '../shared/brapi/2.1/api/pedigree.service';
import { PedigreeSearchRequest } from '../shared/brapi/2.1/model/pedigree-search-request';
import { PedigreeNode } from '../shared/brapi/2.1/model/pedigree-node';
import { Germplasm } from '../shared/brapi/2.0/model/germplasm';
import { GermplasmService } from '../shared/brapi/2.0/api/germplasm.service';
import { GermplasmSearchRequest } from '../shared/brapi/2.0/model/germplasm-search-request';
import { PedigreeNodeParents } from '../shared/brapi/2.1/model/pedigree-node-parents';
import { BreedingMethod } from '../shared/brapi/2.0/model/breeding-method';
import { ParentType } from '../shared/brapi/2.1/model/parent-type';

declare const BrAPI: any;

@Component({
  selector: 'app-germplasm',
  templateUrl: './germplasm.component.html',
  styleUrls: ['./germplasm.component.css']
})
export class GermplasmComponent implements OnInit {

  brapiDestination: any;
  brapiSource: any;

  isSaving = false;
  isLoading = false;
  germplasm: any = [];
  page = 1;

  pageSize = 20;
  totalCount = 0;

  selectedItems: { [key: string]: any } = {};
  isSelectAllPages = false;

  errors: any = [];
  info: any = [];

  breedingMethodsDestByName: { [p: string]: BreedingMethod } = {};
  breedingMethodsDestById: { [p: string]: BreedingMethod } = {};
  breedingMethodsSourceByName: { [p: string]: BreedingMethod } = {};
  breedingMethodsSourceById: { [p: string]: BreedingMethod } = {};
  germplasmInDestinationByPUIs: { [p: string]: Germplasm } = {};
  germplasmInDestinationByRefIds: { [p: string]: Germplasm } = {};
  invalidPedigreeNodes: Map<string, Array<PedigreeNode>> = new Map<string, Array<PedigreeNode>>();

  // Import Ancestor Options
  numberOfGenerations = 1;
  isImportAncestors = false;
  isGenerativeStepsOnly = false;
  isAttemptToConnectTargetAncestors = false;

  // Pedigree Map of Source
  pedigreeMapSource: Map<string, PedigreeNode> | undefined;
  // Pedigree Map of Destination
  pedigreeMapDestination: Map<string, PedigreeNode> | undefined;

  constructor(
    private router: Router,
    public context: ContextService,
    private modalService: NgbModal,
    private http: HttpClient,
    private externalReferenceService: ExternalReferenceService,
    private alertService: AlertService,
    private blockUIService: BlockUIService,
    private germplasmService: GermplasmService,
    private pedigreeService: PedigreeService
  ) {
    // TODO / testing / remove
    // this.load();
    this.brapiDestination = BrAPI(this.context.destination, '2.0', this.context.destinationToken);
    this.brapiSource = BrAPI(this.context.source, '2.0', this.context.source);
  }

  ngOnInit(): void {
    this.alertService.removeAll();
  }

  back(): void {
    this.router.navigate(['entity-selector']);
  }

  async importSelectedGermplasm(): Promise<void> {
    this.blockUIService.start('main');
    let selectedGermplasm: Germplasm[] = [];
    if (this.isSelectAllPages) {
      this.isSaving = true;
      // If select all is checked, we should retrieve all germplasm records of the selected study from source server.
      const res: any = await this.http.get(this.context.source + '/germplasm', {
        params: {
          studyDbId: this.context.sourceStudy.studyDbId,
          page: '0',
          pageSize: this.totalCount.toString(),
        }
      }).toPromise();
      selectedGermplasm = res.result.data as Germplasm[];
      this.totalCount = res.metadata.pagination.totalCount;
    } else {
      // Process only selected germplasm.
      selectedGermplasm = Object.values(this.selectedItems) as Germplasm[];
    }

    if (this.isImportAncestors) {

      const validSelectedGermplasmForImport = await this.filterValidGermplasm(selectedGermplasm);

      // Retrieve the pedigree of the selected germplasm
      // This will return the pedigree nodes of the germplasm including all their ancestors
      const pedigreeMapSource: Map<string, PedigreeNode> = await this.getPedigreeMap(this.context.source, validSelectedGermplasmForImport,
        this.numberOfGenerations);

      // Retrieve the details of the germplasm and of their pedigree (ancestors)
      const germplasmWithAncestors = await this.searchGermplasm(this.context.source,
        { germplasmDbIds: Array.from(pedigreeMapSource.keys()) });

      await this.searchInTarget(germplasmWithAncestors);
      this.post(germplasmWithAncestors, pedigreeMapSource);

    } else {

      await this.searchInTarget(selectedGermplasm);
      this.post(selectedGermplasm);
    }

  }

  async filterValidGermplasm(selectedGermplasm: Germplasm[]): Promise<Germplasm[]> {
    // Compare the pedigree tree of source and destination germplasm, and only return the selected germplasm with matched tree (ancestors).
    const invalidPedigreeNodes = await this.comparePedigreeTree(this.numberOfGenerations - 1, selectedGermplasm);
    return selectedGermplasm.filter((g) => g.germplasmDbId && !invalidPedigreeNodes.has(g.germplasmDbId));
  }

  private async post(germplasm: Germplasm[], pedigreeMap?: Map<string, PedigreeNode>): Promise<void> {
    try {
      this.isSaving = true;

      // Get the germplasm that do not exist yet in the destination server
      const filteredGermplasm = germplasm.filter((g) => !this.isGermplasmExistsInDestination(g));

      // If all germplasm already exists in the server, show an error message
      if (!filteredGermplasm.length) {
        this.alertService.showDanger('No new germplasm can be imported.');
        this.isSaving = false;
        this.blockUIService.stop('main');
        return;
      }

      // Import the germplasm into the destination server
      const createNewGermplasmRequest = filteredGermplasm.map((g) => this.transformForSave(g));
      const res = await this.http.post(this.context.destination + '/germplasm', createNewGermplasmRequest).toPromise();

      // Update the pedigree of newly created germplasm
      await this.updatePedigreeTree(germplasm, pedigreeMap);

      this.onSuccess(res);

    } catch (error) {
      this.onError(error);
    }
    this.isSaving = false;
    this.blockUIService.stop('main');
  }

  async updatePedigreeTree(germplasm: Germplasm[], pedigreeMap?: Map<string, PedigreeNode>): Promise<void> {
    if (pedigreeMap) {
      await this.searchInTarget(germplasm);
      const pedigreeNodeUpdateRequest: { [key: string]: PedigreeNode; } = {};
      pedigreeMap.forEach((pedigreeNode, germplasmDbId, map) => {
        const germplasmInDestination = this.getMatchingGermplasmInDestination({ germplasmDbId, germplasmPUI: '' });
        if (germplasmInDestination) {
          const pedigreeNodeForUpdate: PedigreeNode = {
            germplasmDbId: germplasmInDestination.germplasmDbId,
            breedingMethodDbId: germplasmInDestination.breedingMethodDbId
          };
          if (pedigreeNode.parents) {
            const pedigreeNodesForUpdateParents: PedigreeNodeParents[] = [];
            pedigreeNode.parents.forEach((pedigreeNodeParent: PedigreeNodeParents) => {
              const parent = this.getMatchingGermplasmInDestination({
                germplasmDbId: pedigreeNodeParent.germplasmDbId || ''
              });
              pedigreeNodesForUpdateParents.push({
                parentType: pedigreeNodeParent.parentType,
                germplasmDbId: parent?.germplasmDbId
              });
            });
            pedigreeNodeForUpdate.parents = pedigreeNodesForUpdateParents;
          }
          if (germplasmInDestination.germplasmDbId) {
            // Add the pedigree node for update at the beginning of the list
            pedigreeNodeUpdateRequest[germplasmInDestination.germplasmDbId] = pedigreeNodeForUpdate;
          }
        }
      });
      await this.pedigreeService.pedigreePut(this.context.destination, pedigreeNodeUpdateRequest).toPromise();
    }

  }

  transformForSave(germplasm: any): any {
    const copy = Object.assign({}, germplasm);

    delete copy.germplasmDbId;
    // TODO: check why the code is adding __response automatic to the object.
    delete copy.__response;

    if (!(copy.externalReferences && copy.externalReferences.length)) {
      copy.externalReferences = [];
    }
    copy.externalReferences.push({
      referenceID: this.externalReferenceService.getReferenceId(EntityEnum.GERMPLASM, germplasm.germplasmDbId),
      referenceSource: EXTERNAL_REFERENCE_SOURCE
    });

    copy.breedingMethodDbId = this.getBreedingMethodIdInDestination(copy);

    // FIXME! bms should handle defaults
    if (!copy.acquisitionDate) {
      copy.acquisitionDate = new Date().toISOString().slice(0, 10);
    }
    if (!copy.countryOfOriginCode) {
      copy.countryOfOriginCode = 'USA';
    }

    if (!copy.additionalInfo) {
      copy.additionalInfo = {};
    }

    return copy;
  }

  onError(res: HttpErrorResponse): void {
    // TODO ng-toast?
    // alert('error');
    console.error(res);
  }

  onSuccess(res: any): void {
    this.errors = res.metadata.status.filter((s: any) => s.messageType === 'ERROR');
    this.info = res.metadata.status.filter((s: any) => s.messageType === 'INFO');
    if (this.errors.length) {
      this.alertService.showWarning(this.info);
      this.alertService.showDanger(this.errors);
    } else if (this.info.length) {
      this.alertService.showSuccess(this.info);
    }
    this.load();
  }

  onStudySelect(): void {
    if (this.context.sourceStudy && this.context.sourceStudy.studyDbId) {
      this.load();
    }
  }

  async load(): Promise<void> {
    this.reset();
    this.isLoading = true;
    try {
      // TODO: Move this to germplasmService
      const res: any = await this.http.get(this.context.source + '/germplasm', {
        params: {
          studyDbId: this.context.sourceStudy.studyDbId,
          page: (this.page - 1).toString(),
          pageSize: this.pageSize.toString(),
        }
      }).toPromise();
      this.germplasm = res.result.data;
      this.totalCount = res.metadata.pagination.totalCount;

      await this.searchInTarget(this.germplasm);

      // Retrieve the breeding methods from source server
      const breedingMethodsFromSource = await this.germplasmService.breedingmethodsGet(this.context.source).toPromise();
      if (breedingMethodsFromSource.body && breedingMethodsFromSource.body.result.data) {
        breedingMethodsFromSource.body.result.data.forEach((breedingMethod) => {
          this.breedingMethodsSourceByName[breedingMethod.breedingMethodName] = breedingMethod;
          this.breedingMethodsSourceById[breedingMethod.breedingMethodDbId] = breedingMethod;
        });
      }
      // Retrive the breeding methods from destination server
      const breedingMethodsFromDestination = await this.germplasmService.breedingmethodsGet(this.context.destination).toPromise();
      if (breedingMethodsFromDestination.body && breedingMethodsFromDestination.body.result.data) {
        breedingMethodsFromDestination.body.result.data.forEach((breedingMethod) => {
          this.breedingMethodsDestByName[breedingMethod.breedingMethodName] = breedingMethod;
          this.breedingMethodsDestById[breedingMethod.breedingMethodDbId] = breedingMethod;
        });
      }

      this.applyImportAncestorsSettings(this.germplasm);

    } catch (error) {
      this.onError(error);
    }
    this.isLoading = false;
  }

  reset(): void {
    this.selectedItems = {};
    this.isSelectAllPages = false;
    this.breedingMethodsDestByName = {};
    this.breedingMethodsDestById = {};
    this.breedingMethodsSourceByName = {};
    this.breedingMethodsSourceById = {};
    this.germplasmInDestinationByPUIs = {};
    this.germplasmInDestinationByRefIds = {};
  }

  async searchInTarget(germplasm: any[]): Promise<void> {
    // Find germplasm in destination by Permanent Unique Identifier (germplasmPUI)
    const germplasmPUIs = germplasm.filter(g => g.germplasmPUI !== null && g.germplasmPUI !== undefined).map(g => g.germplasmPUI);
    let currentPage = 0;
    let totalPages = 1;
    // FIXME: This is a workaround to get all the items in all pages.
    // Brapi-Js doesn't have a way to specify the page size, so a brapi call will always only return
    // 1000 records from the first page.

    if (germplasmPUIs.length) {
      while (currentPage <= totalPages) {
        const germplasmByPUIsResult = await brapiAll(this.brapiDestination.search_germplasm({
          germplasmPUIs,
          pageRange: [currentPage, 1]
        }));
        if (germplasmByPUIsResult && germplasmByPUIsResult.length) {
          const tempCurrentPage = germplasmByPUIsResult[0].__response.metadata.pagination.currentPage;
          currentPage = tempCurrentPage ? (tempCurrentPage + 1) : 1;
          totalPages = germplasmByPUIsResult[0].__response.metadata.pagination.totalPages - 1;
          if (germplasmByPUIsResult[0].data.length) {
            germplasmByPUIsResult[0].data.forEach((g: any) => {
              this.germplasmInDestinationByPUIs[g.germplasmPUI] = g;
            });
          }
        }
      }
    }

    // Find germplasm in destination by external reference ID
    const germplasmRefIds = germplasm.map(g => this.externalReferenceService.getReferenceId(EntityEnum.GERMPLASM, g.germplasmDbId));
    currentPage = 0;
    totalPages = 1;
    // FIXME: This is a workaround to get all the items in all pages.
    // Brapi-Js doesn't have a way to specify the page size, so a brapi call will always only return
    // 1000 records from the first page.
    if (germplasmRefIds.length) {
      while (currentPage <= totalPages) {
        const germplasmByRefIdsResult = await brapiAll(this.brapiDestination.search_germplasm({
          externalReferenceIDs: germplasmRefIds,
          pageRange: [currentPage, 1]
        }));
        if (germplasmByRefIdsResult && germplasmByRefIdsResult.length) {
          const tempCurrentPage = germplasmByRefIdsResult[0].__response.metadata.pagination.currentPage;
          currentPage = tempCurrentPage ? (tempCurrentPage + 1) : 1;
          totalPages = germplasmByRefIdsResult[0].__response.metadata.pagination.totalPages - 1;
          if (germplasmByRefIdsResult[0].data.length) {
            germplasmByRefIdsResult[0].data.forEach((g: any) => {
              if (g.externalReferences && g.externalReferences.length) {
                g.externalReferences.forEach((ref: any) => {
                  this.germplasmInDestinationByRefIds[ref.referenceID] = g;
                });
              }
            });
          }
        }
      }
    }

  }

  isGermplasmExistsInDestination(germplasm: any): boolean {
    // Check first if the germplasm has a match by PUI
    return this.getMatchingGermplasmInDestination(germplasm) ? true : false;
  }

  getMatchingGermplasmInDestination(germplasm: Germplasm | undefined): Germplasm | undefined {
    if (germplasm?.germplasmPUI && this.germplasmInDestinationByPUIs[germplasm?.germplasmPUI]) {
      return this.germplasmInDestinationByPUIs[germplasm.germplasmPUI];
    } else if (this.germplasmInDestinationByRefIds[this.externalReferenceService.getReferenceId(EntityEnum.GERMPLASM,
      germplasm?.germplasmDbId)]) {
      return this.germplasmInDestinationByRefIds[this.externalReferenceService.getReferenceId(EntityEnum.GERMPLASM,
        germplasm?.germplasmDbId)];
    }
    return undefined;
  }

  isSelected(row: any): boolean {
    return this.selectedItems[row.germplasmDbId];
  }

  toggleSelect(row: any): void {
    if (this.selectedItems[row.germplasmDbId]) {
      delete this.selectedItems[row.germplasmDbId];
    } else {
      this.selectedItems[row.germplasmDbId] = row;
    }
  }

  isPageSelected(): boolean {
    const pageItems = this.getPageItems();
    return Boolean(this.size(this.selectedItems)) && pageItems.every((item) => this.selectedItems[item.germplasmDbId]);
  }

  onSelectPage(): void {
    const pageItems = this.getPageItems();
    if (this.isPageSelected()) {
      // remove all items
      pageItems.forEach((item) => delete this.selectedItems[item.germplasmDbId]);
    } else {
      // check remaining items
      pageItems.forEach((item) => this.selectedItems[item.germplasmDbId] = item);
    }
  }

  onSelectAllPages(): void {
    this.isSelectAllPages = !this.isSelectAllPages;
    this.selectedItems = {};
  }

  getPageItems(): any[] {
    if (!(this.germplasm && this.germplasm.length)) {
      return [];
    }
    return this.germplasm;
  }

  size(obj: any): number {
    return Object.keys(obj).length;
  }

  getSynonyms(synonyms: any[]): string {
    if (!(synonyms && synonyms.length)) {
      return '';
    }
    return synonyms.map((s) => s.synonym).join(', ');
  }


  async applyImportAncestorsSettings(germplasm: Germplasm[]): Promise<void> {

    if (!this.isImportAncestors) {
      return;
    }

    this.invalidPedigreeNodes = await this.comparePedigreeTree(this.numberOfGenerations - 1, this.germplasm);

  }

  async comparePedigreeTree(maximumLevelOfRecursion: number, germplasm: Germplasm[]): Promise<Map<string, Array<PedigreeNode>>> {

    // Create a map that contains a list of mismatched pedigree nodes per germplasm if there's any.
    const invalidPedigreeNodes: Map<string, Array<PedigreeNode>> = new Map<string, Array<PedigreeNode>>();

    // Retrieve the pedigree of the selected germplasm
    // This will return the pedigree nodes of the germplasm including all their ancestors
    const pedigreeMapSource: Map<string, PedigreeNode> = await this.getPedigreeMap(this.context.source, germplasm,
      this.numberOfGenerations);

    // Retrieve the details of the germplasm and of their pedigree (ancestors)
    const germplasmWithAncestors = await this.searchGermplasm(this.context.source,
      { germplasmDbIds: Array.from(pedigreeMapSource.keys()) });

    // Retrieve the germplasm from target server to see if they exist. This will build the germplasmInDestinationByPUIs
    // and germplasmInDestinationByRefIfs maps.
    await this.searchInTarget(germplasmWithAncestors);

    // Get the existing germplasm from the target server
    const existingGermplasmFromDestination: Germplasm[] = [];
    germplasmWithAncestors.forEach(o => {
      const existingGermplasm = this.getMatchingGermplasmInDestination(o);
      if (existingGermplasm) {
        existingGermplasmFromDestination.push(existingGermplasm);
      }
    });

    let pedigreeMapDestination: Map<string, PedigreeNode> = new Map<string, PedigreeNode>();
    if (existingGermplasmFromDestination) {
      // Get the pedigree information of the existing germplasm from the target server, we will use
      // this to compare the pedigree of the source to the pedigree of the target.
      pedigreeMapDestination = await this.getPedigreeMap(this.context.destination, existingGermplasmFromDestination,
        this.numberOfGenerations);
    }

    // Compare pedigree tree of the source and destination
    germplasm.forEach((g: Germplasm) => {
      if (g.germplasmDbId) {
        const pedigreeNode = pedigreeMapSource?.get(g.germplasmDbId);
        if (pedigreeNode && pedigreeNode.germplasmDbId) {
          const level = 1;
          this.validatePedigreeNode(level, maximumLevelOfRecursion, pedigreeNode?.germplasmDbId, invalidPedigreeNodes, pedigreeNode,
            pedigreeMapSource,
            pedigreeMapDestination);
        }
      }
    });
    return invalidPedigreeNodes;
  }

  // Recursive function to compare the pedigree tree of source germplasm to the target germplasm.
  // Mismatched pedigree node will be added to the invalidPedigreeNodes map.
  validatePedigreeNode(level: number, maximumLevelOfRecursion: number, rootGermplasmDbId: string,
                       invalidPedigreeNodes: Map<string, Array<PedigreeNode>>,
                       sourcePedigreeNode?: PedigreeNode,
                       pedigreeMapSource?: Map<string, PedigreeNode>,
                       pedigreeMapDestination?: Map<string, PedigreeNode>): void {

    // Extract the parents of the source germplasm
    const sourcePedigreeNodeParent1 = this.getParent1(sourcePedigreeNode);
    const sourcePedigreeNodeParent2 = this.getParent2(sourcePedigreeNode);
    const sourcePedigreeOtherMaleParents = this.getOtherMaleParents(sourcePedigreeNode);

    // Check if source germplasm (pedigree node) already exists in the destination server
    const existingGermplasmInDestination = this.getMatchingGermplasmInDestination({ germplasmDbId: sourcePedigreeNode?.germplasmDbId });
    if (sourcePedigreeNode?.germplasmDbId && existingGermplasmInDestination) {
      // Get the existing germplasm of the source germplasm's parents
      const existingSourceGermplasmParent1 =
        this.getMatchingGermplasmInDestination({ germplasmDbId: sourcePedigreeNodeParent1?.germplasmDbId });
      const existingSourceGermplasmParent2 =
        this.getMatchingGermplasmInDestination({ germplasmDbId: sourcePedigreeNodeParent2?.germplasmDbId });
      const existingSourceGermplasmOtherParents: Map<string, Germplasm> = new Map<string, Germplasm>();
      sourcePedigreeOtherMaleParents?.forEach(p => {
        const existingSourceGermplasmOtherParent = this.getMatchingGermplasmInDestination({ germplasmDbId: p?.germplasmDbId });
        if (existingSourceGermplasmOtherParent && existingSourceGermplasmOtherParent.germplasmDbId) {
          existingSourceGermplasmOtherParents.set(existingSourceGermplasmOtherParent.germplasmDbId, existingSourceGermplasmOtherParent);
        }
      });

      if (!existingSourceGermplasmParent1 && !existingSourceGermplasmParent2 && existingSourceGermplasmOtherParents.size === 0) {
        return;
      }

      // Extract the parents of the existing germplasm from the target
      const destinationPedigreeNode = pedigreeMapDestination?.get(existingGermplasmInDestination?.germplasmDbId ?
        existingGermplasmInDestination.germplasmDbId : '');
      const destinationPedigreeNodeParent1 = this.getParent1(destinationPedigreeNode);
      const destinationPedigreeNodeParent2 = this.getParent2(destinationPedigreeNode);
      const destinationPedigreeNodeOtherParents = this.getOtherMaleParents(destinationPedigreeNode);

      /*** Check if the parents of the source germplasm and parents of target germplasm are equal ***/

      // Check if source germplasm's parent 1 doesn't match the target germplasm's parent 1
      if (existingSourceGermplasmParent1?.germplasmDbId && destinationPedigreeNodeParent1?.germplasmDbId
        && existingSourceGermplasmParent1?.germplasmDbId !== destinationPedigreeNodeParent1?.germplasmDbId) {
        this.addToInvalidPedigreeNodes(invalidPedigreeNodes, rootGermplasmDbId, destinationPedigreeNodeParent1);
      }
      // Check if source germplasm's parent 1 does not exist and the target germplasm's parent 1 is already assigned
      if (!existingSourceGermplasmParent1?.germplasmDbId && destinationPedigreeNodeParent1?.germplasmDbId) {
        this.addToInvalidPedigreeNodes(invalidPedigreeNodes, rootGermplasmDbId, destinationPedigreeNodeParent1);
      }
      // Check if source germlasm's parent 2 doesn't match the target germplasm's parent 2
      if (existingSourceGermplasmParent2?.germplasmDbId && destinationPedigreeNodeParent2?.germplasmDbId
        && existingSourceGermplasmParent2?.germplasmDbId !== destinationPedigreeNodeParent2?.germplasmDbId) {
        this.addToInvalidPedigreeNodes(invalidPedigreeNodes, rootGermplasmDbId, destinationPedigreeNodeParent2);
      }
      // Check if source germplasm's parent 2 does not exist and the target germplasm's parent 2 is already assigned
      if (!existingSourceGermplasmParent2?.germplasmDbId && destinationPedigreeNodeParent2?.germplasmDbId) {
        this.addToInvalidPedigreeNodes(invalidPedigreeNodes, rootGermplasmDbId, destinationPedigreeNodeParent2);
      }
      // Check if source germplasm's other male parents match the target germplasm's other male parents
      destinationPedigreeNodeOtherParents?.forEach(destinationOtherMaleParent => {
        if (destinationOtherMaleParent.germplasmDbId &&
          !existingSourceGermplasmOtherParents.has(destinationOtherMaleParent.germplasmDbId)) {
          this.addToInvalidPedigreeNodes(invalidPedigreeNodes, rootGermplasmDbId, destinationOtherMaleParent);
        }
      });
    }

    // Immediately terminate the function once max level is reached.
    if (level === maximumLevelOfRecursion) {
      return;
    }

    if (sourcePedigreeNodeParent1?.germplasmDbId) {
      this.validatePedigreeNode(level++, maximumLevelOfRecursion, rootGermplasmDbId, invalidPedigreeNodes,
        pedigreeMapSource?.get(sourcePedigreeNodeParent1?.germplasmDbId),
        pedigreeMapSource, pedigreeMapDestination);
    }
    if (sourcePedigreeNodeParent2?.germplasmDbId) {
      this.validatePedigreeNode(level++, maximumLevelOfRecursion, rootGermplasmDbId, invalidPedigreeNodes,
        pedigreeMapSource?.get(sourcePedigreeNodeParent2?.germplasmDbId),
        pedigreeMapSource, pedigreeMapDestination);
    }
    sourcePedigreeOtherMaleParents?.forEach(sourcePedigreeOtherParent => {
      if (sourcePedigreeOtherParent?.germplasmDbId) {
        this.validatePedigreeNode(level++, maximumLevelOfRecursion, rootGermplasmDbId, invalidPedigreeNodes,
          pedigreeMapSource?.get(sourcePedigreeOtherParent?.germplasmDbId),
          pedigreeMapSource, pedigreeMapDestination);
      }
    });

  }

  hasMismatchPedigreeNodes(germplasmDbId: string, invalidPedigreeNodes: Map<string, Array<PedigreeNode>>): boolean {
    if (!germplasmDbId) {
      return false;
    }
    return this.isImportAncestors && invalidPedigreeNodes?.has(germplasmDbId);
  }

  addToInvalidPedigreeNodes(invalidPedigreeNodes: Map<string, Array<PedigreeNode>>, sourceGermplasmDbId: string,
                            pedigreeNode: PedigreeNode): void {
    // Initialize array if still undefined
    if (!invalidPedigreeNodes.has(sourceGermplasmDbId)) {
      invalidPedigreeNodes.set(sourceGermplasmDbId, new Array<PedigreeNode>());
    }
    invalidPedigreeNodes.get(sourceGermplasmDbId)?.push(pedigreeNode);
  }

  async getPedigreeMap(basePath: string, germplasm: Germplasm[], pedigreeDepth: number): Promise<Map<string, PedigreeNode>> {

    if (!germplasm) {
      return new Map<string, PedigreeNode>();
    }

    // Search the pedigree (ancestors) of the germplasm.
    const germplasmDbIds: string[] = [];
    germplasm.forEach(g => {
      if (g.germplasmDbId) {
        germplasmDbIds.push(g.germplasmDbId);
      }
    });
    const pedigreeSearchRequest: PedigreeSearchRequest = {
      germplasmDbIds,
      includeFullTree: true,
      pedigreeDepth,
      includeParents: true
    };
    // This will return the germplasm as well as their pedigree (ancestors) within the specified level
    // TODO: Find a way to filter Generative lines
    return await this.searchPedigree(basePath, pedigreeSearchRequest);
  }

  getParent1(pedigreeNode: PedigreeNode | undefined): PedigreeNodeParents | undefined {
    // Return FEMALE parent in case germplasm is generative
    // Return POPULATION parent in case germplasm is derivation/maintenance
    const femaleParent = pedigreeNode?.parents?.find(o => o.parentType === ParentType.FEMALE);
    const groupSource = pedigreeNode?.parents?.find(o => o.parentType === ParentType.POPULATION);
    return femaleParent ? femaleParent : groupSource;
  }

  getParent2(pedigreeNode: PedigreeNode | undefined): PedigreeNodeParents | undefined {
    // Return MALE parent in case germplasm is generative
    // Return SELF parent in case germplasm is is derivation/maintenance
    // The first MALE parent is the gpid2
    const maleParent = pedigreeNode?.parents?.find(o => o.parentType === ParentType.MALE);
    const immediateSource = pedigreeNode?.parents?.find(o => o.parentType === ParentType.SELF);
    return maleParent ? maleParent : immediateSource;
  }

  getOtherMaleParents(pedigreeNode: PedigreeNode | undefined): PedigreeNodeParents[] | undefined {
    const maleParents = pedigreeNode?.parents?.filter(o => o.parentType === ParentType.MALE);
    // Remove the first male, return only the remaining parents
    return maleParents?.slice(1);
  }

  async searchGermplasm(basePath: string, request: GermplasmSearchRequest): Promise<Germplasm[]> {
    // Search germplasm
    const searchGermplasmPost = await this.germplasmService.searchGermplasmPost(basePath, request).toPromise();
    if (searchGermplasmPost.body && searchGermplasmPost.body.result) {
      // Get the actual search results based ob the searchResultsDbId
      const searchSearchGetResult = await this.germplasmService.searchGermplasmSearchResultsDbIdGet(basePath,
        searchGermplasmPost.body.result.searchResultsDbId).toPromise();
      if (searchSearchGetResult.body && searchSearchGetResult.body.result) {
        return searchSearchGetResult.body.result.data;
      }
    }
    return [];
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

  private addRootGermplasmDbIdToMap(map: Map<string, Set<string>>, rootGermplasmDbId?: string, pedigreeNode?: PedigreeNode,
                                    pedigreeMap?: Map<string, PedigreeNode>): void {
    if (rootGermplasmDbId) {
      pedigreeNode?.parents?.forEach(parent => {
        if (parent.germplasmDbId) {
          if (!map.get(parent.germplasmDbId)) {
            map.set(parent.germplasmDbId, new Set<string>());
          }
          map.get(parent.germplasmDbId)?.add(rootGermplasmDbId);
          this.addRootGermplasmDbIdToMap(map, rootGermplasmDbId, pedigreeMap?.get(parent.germplasmDbId), pedigreeMap);
        }
      });
    }
  }

  private getBreedingMethodIdInDestination(copy: any): string {
    const bmSource = this.breedingMethodsSourceById[copy.breedingMethodDbId];
    if (!bmSource) {
      return '';
    }
    const bmDest = this.breedingMethodsDestByName[bmSource.breedingMethodName];
    if (!bmDest) {
      return '';
    }
    return bmDest.breedingMethodDbId;
  }

  renderBreedingMethodCell(g: any): string {
    if (!this.breedingMethodsSourceById[g.breedingMethodDbId]) {
      return '';
    }
    let cell = this.breedingMethodsSourceById[g.breedingMethodDbId].breedingMethodName;
    const b = this.getBreedingMethodIdInDestination(g);

    if (!b) {
      cell = '<i class="text-danger" title="Doesn\'t exists in target">&#10007;</i> ' + cell;
    } else {
      cell = '<i class="text-success" title="exists in target">&#10003;</i> ' + cell;
    }
    return cell;
  }
}
