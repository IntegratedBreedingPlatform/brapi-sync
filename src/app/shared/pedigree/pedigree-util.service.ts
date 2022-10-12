import { Injectable } from '@angular/core';
import { brapiAll } from '../../util/brapi-all';
import { EntityEnum, ExternalReferenceService } from '../external-reference/external-reference.service';
import { Germplasm } from '../brapi/2.0/model/germplasm';
import { ContextService } from '../../context.service';
import { PedigreeNode } from '../brapi/2.1/model/pedigree-node';
import { PedigreeNodeParents } from '../brapi/2.1/model/pedigree-node-parents';
import { ParentType } from '../brapi/2.1/model/parent-type';
import { GraphNode } from '../pedigree-graph/graph-node';
import { GermplasmSearchRequest } from '../brapi/2.0/model/germplasm-search-request';
import { PedigreeSearchRequest } from '../brapi/2.1/model/pedigree-search-request';
import { GermplasmService } from '../brapi/2.0/api/germplasm.service';
import { PedigreeService } from '../brapi/2.1/api/pedigree.service';

declare const BrAPI: any;

@Injectable({
  providedIn: 'root'
})
export class PedigreeUtilService {

  brapiDestination: any;

  constructor(private externalReferenceService: ExternalReferenceService,
              private context: ContextService,
              private germplasmService: GermplasmService,
              private pedigreeService: PedigreeService) {
    this.brapiDestination = BrAPI(this.context.destination, '2.0', this.context.destinationToken);
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
    const pedigreeMap: Map<string, PedigreeNode> = await this.searchPedigree(basePath, pedigreeSearchRequest);
    return pedigreeMap;
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

  async searchInTargetByPUIs(germplasm: Germplasm[]): Promise<{ [p: string]: Germplasm }> {

    const germplasmInDestinationByPUIs: { [p: string]: Germplasm } = {};

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
              germplasmInDestinationByPUIs[g.germplasmPUI] = g;
            });
          }
        }
      }
    }

    return germplasmInDestinationByPUIs;

  }

  async searchInTargetByReferenceIds(germplasm: any[]): Promise<{ [p: string]: Germplasm }> {

    const germplasmInDestinationByReferenceIds: { [p: string]: Germplasm } = {};

    // Find germplasm in destination by external reference ID
    const germplasmRefIds = germplasm.map(g => this.externalReferenceService.getReferenceId(EntityEnum.GERMPLASM, g.germplasmDbId));
    let currentPage = 0;
    let totalPages = 1;
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
                  germplasmInDestinationByReferenceIds[ref.referenceID] = g;
                });
              }
            });
          }
        }
      }
    }
    return germplasmInDestinationByReferenceIds;
  }

  isDerivative(pedigreeNode: PedigreeNode | undefined): boolean {
    const groupSource = pedigreeNode?.parents?.find(o => o.parentType === ParentType.POPULATION);
    const immediateSource = pedigreeNode?.parents?.find(o => o.parentType === ParentType.SELF);
    if (groupSource || immediateSource) {
      return true;
    }
    return false;
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

  getMatchingGermplasmInDestination(germplasm: Germplasm | undefined,
                                    germplasmInDestinationByPUIs?: { [p: string]: Germplasm },
                                    germplasmInDestinationByReferenceIds?: { [p: string]: Germplasm }): Germplasm | undefined {
    if (germplasm?.germplasmPUI && germplasmInDestinationByPUIs && germplasmInDestinationByPUIs[germplasm?.germplasmPUI]) {
      return germplasmInDestinationByPUIs[germplasm.germplasmPUI];
    } else if (germplasmInDestinationByReferenceIds && germplasmInDestinationByReferenceIds[
      this.externalReferenceService.getReferenceId(EntityEnum.GERMPLASM, germplasm?.germplasmDbId)]) {
      return germplasmInDestinationByReferenceIds[this.externalReferenceService.getReferenceId(EntityEnum.GERMPLASM,
        germplasm?.germplasmDbId)];
    }
    return undefined;
  }

  generateGermplasmTreeGraphNode(rootGermplasmDbId: string, maximumLevelOfRecursion: number, pedigreeMapSource?: Map<string, PedigreeNode>,
                                 pedigreeMapDestination?: Map<string, PedigreeNode>,
                                 germplasmInDestinationByPUIs?: { [p: string]: Germplasm },
                                 germplasmInDestinationByReferenceIds?: { [p: string]: Germplasm }): GraphNode | undefined {

    const pedigreeNode = pedigreeMapSource?.get(rootGermplasmDbId);
    const graphNode = this.convertToGermplasmTreeGraphNode(pedigreeNode, false, germplasmInDestinationByPUIs,
      germplasmInDestinationByReferenceIds);
    if (graphNode) {
      const level = 1;
      this.addParentNodes(level, maximumLevelOfRecursion, graphNode, pedigreeNode, pedigreeMapSource, pedigreeMapDestination,
        germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
    }
    return graphNode;
  }

  private addParentNodes(level: number,
                         maximumLevelOfRecursion: number,
                         graphNode?: GraphNode, sourcePedigreeNode?: PedigreeNode,
                         pedigreeMapSource?: Map<string, PedigreeNode>,
                         pedigreeMapDestination?: Map<string, PedigreeNode>,
                         germplasmInDestinationByPUIs?: { [p: string]: Germplasm },
                         germplasmInDestinationByReferenceIds?: { [p: string]: Germplasm }): void {

    if (!graphNode) {
      return;
    }

    // Check if source germplasm (pedigree node) already exists in the destination server
    const existingGermplasmInDestination = this.getMatchingGermplasmInDestination({ germplasmDbId: sourcePedigreeNode?.germplasmDbId },
      germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
    if (existingGermplasmInDestination && existingGermplasmInDestination?.germplasmDbId && existingGermplasmInDestination?.germplasmName) {
      // If the germplasm already exists, show the germplasmDbId and germplasm name of the existing germplasm in destination
      graphNode.isExistingInTarget = true;
      graphNode.germplasmDbId = existingGermplasmInDestination?.germplasmDbId;
      graphNode.preferredName = existingGermplasmInDestination?.germplasmName;
    }

    // Immediately terminate the function once max level is reached.
    if (level >= maximumLevelOfRecursion) {
      return;
    }

    // Extract the parents of the source germplasm
    const sourcePedigreeNodeParent1 = this.getParent1(sourcePedigreeNode);
    const sourcePedigreeNodeParent2 = this.getParent2(sourcePedigreeNode);
    const sourcePedigreeOtherMaleParents = this.getOtherMaleParents(sourcePedigreeNode);

    // Compare the parents
    let parent1Mismatch = false;
    let parent2Mismatch = false;
    let destinationPedigreeNode;
    let destinationPedigreeNodeParent1: PedigreeNode | undefined;
    let destinationPedigreeNodeParent2: PedigreeNode | undefined;
    let otherMaleParentsMismatch: PedigreeNodeParents[] | undefined;

    if (sourcePedigreeNode?.germplasmDbId && existingGermplasmInDestination) {
      // Get the existing germplasm of the source germplasm's parents
      const existingSourceGermplasmParent1 =
        this.getMatchingGermplasmInDestination({ germplasmDbId: sourcePedigreeNodeParent1?.germplasmDbId },
          germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
      const existingSourceGermplasmParent2 =
        this.getMatchingGermplasmInDestination({ germplasmDbId: sourcePedigreeNodeParent2?.germplasmDbId },
          germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);

      // Extract the parents of the existing germplasm from the target
      destinationPedigreeNode = pedigreeMapDestination?.get(existingGermplasmInDestination?.germplasmDbId ?
        existingGermplasmInDestination.germplasmDbId : '');
      destinationPedigreeNodeParent1 = this.getParent1(destinationPedigreeNode);
      destinationPedigreeNodeParent2 = this.getParent2(destinationPedigreeNode);
      const destinationPedigreeNodeOtherParents: Map<string, PedigreeNodeParents> = new Map<string, PedigreeNodeParents>(
        this.getOtherMaleParents(destinationPedigreeNode)?.map((o => [o.germplasmDbId, o] as [string, PedigreeNodeParents])));

      /*** Check if the parents of the source germplasm and parents of target germplasm are equal ***/

      // Check if source germplasm's parent 1 doesn't match the target germplasm's parent 1
      if (existingSourceGermplasmParent1?.germplasmDbId && destinationPedigreeNodeParent1?.germplasmDbId
        && existingSourceGermplasmParent1?.germplasmDbId !== destinationPedigreeNodeParent1?.germplasmDbId) {
        parent1Mismatch = true;
      }
      // Check if source germplasm's parent 1 does not exist and the target germplasm's parent 1 is already assigned
      if (!existingSourceGermplasmParent1?.germplasmDbId && destinationPedigreeNodeParent1?.germplasmDbId) {
        parent1Mismatch = true;
      }
      // Check if source germlasm's parent 2 doesn't match the target germplasm's parent 2
      if (existingSourceGermplasmParent2?.germplasmDbId && destinationPedigreeNodeParent2?.germplasmDbId
        && existingSourceGermplasmParent2?.germplasmDbId !== destinationPedigreeNodeParent2?.germplasmDbId) {
        parent2Mismatch = true;
      }
      // Check if source germplasm's parent 2 does not exist and the target germplasm's parent 2 is already assigned
      if (!existingSourceGermplasmParent2?.germplasmDbId && destinationPedigreeNodeParent2?.germplasmDbId) {
        parent2Mismatch = true;
      }

      // matches
      const matches: string[] = [];
      sourcePedigreeOtherMaleParents?.forEach(p => {
        const existingSourceGermplasmOtherParent = this.getMatchingGermplasmInDestination({ germplasmDbId: p?.germplasmDbId },
          germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
        if (p.germplasmDbId && existingSourceGermplasmOtherParent
          && existingSourceGermplasmOtherParent.germplasmDbId
          && destinationPedigreeNodeOtherParents.has(existingSourceGermplasmOtherParent.germplasmDbId)) {
          matches.push(existingSourceGermplasmOtherParent.germplasmDbId);
        }
      });
      otherMaleParentsMismatch = Array.from(destinationPedigreeNodeOtherParents.values()).filter(o => o.germplasmDbId
        && !matches.includes(o.germplasmDbId));
    }

    // Immediately terminate the function if both female and male parent of source germplasm are undefined/unknown
    if (!sourcePedigreeNodeParent1?.germplasmDbId && !sourcePedigreeNodeParent2?.germplasmDbId) {
      return;
    }

    if (sourcePedigreeNodeParent1?.germplasmDbId && sourcePedigreeNodeParent1?.germplasmName) {
      if (parent1Mismatch && destinationPedigreeNodeParent1?.germplasmDbId) {
        // If source's parent 1 doesn't match the target's parent 1
        // Then show the parent 1 of the target germplasm and mark it as "mismatched"
        const parentNode = this.convertToGermplasmTreeGraphNode(pedigreeMapDestination?.get(destinationPedigreeNodeParent1?.germplasmDbId),
          parent1Mismatch, germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
        graphNode.femaleParentNode = parentNode;
      } else {
        const parentNode = this.convertToGermplasmTreeGraphNode(pedigreeMapSource?.get(sourcePedigreeNodeParent1?.germplasmDbId),
          parent1Mismatch, germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
        const pedigreeNode = pedigreeMapSource?.get(sourcePedigreeNodeParent1?.germplasmDbId);
        graphNode.femaleParentNode = parentNode;
        if (!this.isDerivative(sourcePedigreeNode)) {
          // This is to avoid multiple processing of the same group source in a derivative line.
          this.addParentNodes((level + 1), maximumLevelOfRecursion, parentNode, pedigreeNode, pedigreeMapSource, pedigreeMapDestination,
            germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
        }
      }
    } else {
      // If germplasmDbId and germplasm are null, it means the parent is unknown.
      graphNode.femaleParentNode = this.createUnknownGraphNode();
    }
    if (sourcePedigreeNodeParent2?.germplasmDbId && sourcePedigreeNodeParent2?.germplasmName) {
      if ((parent2Mismatch || parent1Mismatch) && destinationPedigreeNodeParent2?.germplasmDbId) {
        // If source's parent 2 doesn't match the target's parent 2
        // Then show the parent 2 of the target germplasm and mark it as "mismatched"
        // In case germplasm is derivative, if the group and/or immediate source do not match, then mark the germplasn as "mismatched"
        const isMismatch = parent2Mismatch || (this.isDerivative(sourcePedigreeNode) && parent1Mismatch);
        const parentNode = this.convertToGermplasmTreeGraphNode(pedigreeMapDestination?.get(destinationPedigreeNodeParent2?.germplasmDbId),
          isMismatch, germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
        graphNode.maleParentNode = parentNode;
      } else {
        const parentNode = this.convertToGermplasmTreeGraphNode(pedigreeMapSource?.get(sourcePedigreeNodeParent2?.germplasmDbId),
          parent2Mismatch, germplasmInDestinationByPUIs,
          germplasmInDestinationByReferenceIds);
        const pedigreeNode = pedigreeMapSource?.get(sourcePedigreeNodeParent2?.germplasmDbId);
        graphNode.maleParentNode = parentNode;
        this.addParentNodes((level + 1), maximumLevelOfRecursion, parentNode, pedigreeNode, pedigreeMapSource, pedigreeMapDestination,
          germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
      }
    } else {
      // If germplasmDbId and germplasm are null, it means the parent is unknown.
      graphNode.maleParentNode = this.createUnknownGraphNode();
    }

    sourcePedigreeOtherMaleParents?.forEach(sourcePedigreeOtherParent => {
      if (sourcePedigreeOtherParent?.germplasmDbId && sourcePedigreeOtherParent?.germplasmName) {
        const parentNode = this.convertToGermplasmTreeGraphNode(pedigreeMapSource?.get(sourcePedigreeOtherParent?.germplasmDbId),
          false, germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
        const pedigreeNode = pedigreeMapSource?.get(sourcePedigreeOtherParent?.germplasmDbId);
        if (parentNode) {
          graphNode.otherProgenitors?.push(parentNode);
        }
        this.addParentNodes((level + 1), maximumLevelOfRecursion, parentNode, pedigreeNode, pedigreeMapSource, pedigreeMapDestination,
          germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
      }
    });
    if (otherMaleParentsMismatch?.length) {
      otherMaleParentsMismatch.forEach(o => {
        if (o.germplasmDbId) {
          const parentNode = this.convertToGermplasmTreeGraphNode(pedigreeMapDestination?.get(o.germplasmDbId), true,
            germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
          if (parentNode) {
            graphNode.otherProgenitors?.push(parentNode);
          }
        }
      });
    }
  }

  convertToGermplasmTreeGraphNode(pedigreeNode?: PedigreeNode, isMismatched: boolean = false,
                                  germplasmInDestinationByPUIs?: { [p: string]: Germplasm },
                                  germplasmInDestinationByReferenceIds?: { [p: string]: Germplasm }): GraphNode | undefined {
    let germplasmTreeNode;
    if (pedigreeNode && pedigreeNode.germplasmDbId && pedigreeNode.germplasmName) {

      const existingGermplasmInDestination = this.getMatchingGermplasmInDestination({ germplasmDbId: pedigreeNode?.germplasmDbId },
        germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
      germplasmTreeNode = new GraphNode(pedigreeNode?.germplasmDbId, pedigreeNode?.germplasmName);
      germplasmTreeNode.isDerivative = this.isDerivative(pedigreeNode);
      germplasmTreeNode.isMismatched = isMismatched;
      germplasmTreeNode.methodName = pedigreeNode.breedingMethodName;
      if (existingGermplasmInDestination && existingGermplasmInDestination?.germplasmDbId
        && existingGermplasmInDestination?.germplasmName) {
        // If the germplasm already exists, show the germplasmDbId and germplasm name of the existing germplasm in destination
        germplasmTreeNode.isExistingInTarget = true;
        germplasmTreeNode.germplasmDbId = existingGermplasmInDestination?.germplasmDbId;
        germplasmTreeNode.preferredName = existingGermplasmInDestination?.germplasmName;
      }
    }
    return germplasmTreeNode;
  }

  comparePedigreeTreeNodes(maximumLevelOfRecursion: number, germplasm: Germplasm[],
                           pedigreeMapSource: Map<string, PedigreeNode>,
                           pedigreeMapDestination: Map<string, PedigreeNode>,
                           germplasmInDestinationByPUIs?: { [p: string]: Germplasm },
                           germplasmInDestinationByReferenceIds?: { [p: string]: Germplasm }): Map<string, Array<PedigreeNode>> {
    // Create a map that contains a list of mismatched pedigree nodes per germplasm if there's any.
    const invalidPedigreeNodes: Map<string, Array<PedigreeNode>> = new Map<string, Array<PedigreeNode>>();

    // Compare pedigree tree of the source and destination
    germplasm.forEach((g: Germplasm) => {
      if (g.germplasmDbId) {
        const pedigreeNode = pedigreeMapSource?.get(g.germplasmDbId);
        if (pedigreeNode && pedigreeNode.germplasmDbId) {
          const level = 1;
          this.validatePedigreeNode(level, maximumLevelOfRecursion, pedigreeNode?.germplasmDbId, invalidPedigreeNodes, pedigreeNode,
            pedigreeMapSource,
            pedigreeMapDestination,
            germplasmInDestinationByPUIs,
            germplasmInDestinationByReferenceIds);
        }
      }
    });
    return invalidPedigreeNodes;

  }

  // Recursive function to compare the pedigree nodes (parents) of source germplasm to the target germplasm.
  // Mismatched pedigree nodes will be added to the invalidPedigreeNodes map.
  private validatePedigreeNode(level: number, maximumLevelOfRecursion: number, rootGermplasmDbId: string,
                               invalidPedigreeNodes: Map<string, Array<PedigreeNode>>,
                               sourcePedigreeNode?: PedigreeNode,
                               pedigreeMapSource?: Map<string, PedigreeNode>,
                               pedigreeMapDestination?: Map<string, PedigreeNode>,
                               germplasmInDestinationByPUIs?: { [p: string]: Germplasm },
                               germplasmInDestinationByReferenceIds?: { [p: string]: Germplasm }): void {


    // Immediately terminate the function once max level is reached.
    if (level >= maximumLevelOfRecursion) {
      return;
    }

    // Extract the parents of the source germplasm
    const sourcePedigreeNodeParent1 = this.getParent1(sourcePedigreeNode);
    const sourcePedigreeNodeParent2 = this.getParent2(sourcePedigreeNode);
    const sourcePedigreeOtherMaleParents = this.getOtherMaleParents(sourcePedigreeNode);

    // Check if source germplasm (pedigree node) already exists in the destination server
    const existingGermplasmInDestination = this.getMatchingGermplasmInDestination({ germplasmDbId: sourcePedigreeNode?.germplasmDbId },
      germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
    if (sourcePedigreeNode?.germplasmDbId && existingGermplasmInDestination) {
      // Get the existing germplasm of the source germplasm's parents
      const existingSourceGermplasmParent1 =
        this.getMatchingGermplasmInDestination({ germplasmDbId: sourcePedigreeNodeParent1?.germplasmDbId },
          germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
      const existingSourceGermplasmParent2 =
        this.getMatchingGermplasmInDestination({ germplasmDbId: sourcePedigreeNodeParent2?.germplasmDbId },
          germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
      const existingSourceGermplasmOtherParents: Map<string, Germplasm> = new Map<string, Germplasm>();
      sourcePedigreeOtherMaleParents?.forEach(p => {
        const existingSourceGermplasmOtherParent = this.getMatchingGermplasmInDestination({ germplasmDbId: p?.germplasmDbId },
          germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
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

    if (sourcePedigreeNodeParent1?.germplasmDbId && !this.isDerivative(sourcePedigreeNode)) {
      // Only validate parent 1 if the germplasm is generative.
      // So that if germplasm is derivative, we can avoid multiple validations of the same group source in derivatine line.
      this.validatePedigreeNode((level + 1), maximumLevelOfRecursion, rootGermplasmDbId, invalidPedigreeNodes,
        pedigreeMapSource?.get(sourcePedigreeNodeParent1?.germplasmDbId),
        pedigreeMapSource, pedigreeMapDestination, germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
    }
    if (sourcePedigreeNodeParent2?.germplasmDbId) {
      this.validatePedigreeNode((level + 1), maximumLevelOfRecursion, rootGermplasmDbId, invalidPedigreeNodes,
        pedigreeMapSource?.get(sourcePedigreeNodeParent2?.germplasmDbId),
        pedigreeMapSource, pedigreeMapDestination, germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
    }
    sourcePedigreeOtherMaleParents?.forEach(sourcePedigreeOtherParent => {
      if (sourcePedigreeOtherParent?.germplasmDbId) {
        this.validatePedigreeNode((level + 1), maximumLevelOfRecursion, rootGermplasmDbId, invalidPedigreeNodes,
          pedigreeMapSource?.get(sourcePedigreeOtherParent?.germplasmDbId),
          pedigreeMapSource, pedigreeMapDestination, germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
      }
    });

  }

  private addToInvalidPedigreeNodes(invalidPedigreeNodes: Map<string, Array<PedigreeNode>>, sourceGermplasmDbId: string,
                                    pedigreeNode: PedigreeNode): void {
    // Initialize array if still undefined
    if (!invalidPedigreeNodes.has(sourceGermplasmDbId)) {
      invalidPedigreeNodes.set(sourceGermplasmDbId, new Array<PedigreeNode>());
    }
    invalidPedigreeNodes.get(sourceGermplasmDbId)?.push(pedigreeNode);
  }

  private createUnknownGraphNode(): GraphNode {
    return new GraphNode('0', 'UNKNOWN');
  }
}
