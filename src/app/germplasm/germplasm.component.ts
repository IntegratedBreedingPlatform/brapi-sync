import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContextService } from '../context.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { EXTERNAL_REFERENCE_SOURCE } from '../app.constants';
import { EntityEnum, ExternalReferenceService } from '../shared/external-reference/external-reference.service';
import { AlertService } from '../shared/alert/alert.service';
import { BlockUIService } from 'ng-block-ui';
import { Germplasm } from '../shared/brapi/2.0/model/germplasm';
import { GermplasmSourceModalComponent } from './germplasm-source-modal.component';
import { PedigreeService } from '../shared/brapi/2.1/api/pedigree.service';
import { PedigreeNode } from '../shared/brapi/2.1/model/pedigree-node';
import { GermplasmService } from '../shared/brapi/2.0/api/germplasm.service';
import { PedigreeNodeParents } from '../shared/brapi/2.1/model/pedigree-node-parents';
import { BreedingMethod } from '../shared/brapi/2.0/model/breeding-method';
import { GermplasmPedigreeGraphModalComponent } from './germplasm-pedigree-graph-modal.component';
import { PedigreeUtilService } from '../shared/pedigree/pedigree-util.service';

declare const BrAPI: any;

@Component({
  selector: 'app-germplasm',
  templateUrl: './germplasm.component.html',
  styleUrls: ['./germplasm.component.css']
})
export class GermplasmComponent implements OnInit {
  MAX_NAME_DISPLAY_SIZE = 50;

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

  // Import Ancestor Options
  maxNumberOfAncestors = 15;
  numberOfGenerations = 1;
  isNumberOfGenerationsValid = true;
  isImportAncestors = false;
  isAttemptToConnectTargetAncestors = false;

  // Map of existing germplasm matched by PUI,
  germplasmInDestinationByPUIs: { [p: string]: Germplasm } = {};
  // Map of existing germplasm matched by ReferenceIds,
  germplasmInDestinationByReferenceIds: { [p: string]: Germplasm } = {};
  pedigreeMapSource: Map<string, PedigreeNode> = new Map<string, PedigreeNode>();
  pedigreeMapDestination: Map<string, PedigreeNode> = new Map<string, PedigreeNode>();
  germplasmWithAncestors: Germplasm[] = [];
  invalidPedigreeNodes: Map<string, Array<PedigreeNode>> = new Map<string, Array<PedigreeNode>>();


  private readonly noNewGermplasmCanBeImportedMessage = 'No new germplasm can be imported.';

  constructor(
    private router: Router,
    public context: ContextService,
    private modalService: NgbModal,
    private http: HttpClient,
    private externalReferenceService: ExternalReferenceService,
    private alertService: AlertService,
    private blockUIService: BlockUIService,
    private germplasmService: GermplasmService,
    private pedigreeService: PedigreeService,
    public pedigreeUtilService: PedigreeUtilService
  ) {
    // TODO / testing / remove
    // this.load();
    this.brapiDestination = BrAPI(this.context.destination, '2.0', this.context.destinationToken);
    this.brapiSource = BrAPI(this.context.source, '2.0', this.context.source);
  }

  ngOnInit(): void {
    this.alertService.removeAll();
    // Load breeding methods only once when the page initialized.
    this.loadBreedingMethods();
  }

  async loadBreedingMethods(): Promise<void> {
    // Retrieve the breeding methods from source server
    const breedingMethodsFromSource = await this.germplasmService.breedingmethodsGetAll(this.context.source).toPromise();
    if (breedingMethodsFromSource && breedingMethodsFromSource.length) {
      breedingMethodsFromSource.forEach((breedingMethod) => {
        this.breedingMethodsSourceByName[breedingMethod.breedingMethodName] = breedingMethod;
        this.breedingMethodsSourceById[breedingMethod.breedingMethodDbId] = breedingMethod;
      });
    }
    // Retrive the breeding methods from destination server
    const breedingMethodsFromDestination = await this.germplasmService.breedingmethodsGetAll(this.context.destination).toPromise();
    if (breedingMethodsFromDestination && breedingMethodsFromDestination.length) {
      breedingMethodsFromDestination.forEach((breedingMethod) => {
        this.breedingMethodsDestByName[breedingMethod.breedingMethodName] = breedingMethod;
        this.breedingMethodsDestById[breedingMethod.breedingMethodDbId] = breedingMethod;
      });
    }
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

      await this.applyImportAncestorsSettings(selectedGermplasm);

      const validSelectedGermplasmForImport = selectedGermplasm.filter((g) => this.isSelectable(g, this.invalidPedigreeNodes));

      if (validSelectedGermplasmForImport.length) {

        // Extract the germplasmDbIds of the germplasm and their pedigree (ancestors)
        const germplasmDbIdsForCreation = this.pedigreeUtilService.filterGermplasmForCreation(validSelectedGermplasmForImport,
          this.pedigreeMapSource,
          this.numberOfGenerations);

        // Retrieve the details of the germplasm and of their pedigree (ancestors)
        const germplasmWithAncestors = await this.pedigreeUtilService.searchGermplasm(this.context.source,
          { germplasmDbIds: Array.from(germplasmDbIdsForCreation.values()) });

        this.post(germplasmWithAncestors, this.pedigreeMapSource);
      } else {
        this.alertService.showWarning(this.noNewGermplasmCanBeImportedMessage);
        this.isSaving = false;
        this.blockUIService.stop('main');
      }
    } else {
      this.post(selectedGermplasm);
    }

  }

  private async post(germplasm: Germplasm[], pedigreeMap?: Map<string, PedigreeNode>): Promise<void> {
    try {
      this.isSaving = true;

      // Get the germplasm that do not exist yet in the destination server
      const filteredGermplasm = germplasm.filter((g) => !this.isGermplasmExistsInDestination(g,
        this.germplasmInDestinationByPUIs, this.germplasmInDestinationByReferenceIds));

      if (!filteredGermplasm.length) {
        await this.updatePedigreeTree(germplasm, pedigreeMap);
        // If all germplasm already exists in the server, show an error message
        this.alertService.showWarning('No new germplasm can be imported.');
      } else {
        // Import the germplasm into the destination server
        const createNewGermplasmRequest = filteredGermplasm.map((g) => this.transformForSave(g));
        const res = await this.http.post(this.context.destination + '/germplasm', createNewGermplasmRequest).toPromise();
        // Update the pedigree of newly created germplasm
        await this.updatePedigreeTree(germplasm, pedigreeMap);
        this.onSuccess(res);
      }
    } catch (error) {
      this.onError(error);
    }
    this.isSaving = false;
    this.blockUIService.stop('main');
  }

  async updatePedigreeTree(germplasm: Germplasm[], pedigreeMap?: Map<string, PedigreeNode>): Promise<void> {

    // Only update pedigree tree of number of generation is more than 1
    if (this.numberOfGenerations <= 1) {
      return;
    }
    // Once the germplasm are saved, search again for germplasm that exist in the destination
    // Find germplasm in destination by Permanent Unique Identifier (germplasmPUI)
    const germplasmInDestinationByPUIs = await this.pedigreeUtilService.searchGermplasmByPUIs(this.context.destination, germplasm);
    // Find germplasm in destination by referenceId (germplasmDbId)
    const germplasmInDestinationByReferenceIds = await this.pedigreeUtilService.searchGermplasmByReferenceIds(
      this.context.destination, germplasm);

    if (pedigreeMap) {

      const existingGermplasmFromDestination: Germplasm[] = [];
      pedigreeMap.forEach((pedigreeNode, germplasmDbId, map) => {
        const germplasmInDestination = this.pedigreeUtilService.getMatchingGermplasmInDestination({
            germplasmDbId,
            germplasmPUI: this.pedigreeUtilService.getPUI(germplasmDbId, pedigreeMap)
          },
          germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
        if (germplasmInDestination) {
          existingGermplasmFromDestination.push(germplasmInDestination);
        }
      });

      const pedigreeMapDestination = await this.pedigreeUtilService.getPedigreeMap(this.context.destination,
        existingGermplasmFromDestination, this.numberOfGenerations);

      const pedigreeNodeUpdateRequest: { [key: string]: PedigreeNode; } = {};
      pedigreeMap.forEach((pedigreeNode, germplasmDbId, map) => {
        const germplasmInDestination = this.pedigreeUtilService.getMatchingGermplasmInDestination({
            germplasmDbId,
            germplasmPUI: this.pedigreeUtilService.getPUI(germplasmDbId, pedigreeMap)
          },
          germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
        if (germplasmInDestination) {

          // Only update the parents of a germplasm if it's a terminal node (parents still unknown)
          if (germplasmInDestination.germplasmDbId &&
            !this.pedigreeUtilService.isTerminalNode(pedigreeMapDestination.get(germplasmInDestination.germplasmDbId))) {
            return;
          }

          const pedigreeNodeForUpdate: PedigreeNode = {
            germplasmDbId: germplasmInDestination.germplasmDbId,
            breedingMethodDbId: this.getBreedingMethodIdInDestination({ breedingMethodDbId: pedigreeNode.breedingMethodDbId })
          };
          if (pedigreeNode.parents) {
            const pedigreeNodesForUpdateParents: PedigreeNodeParents[] = [];
            pedigreeNode.parents.forEach((pedigreeNodeParent: PedigreeNodeParents) => {
              // If the parent is null or undefined it means it is unknown
              if (!pedigreeNodeParent.germplasmDbId) {
                pedigreeNodesForUpdateParents.push({
                  parentType: pedigreeNodeParent.parentType,
                  // Set the parent's germplasmDbId to undefined so that it will be processed/tagged as UNKNOWN (0 gid)
                  germplasmDbId: undefined
                });
              } else {
                const parent = this.pedigreeUtilService.getMatchingGermplasmInDestination({
                  germplasmDbId: pedigreeNodeParent.germplasmDbId || '',
                  germplasmPUI: this.pedigreeUtilService.getPUI(pedigreeNodeParent.germplasmDbId, pedigreeMap)
                }, germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
                if (parent && parent.germplasmDbId) {
                  pedigreeNodesForUpdateParents.push({
                    parentType: pedigreeNodeParent.parentType,
                    germplasmDbId: parent?.germplasmDbId
                  });
                }
              }
            });
            pedigreeNodeForUpdate.parents = pedigreeNodesForUpdateParents;

            const parent1 = this.pedigreeUtilService.getParent1(pedigreeNodeForUpdate);
            const parent2 = this.pedigreeUtilService.getParent2(pedigreeNodeForUpdate);

            if (!parent1?.germplasmDbId && !parent2?.germplasmDbId) {
              return;
            }

            // Only update germplasm if it has parents and both parent1 and parent2 are defined.
            if (germplasmInDestination.germplasmDbId && pedigreeNodesForUpdateParents.length > 0
              && parent1 && parent2) {
              // Add the pedigree node for update at the beginning of the list
              pedigreeNodeUpdateRequest[germplasmInDestination.germplasmDbId] = pedigreeNodeForUpdate;
            }
          }
        }
      });
      // Only update pedigree if there's data.
      if (Object.keys(pedigreeNodeUpdateRequest).length > 0) {
        const res = await this.pedigreeService.pedigreePut(this.context.destination, pedigreeNodeUpdateRequest).toPromise();
        this.showPutErrors(res);
      }
    }

  }

  transformForSave(germplasm: any): any {
    const copy = Object.assign({}, germplasm);

    delete copy.germplasmDbId;
    delete copy.germplasmOrigin;
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

  showPutErrors(res: any): void {
    this.errors = res.body.metadata.status.filter((s: any) => s.messageType === 'ERROR');
    if (this.errors.length) {
      this.alertService.showDanger(this.errors);
    }
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
      this.page = 1;

      this.cleanItemsSelection();
      this.load();
    }
  }

  onPageSizeChanged(): void {
    this.cleanItemsSelection();
    this.load();
  }

  async load(): Promise<void> {
    this.reset();
    this.isLoading = true;
    if (this.isNumberOfGenerationsValid) {
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

        if (this.isImportAncestors) {

          await this.applyImportAncestorsSettings(this.germplasm);

        } else {
          // Find germplasm in destination by Permanent Unique Identifier (germplasmPUI)
          this.germplasmInDestinationByPUIs = await this.pedigreeUtilService.searchGermplasmByPUIs(this.context.destination,
            this.germplasm);
          // Find germplasm in destination by referenceId (germplasmDbId)
          this.germplasmInDestinationByReferenceIds = await this.pedigreeUtilService.searchGermplasmByReferenceIds(
            this.context.destination, this.germplasm);
        }

      } catch (error) {
        this.onError(error);
      }
    }
    this.isLoading = false;
  }

  validateNumberOfGenerations(): boolean {
    if (this.isImportAncestors && (this.numberOfGenerations < 1 || this.numberOfGenerations > this.maxNumberOfAncestors)) {
      this.alertService.showDanger('Number of generations should be greater than 0 and less than or equal to 15.');
      return false;
    }
    return true;
  }

  cleanItemsSelection(): void {
    this.selectedItems = {};
    this.isSelectAllPages = false;
  }

  reset(): void {
    this.germplasmInDestinationByPUIs = {};
    this.germplasmInDestinationByReferenceIds = {};
    this.pedigreeMapSource.clear();
    this.pedigreeMapDestination.clear();
    this.germplasmWithAncestors = [];
    this.invalidPedigreeNodes.clear();
    this.isNumberOfGenerationsValid = this.validateNumberOfGenerations();
  }

  isGermplasmExistsInDestination(germplasm: any,
                                 germplasmInDestinationByPUIs?: { [p: string]: Germplasm },
                                 germplasmInDestinationByReferenceIds?: { [p: string]: Germplasm }): boolean {
    // Check first if the germplasm has a match by PUI
    return this.pedigreeUtilService.getMatchingGermplasmInDestination(germplasm,
      germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds) ? true : false;
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

  showGermplasmSourceModal(sourceGermplasm: Germplasm): void {
    const modalReference = this.modalService.open(GermplasmSourceModalComponent, { size: 'xl', backdrop: 'static' });
    modalReference.componentInstance.sourceGermplasm = sourceGermplasm;
  }

  showPedigreeGraph(sourceGermplasm: Germplasm, isPreviewTarget: boolean): void {
    const modalReference = this.modalService.open(GermplasmPedigreeGraphModalComponent, { size: 'lg', backdrop: 'static', windowClass: 'modal-max-width' });
    modalReference.componentInstance.sourceGermplasm = sourceGermplasm;
    modalReference.componentInstance.numberOfGenerations = this.numberOfGenerations;
    modalReference.componentInstance.showSourcePedigreeTree = !isPreviewTarget;
    modalReference.componentInstance.showDestinationPreviewTree = isPreviewTarget;
    modalReference.componentInstance.isAttemptToConnectTargetAncestors = this.isAttemptToConnectTargetAncestors;
    // Pass the variables required to generate pedigree graph
    modalReference.componentInstance.germplasmInDestinationByPUIs = this.germplasmInDestinationByPUIs;
    modalReference.componentInstance.germplasmInDestinationByReferenceIds = this.germplasmInDestinationByReferenceIds;
    modalReference.componentInstance.germplasmWithAncestors = this.germplasmWithAncestors;
    modalReference.componentInstance.pedigreeMapSource = this.pedigreeMapSource;
    modalReference.componentInstance.pedigreeMapDestination = this.pedigreeMapDestination;
    modalReference.componentInstance.breedingMethodsDestinationById = this.breedingMethodsDestById;
  }

  async applyImportAncestorsSettings(germplasm: Germplasm[]): Promise<void> {

    // Retrieve the pedigree of the selected germplasm
    // This will return the pedigree nodes of the germplasm including all their ancestors
    this.pedigreeMapSource = await this.pedigreeUtilService.getPedigreeMap(this.context.source, germplasm,
      this.numberOfGenerations);

    // Retrieve the details of the germplasm and of their pedigree (ancestors)
    this.germplasmWithAncestors = await this.pedigreeUtilService.searchGermplasm(this.context.source,
      { germplasmDbIds: Array.from(this.pedigreeMapSource.keys()) });

    // Find germplasm in destination by Permanent Unique Identifier (germplasmPUI)
    this.germplasmInDestinationByPUIs = await this.pedigreeUtilService.searchGermplasmByPUIs(this.context.destination,
      this.germplasmWithAncestors);
    // Find germplasm in destination by referenceId (germplasmDbId)
    this.germplasmInDestinationByReferenceIds = await this.pedigreeUtilService.searchGermplasmByReferenceIds(
      this.context.destination, this.germplasmWithAncestors);

    // Get the existing germplasm from the target server
    const existingGermplasmFromDestination: Germplasm[] = [];
    this.germplasmWithAncestors.forEach(o => {
      const existingGermplasm = this.pedigreeUtilService.getMatchingGermplasmInDestination(o,
        this.germplasmInDestinationByPUIs, this.germplasmInDestinationByReferenceIds);
      if (existingGermplasm) {
        existingGermplasmFromDestination.push(existingGermplasm);
      }
    });

    if (existingGermplasmFromDestination && existingGermplasmFromDestination.length > 0) {
      // Get the pedigree information of the existing germplasm from the target server, we will use
      // this to compare the pedigree of the source to the pedigree of the target.
      this.pedigreeMapDestination = await this.pedigreeUtilService.getPedigreeMap(this.context.destination,
        existingGermplasmFromDestination, this.numberOfGenerations);
    }

    const invalidPedigreeNodes = this.pedigreeUtilService.validatePedigreeTreeNodes(this.numberOfGenerations, germplasm,
      this.pedigreeMapSource, this.pedigreeMapDestination, this.germplasmInDestinationByPUIs,
      this.germplasmInDestinationByReferenceIds, !this.isAttemptToConnectTargetAncestors);

    this.invalidPedigreeNodes = invalidPedigreeNodes;

  }

  hasInvalidPedigreeNodes(germplasmDbId: string, invalidPedigreeNodes: Map<string, Array<PedigreeNode>>): boolean {
    if (!germplasmDbId) {
      return false;
    }
    return this.isImportAncestors && invalidPedigreeNodes?.has(germplasmDbId);
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
    } else if (this.hasDifferentBreedingMethods(g)) {
      cell = '<i class="text-danger" title="different breeding method in target">&#10007;</i> ' + cell;
    } else {
      cell = '<i class="text-success" title="exists in target">&#10003;</i> ' + cell;
    }
    return cell;
  }

  isSelectable(germplasm: Germplasm, invalidPedigreeNodes: Map<string, PedigreeNode[]>): boolean {
    if (germplasm.germplasmDbId) {
      if (this.hasDifferentBreedingMethods(germplasm)) {
        return false;
      } else if (this.isImportAncestors && this.hasInvalidPedigreeNodes(germplasm.germplasmDbId, invalidPedigreeNodes)) {
        return false;
      } else if (!this.isImportAncestors && this.isGermplasmExistsInDestination(germplasm, this.germplasmInDestinationByPUIs,
        this.germplasmInDestinationByReferenceIds)) {
        return false;
      }
      return true;
    }
    return false;
  }

  hasDifferentBreedingMethods(germplasm: any): boolean {
    const germplasmInDestination = this.pedigreeUtilService.getMatchingGermplasmInDestination(germplasm,
      this.germplasmInDestinationByPUIs, this.germplasmInDestinationByReferenceIds);
    if (germplasmInDestination) {
      return this.breedingMethodsSourceById[germplasm.breedingMethodDbId].breedingMethodName
        !== this.getDestinationBreedingMethodId(germplasmInDestination);
    }
    return false;
  }

  getDestinationBreedingMethodId(germplasmInDestination: any): string {
    return this.breedingMethodsDestById[germplasmInDestination.breedingMethodDbId].breedingMethodName;
  }
}
