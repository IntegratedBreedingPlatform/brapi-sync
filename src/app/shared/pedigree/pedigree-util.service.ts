import { Injectable } from '@angular/core';
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
import { PedigreeNodeValidationResult, PedigreeNodeValidationType } from './pedigree-node-validation-result';
import { BreedingMethod } from '../brapi/2.0/model/breeding-method';

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
      // Get the actual search results based on the searchResultsDbId
      // If the result is paginated, we need to make sure that we get all the data from all the pages
      const germplasm = await this.germplasmService.searchGermplasmSearchResultsDbIdGetAll(basePath,
        searchGermplasmPost.body.result.searchResultsDbId).toPromise();
      if (germplasm && germplasm.length) {
        return germplasm;
      }
    }
    return [];
  }

  async getPedigreeMap(basePath: string, germplasm: Germplasm[], pedigreeDepth: number): Promise<Map<string, PedigreeNode>> {

    if (!germplasm || germplasm.length === 0) {
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
    return await this.searchPedigree(basePath, pedigreeSearchRequest);
  }

  async searchPedigree(basePath: string, request: PedigreeSearchRequest): Promise<Map<string, PedigreeNode>> {
    // Search pedigree nodes
    const searchPedigreePost = await this.pedigreeService.searchPedigreePost(basePath, request).toPromise();
    if (searchPedigreePost.body && searchPedigreePost.body.result) {
      // Get the actual search results based ob the searchResultsDbId
      const searchPedigreeGetResult = await this.pedigreeService.searchPedigreeSearchResultsDbIdGetAll(basePath,
        searchPedigreePost.body.result.searchResultsDbId).toPromise();
      // Convert the array of PedigreeNodes to Map
      const map = new Map<string, PedigreeNode>();
      if (searchPedigreeGetResult && searchPedigreeGetResult.length) {
        searchPedigreeGetResult.forEach(value => {
          if (value.germplasmDbId) {
            map.set(value.germplasmDbId, value);
          }
        });
      }
      return map;
    }
    return new Map<string, PedigreeNode>();
  }

  async searchGermplasmByPUIs(basePath: string, germplasm: Germplasm[]): Promise<{ [p: string]: Germplasm }> {

    const germplasmInDestinationByPUIs: { [p: string]: Germplasm } = {};

    // Find germplasm in destination by Permanent Unique Identifier (germplasmPUI)
    const germplasmPUIs = germplasm.filter(g => g.germplasmPUI !== null && g.germplasmPUI !== undefined).map(g => g.germplasmPUI);

    if (germplasmPUIs.length) {
      const germplasmByPUIsResult = await this.searchGermplasm(basePath, { germplasmPUIs });
      if (germplasmByPUIsResult && germplasmByPUIsResult.length) {
        germplasmByPUIsResult.forEach((g: any) => {
          germplasmInDestinationByPUIs[g.germplasmPUI] = g;
        });
      }
    }
    return germplasmInDestinationByPUIs;
  }

  async searchGermplasmByReferenceIds(basePath: string, germplasm: any[]): Promise<{ [p: string]: Germplasm }> {

    const germplasmInDestinationByReferenceIds: { [p: string]: Germplasm } = {};

    // Find germplasm in destination by external reference ID
    const externalReferenceIDs = germplasm.map(g => this.externalReferenceService.getReferenceId(EntityEnum.GERMPLASM, g.germplasmDbId));
    if (externalReferenceIDs.length) {
      const germplasmByReferenceIdsResult = await this.searchGermplasm(basePath, { externalReferenceIDs });

      if (germplasmByReferenceIdsResult && germplasmByReferenceIdsResult.length) {
        germplasmByReferenceIdsResult.forEach((g: any) => {
          if (g.externalReferences && g.externalReferences.length) {
            g.externalReferences.forEach((ref: any) => {
              germplasmInDestinationByReferenceIds[ref.referenceID] = g;
            });
          }
        });
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

  isTerminalNode(pedigreeNode: PedigreeNode | undefined): boolean {
    const parent1 = this.getParent1(pedigreeNode);
    const parent2 = this.getParent2(pedigreeNode);

    if (parent1 && parent2 && parent1.germplasmDbId === null && parent2.germplasmDbId === null) {
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

  generateGermplasmTreeGraphNode(rootGermplasmDbId: string,
                                 maximumLevelOfRecursion: number,
                                 validate: boolean,
                                 pedigreeMapSource?: Map<string, PedigreeNode>,
                                 pedigreeMapDestination?: Map<string, PedigreeNode>,
                                 germplasmInDestinationByPUIs?: { [p: string]: Germplasm },
                                 germplasmInDestinationByReferenceIds?: { [p: string]: Germplasm },
                                 breedingMethodsDestinationById?: { [p: string]: BreedingMethod },
                                 breedingMethodsDestByName?: { [p: string]: BreedingMethod }): GraphNode | undefined {

    const pedigreeNode = pedigreeMapSource?.get(rootGermplasmDbId);
    const graphNode = this.convertToGermplasmTreeGraphNode(pedigreeNode, false, germplasmInDestinationByPUIs,
      germplasmInDestinationByReferenceIds, breedingMethodsDestinationById, breedingMethodsDestByName);
    if (graphNode) {
      const level = 1;
      this.addParentNodes(level, maximumLevelOfRecursion, validate, graphNode, pedigreeNode, pedigreeMapSource, pedigreeMapDestination,
        germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds, breedingMethodsDestinationById, breedingMethodsDestByName);
    }
    return graphNode;
  }

  private addParentNodes(level: number,
                         maximumLevelOfRecursion: number,
                         validate: boolean,
                         graphNode?: GraphNode, sourcePedigreeNode?: PedigreeNode,
                         pedigreeMapSource?: Map<string, PedigreeNode>,
                         pedigreeMapDestination?: Map<string, PedigreeNode>,
                         germplasmInDestinationByPUIs?: { [p: string]: Germplasm },
                         germplasmInDestinationByReferenceIds?: { [p: string]: Germplasm },
                         breedingMethodsDestinationById?: { [p: string]: BreedingMethod },
                         breedingMethodsDestByName?: { [p: string]: BreedingMethod }): void {

    if (!graphNode) {
      return;
    }

    // Check if source germplasm (pedigree node) already exists in the destination server
    const existingGermplasmInDestination = this.getMatchingGermplasmInDestination({
      germplasmDbId: sourcePedigreeNode?.germplasmDbId,
      germplasmPUI: sourcePedigreeNode?.germplasmPUI
    }, germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
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

    if (validate && sourcePedigreeNode?.germplasmDbId && existingGermplasmInDestination) {
      // Get the existing germplasm of the source germplasm's parents
      const existingSourceGermplasmParent1 =
        this.getMatchingGermplasmInDestination({
            germplasmDbId: sourcePedigreeNodeParent1?.germplasmDbId,
            germplasmPUI: this.getPUI(sourcePedigreeNodeParent1?.germplasmDbId, pedigreeMapSource)
          },
          germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
      const existingSourceGermplasmParent2 =
        this.getMatchingGermplasmInDestination({
            germplasmDbId: sourcePedigreeNodeParent2?.germplasmDbId,
            germplasmPUI: this.getPUI(sourcePedigreeNodeParent2?.germplasmDbId, pedigreeMapSource)
          },
          germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);

      // Extract the parents of the existing germplasm from the target
      destinationPedigreeNode = pedigreeMapDestination?.get(existingGermplasmInDestination?.germplasmDbId ?
        existingGermplasmInDestination.germplasmDbId : '');
      destinationPedigreeNodeParent1 = this.getParent1(destinationPedigreeNode);
      destinationPedigreeNodeParent2 = this.getParent2(destinationPedigreeNode);
      const destinationPedigreeNodeOtherParents: Map<string, PedigreeNodeParents> = new Map<string, PedigreeNodeParents>(
        this.getOtherMaleParents(destinationPedigreeNode)?.map((o => [o.germplasmDbId, o] as [string, PedigreeNodeParents])));

      /*** Check if the parents of the source germplasm and parents of target germplasm are matched ***/

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

      // List of germplasmDbIds of existing other male parents
      const matches: string[] = [];
      sourcePedigreeOtherMaleParents?.forEach(p => {
        const existingSourceGermplasmOtherParent = this.getMatchingGermplasmInDestination({
            germplasmDbId: p?.germplasmDbId,
            germplasmPUI: this.getPUI(p?.germplasmDbId, pedigreeMapSource)
          },
          germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
        if (p.germplasmDbId && existingSourceGermplasmOtherParent
          && existingSourceGermplasmOtherParent.germplasmDbId
          && destinationPedigreeNodeOtherParents.has(existingSourceGermplasmOtherParent.germplasmDbId)) {
          matches.push(existingSourceGermplasmOtherParent.germplasmDbId);
        }
      });
      // Get the mismatched other male parents
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
          parent1Mismatch, germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds, breedingMethodsDestinationById,
          breedingMethodsDestByName);
        graphNode.femaleParentNode = parentNode;
        // Display the parent tree nodes of the mismatched germplasm from the destination server
        this.addParentNodesFromDestinationTree((level + 1), maximumLevelOfRecursion, parentNode,
          pedigreeMapDestination?.get(destinationPedigreeNodeParent1?.germplasmDbId), pedigreeMapDestination,
          breedingMethodsDestinationById, breedingMethodsDestByName);
      } else {
        const parentNode = this.convertToGermplasmTreeGraphNode(pedigreeMapSource?.get(sourcePedigreeNodeParent1?.germplasmDbId),
          parent1Mismatch, germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds, breedingMethodsDestinationById,
          breedingMethodsDestByName);
        const pedigreeNode = pedigreeMapSource?.get(sourcePedigreeNodeParent1?.germplasmDbId);
        graphNode.femaleParentNode = parentNode;
        if (!this.isDerivative(sourcePedigreeNode)) {
          // This is to avoid multiple processing of the same group source in a derivative line.
          this.addParentNodes((level + 1), maximumLevelOfRecursion, validate, parentNode, pedigreeNode, pedigreeMapSource,
            pedigreeMapDestination, germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds, breedingMethodsDestinationById,
            breedingMethodsDestByName);
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
          isMismatch, germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds, breedingMethodsDestinationById,
          breedingMethodsDestByName);
        graphNode.maleParentNode = parentNode;
        // Display the parent tree nodes of the mismatched germplasm from the destination server
        this.addParentNodesFromDestinationTree((level + 1), maximumLevelOfRecursion, parentNode,
          pedigreeMapDestination?.get(destinationPedigreeNodeParent2?.germplasmDbId), pedigreeMapDestination,
          breedingMethodsDestinationById, breedingMethodsDestByName);
      } else {
        const parentNode = this.convertToGermplasmTreeGraphNode(pedigreeMapSource?.get(sourcePedigreeNodeParent2?.germplasmDbId),
          parent2Mismatch, germplasmInDestinationByPUIs,
          germplasmInDestinationByReferenceIds,
          breedingMethodsDestinationById, breedingMethodsDestByName);
        const pedigreeNode = pedigreeMapSource?.get(sourcePedigreeNodeParent2?.germplasmDbId);
        graphNode.maleParentNode = parentNode;
        this.addParentNodes((level + 1), maximumLevelOfRecursion, validate, parentNode, pedigreeNode, pedigreeMapSource,
          pedigreeMapDestination, germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds, breedingMethodsDestinationById,
          breedingMethodsDestByName);
      }
    } else {
      // If germplasmDbId and germplasm are null, it means the parent is unknown.
      graphNode.maleParentNode = this.createUnknownGraphNode();
    }

    sourcePedigreeOtherMaleParents?.forEach(sourcePedigreeOtherParent => {
      if (sourcePedigreeOtherParent?.germplasmDbId && sourcePedigreeOtherParent?.germplasmName) {
        const parentNode = this.convertToGermplasmTreeGraphNode(pedigreeMapSource?.get(sourcePedigreeOtherParent?.germplasmDbId),
          false, germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds, breedingMethodsDestinationById,
          breedingMethodsDestByName);
        const pedigreeNode = pedigreeMapSource?.get(sourcePedigreeOtherParent?.germplasmDbId);
        if (parentNode) {
          graphNode.otherProgenitors?.push(parentNode);
        }
        this.addParentNodes((level + 1), maximumLevelOfRecursion, validate, parentNode, pedigreeNode, pedigreeMapSource,
          pedigreeMapDestination, germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds, breedingMethodsDestinationById,
          breedingMethodsDestByName);
      }
    });
    if (otherMaleParentsMismatch?.length) {
      otherMaleParentsMismatch.forEach(o => {
        if (o.germplasmDbId) {
          const parentNode = this.convertToGermplasmTreeGraphNode(pedigreeMapDestination?.get(o.germplasmDbId), true,
            germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds, breedingMethodsDestinationById, breedingMethodsDestByName);
          if (parentNode) {
            graphNode.otherProgenitors?.push(parentNode);
          }
          // Display the parent tree nodes of the mismatched germplasm from the destination server
          this.addParentNodesFromDestinationTree((level + 1), maximumLevelOfRecursion, parentNode,
            pedigreeMapDestination?.get(o.germplasmDbId), pedigreeMapDestination, breedingMethodsDestinationById,
            breedingMethodsDestByName);
        }
      });
    }
  }

  private addParentNodesFromDestinationTree(level: number,
                                            maximumLevelOfRecursion: number,
                                            graphNode?: GraphNode, destinationPedigreeNode?: PedigreeNode,
                                            pedigreeMapDestination?: Map<string, PedigreeNode>,
                                            breedingMethodsDestinationById?: { [p: string]: BreedingMethod },
                                            breedingMethodsDestByName?: { [p: string]: BreedingMethod }): void {

    if (!graphNode) {
      return;
    }

    // Immediately terminate the function once max level is reached.
    if (level >= maximumLevelOfRecursion) {
      return;
    }

    // Extract the parents of the germplasm node
    const pedigreeNodeParent1 = this.getParent1(destinationPedigreeNode);
    const pedigreeNodeParent2 = this.getParent2(destinationPedigreeNode);
    const pedigreeNodeOtherMaleParents = this.getOtherMaleParents(destinationPedigreeNode);

    // Immediately terminate the function if both female and male parent of source germplasm are undefined/unknown
    if (!pedigreeNodeParent1?.germplasmDbId && !pedigreeNodeParent2?.germplasmDbId) {
      return;
    }

    if (pedigreeNodeParent1?.germplasmDbId && pedigreeNodeParent1?.germplasmName) {
      const parentNode = this.convertToGermplasmTreeGraphNode(pedigreeMapDestination?.get(pedigreeNodeParent1?.germplasmDbId),
        true, breedingMethodsDestinationById, breedingMethodsDestByName);
      const pedigreeNode = pedigreeMapDestination?.get(pedigreeNodeParent1?.germplasmDbId);
      graphNode.femaleParentNode = parentNode;
      if (!this.isDerivative(destinationPedigreeNode)) {
        // This is to avoid multiple processing of the same group source in a derivative line.
        this.addParentNodesFromDestinationTree((level + 1), maximumLevelOfRecursion, parentNode, pedigreeNode, pedigreeMapDestination,
          breedingMethodsDestinationById, breedingMethodsDestByName);
      }
    } else {
      // If germplasmDbId and germplasm are null, it means the parent is unknown.
      graphNode.femaleParentNode = this.createUnknownGraphNode();
    }
    if (pedigreeNodeParent2?.germplasmDbId && pedigreeNodeParent2?.germplasmName) {
      const parentNode = this.convertToGermplasmTreeGraphNode(pedigreeMapDestination?.get(pedigreeNodeParent2?.germplasmDbId),
        true, breedingMethodsDestinationById, breedingMethodsDestByName);
      const pedigreeNode = pedigreeMapDestination?.get(pedigreeNodeParent2?.germplasmDbId);
      graphNode.maleParentNode = parentNode;
      this.addParentNodesFromDestinationTree((level + 1), maximumLevelOfRecursion, parentNode, pedigreeNode, pedigreeMapDestination,
        breedingMethodsDestinationById, breedingMethodsDestByName);
    } else {
      // If germplasmDbId and germplasm are null, it means the parent is unknown.
      graphNode.maleParentNode = this.createUnknownGraphNode();
    }

    pedigreeNodeOtherMaleParents?.forEach(sourcePedigreeOtherParent => {
      if (sourcePedigreeOtherParent?.germplasmDbId && sourcePedigreeOtherParent?.germplasmName) {
        const parentNode = this.convertToGermplasmTreeGraphNode(pedigreeMapDestination?.get(sourcePedigreeOtherParent?.germplasmDbId),
          true, breedingMethodsDestinationById, breedingMethodsDestByName);
        const pedigreeNode = pedigreeMapDestination?.get(sourcePedigreeOtherParent?.germplasmDbId);
        if (parentNode) {
          graphNode.otherProgenitors?.push(parentNode);
        }
        this.addParentNodesFromDestinationTree((level + 1), maximumLevelOfRecursion, parentNode, pedigreeNode, pedigreeMapDestination,
          breedingMethodsDestinationById, breedingMethodsDestByName);
      }
    });
  }

  convertToGermplasmTreeGraphNode(pedigreeNode?: PedigreeNode, isMismatched: boolean = false,
                                  germplasmInDestinationByPUIs?: { [p: string]: Germplasm },
                                  germplasmInDestinationByReferenceIds?: { [p: string]: Germplasm },
                                  breedingMethodsDestinationById?: { [p: string]: BreedingMethod },
                                  breedingMethodsDestByName?: { [p: string]: BreedingMethod }): GraphNode | undefined {
    let germplasmTreeNode;
    if (pedigreeNode && pedigreeNode.germplasmDbId && pedigreeNode.germplasmName) {

      const existingGermplasmInDestination = this.getMatchingGermplasmInDestination({
        germplasmDbId: pedigreeNode?.germplasmDbId,
        germplasmPUI: pedigreeNode?.germplasmPUI
      }, germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
      germplasmTreeNode = new GraphNode(pedigreeNode?.germplasmDbId, pedigreeNode?.germplasmName);
      germplasmTreeNode.isDerivative = this.isDerivative(pedigreeNode);
      germplasmTreeNode.isMismatched = isMismatched;
      germplasmTreeNode.methodName =
        this.getBreedingMethodNameByName(breedingMethodsDestByName, pedigreeNode.breedingMethodName, germplasmTreeNode);
      if (existingGermplasmInDestination && existingGermplasmInDestination?.germplasmDbId
        && existingGermplasmInDestination?.germplasmName) {
        // If the germplasm already exists, show the germplasmDbId and germplasm name of the existing germplasm in destination
        germplasmTreeNode.isExistingInTarget = true;
        germplasmTreeNode.germplasmDbId = existingGermplasmInDestination?.germplasmDbId;
        germplasmTreeNode.preferredName = existingGermplasmInDestination?.germplasmName;
        germplasmTreeNode.methodName =
          this.getBreedingMethodNameById(breedingMethodsDestinationById, existingGermplasmInDestination.breedingMethodDbId);
      }
    }
    return germplasmTreeNode;
  }

  getBreedingMethodNameById(breedingMethodsDestinationById: any, breedingMethodDbId: any): string | undefined {
    if (breedingMethodsDestinationById && breedingMethodDbId && breedingMethodsDestinationById[breedingMethodDbId]) {
      return breedingMethodsDestinationById[breedingMethodDbId].breedingMethodName;
    }
    return undefined;
  }

  getBreedingMethodNameByName(breedingMethodsDestByName: any, breedingMethodName: any, node: any): string {
    if (breedingMethodsDestByName && breedingMethodName) {
      if (breedingMethodsDestByName[breedingMethodName]) {
        return breedingMethodsDestByName[breedingMethodName].breedingMethodName;
      } else {
        node.isBreedingMethodExisting = false;
      }
    }
    return breedingMethodName;
  }

  validatePedigreeTreeNodes(maximumLevelOfRecursion: number, germplasm: Germplasm[],
                            pedigreeMapSource: Map<string, PedigreeNode>,
                            pedigreeMapDestination: Map<string, PedigreeNode>,
                            germplasmInDestinationByPUIs?: { [p: string]: Germplasm },
                            germplasmInDestinationByReferenceIds?: { [p: string]: Germplasm },
                            checkForExistingAncestors?: boolean,
                            breedingMethodsDestByName?: { [p: string]: BreedingMethod }):
    Map<string, Array<PedigreeNodeValidationResult>> {
    // Create a map that contains a list of validation results per root germplasm.
    const invalidPedigreeNodes: Map<string, Array<PedigreeNodeValidationResult>> = new Map<string, Array<PedigreeNodeValidationResult>>();

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
            germplasmInDestinationByReferenceIds,
            checkForExistingAncestors,
            breedingMethodsDestByName);
        }
      }
    });
    return invalidPedigreeNodes;

  }

  // Recursive function to compare the pedigree nodes (parents) of source germplasm to the target germplasm.
  // Mismatched pedigree nodes will be added to the invalidPedigreeNodes map.
  private validatePedigreeNode(level: number, maximumLevelOfRecursion: number, rootGermplasmDbId: string,
                               invalidPedigreeNodes: Map<string, Array<PedigreeNodeValidationResult>>,
                               sourcePedigreeNode?: PedigreeNode,
                               pedigreeMapSource?: Map<string, PedigreeNode>,
                               pedigreeMapDestination?: Map<string, PedigreeNode>,
                               germplasmInDestinationByPUIs?: { [p: string]: Germplasm },
                               germplasmInDestinationByReferenceIds?: { [p: string]: Germplasm },
                               checkForExistingAncestors?: boolean,
                               breedingMethodsDestByName?: { [p: string]: BreedingMethod }): void {

    // Check if source germplasm (pedigree node) already exists in the destination server
    const existingGermplasmInDestination = this.getMatchingGermplasmInDestination({
      germplasmDbId: sourcePedigreeNode?.germplasmDbId,
      germplasmPUI: sourcePedigreeNode?.germplasmPUI
    }, germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);

    if (existingGermplasmInDestination && checkForExistingAncestors && sourcePedigreeNode) {
      this.addToInvalidPedigreeNodes(PedigreeNodeValidationType.ROOT_GERMPLASM_HAS_EXISTING_ANCESTORS,
        invalidPedigreeNodes, rootGermplasmDbId, sourcePedigreeNode);
    } else if (!existingGermplasmInDestination && sourcePedigreeNode
      && !this.breedingMethodExistingInDestination(sourcePedigreeNode, breedingMethodsDestByName)) {
      this.addToInvalidPedigreeNodes(PedigreeNodeValidationType.BREEDING_METHOD_NOT_EXISTING_IN_DESTINATION,
        invalidPedigreeNodes, rootGermplasmDbId, sourcePedigreeNode);
    }

    // Immediately terminate the function once max level is reached.
    if (level >= maximumLevelOfRecursion) {
      return;
    }

    // Extract the parents of the source germplasm
    const sourcePedigreeNodeParent1 = this.getParent1(sourcePedigreeNode);
    const sourcePedigreeNodeParent2 = this.getParent2(sourcePedigreeNode);
    const sourcePedigreeOtherMaleParents = this.getOtherMaleParents(sourcePedigreeNode);

    if (sourcePedigreeNode?.germplasmDbId && existingGermplasmInDestination) {
      // Get the existing germplasm of the source germplasm's parents
      const existingSourceGermplasmParent1 =
        this.getMatchingGermplasmInDestination({
            germplasmDbId: sourcePedigreeNodeParent1?.germplasmDbId,
            germplasmPUI: this.getPUI(sourcePedigreeNodeParent1?.germplasmDbId, pedigreeMapSource)
          },
          germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
      const existingSourceGermplasmParent2 =
        this.getMatchingGermplasmInDestination({
            germplasmDbId: sourcePedigreeNodeParent2?.germplasmDbId,
            germplasmPUI: this.getPUI(sourcePedigreeNodeParent2?.germplasmDbId, pedigreeMapSource)
          },
          germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
      const existingSourceGermplasmOtherParents: Map<string, Germplasm> = new Map<string, Germplasm>();
      sourcePedigreeOtherMaleParents?.forEach(p => {
        const existingSourceGermplasmOtherParent = this.getMatchingGermplasmInDestination({
            germplasmDbId: p?.germplasmDbId,
            germplasmPUI: this.getPUI(p?.germplasmDbId, pedigreeMapSource)
          },
          germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
        if (existingSourceGermplasmOtherParent && existingSourceGermplasmOtherParent.germplasmDbId) {
          existingSourceGermplasmOtherParents.set(existingSourceGermplasmOtherParent.germplasmDbId, existingSourceGermplasmOtherParent);
        }
      });

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
        this.addToInvalidPedigreeNodes(PedigreeNodeValidationType.PARENT_NODE_MISMATCH,
          invalidPedigreeNodes, rootGermplasmDbId, destinationPedigreeNodeParent1);
      }
      // Check if source germplasm's parent 1 does not exist and the target germplasm's parent 1 is already assigned
      if (!existingSourceGermplasmParent1?.germplasmDbId && destinationPedigreeNodeParent1?.germplasmDbId) {
        this.addToInvalidPedigreeNodes(PedigreeNodeValidationType.PARENT_NODE_MISMATCH,
          invalidPedigreeNodes, rootGermplasmDbId, destinationPedigreeNodeParent1);
      }
      // Check if source germlasm's parent 2 doesn't match the target germplasm's parent 2
      if (existingSourceGermplasmParent2?.germplasmDbId && destinationPedigreeNodeParent2?.germplasmDbId
        && existingSourceGermplasmParent2?.germplasmDbId !== destinationPedigreeNodeParent2?.germplasmDbId) {
        this.addToInvalidPedigreeNodes(PedigreeNodeValidationType.PARENT_NODE_MISMATCH,
          invalidPedigreeNodes, rootGermplasmDbId, destinationPedigreeNodeParent2);
      }
      // Check if source germplasm's parent 2 does not exist and the target germplasm's parent 2 is already assigned
      if (!existingSourceGermplasmParent2?.germplasmDbId && destinationPedigreeNodeParent2?.germplasmDbId) {
        this.addToInvalidPedigreeNodes(PedigreeNodeValidationType.PARENT_NODE_MISMATCH,
          invalidPedigreeNodes, rootGermplasmDbId, destinationPedigreeNodeParent2);
      }
      // Check if source germplasm's other male parents match the target germplasm's other male parents
      destinationPedigreeNodeOtherParents?.forEach(destinationOtherMaleParent => {
        if (destinationOtherMaleParent.germplasmDbId &&
          !existingSourceGermplasmOtherParents.has(destinationOtherMaleParent.germplasmDbId)) {
          this.addToInvalidPedigreeNodes(PedigreeNodeValidationType.PARENT_NODE_MISMATCH,
            invalidPedigreeNodes, rootGermplasmDbId, destinationOtherMaleParent);
        }
      });
    }

    if (sourcePedigreeNodeParent1?.germplasmDbId && !this.isDerivative(sourcePedigreeNode)) {
      // Only validate parent 1 if the germplasm is generative.
      // So that if germplasm is derivative, we can avoid multiple validations of the same group source in derivatine line.
      this.validatePedigreeNode((level + 1), maximumLevelOfRecursion, rootGermplasmDbId, invalidPedigreeNodes,
        pedigreeMapSource?.get(sourcePedigreeNodeParent1?.germplasmDbId),
        pedigreeMapSource, pedigreeMapDestination, germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds,
        checkForExistingAncestors, breedingMethodsDestByName);
    }
    if (sourcePedigreeNodeParent2?.germplasmDbId) {
      this.validatePedigreeNode((level + 1), maximumLevelOfRecursion, rootGermplasmDbId, invalidPedigreeNodes,
        pedigreeMapSource?.get(sourcePedigreeNodeParent2?.germplasmDbId),
        pedigreeMapSource, pedigreeMapDestination, germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds,
        checkForExistingAncestors, breedingMethodsDestByName);
    }
    sourcePedigreeOtherMaleParents?.forEach(sourcePedigreeOtherParent => {
      if (sourcePedigreeOtherParent?.germplasmDbId) {
        this.validatePedigreeNode((level + 1), maximumLevelOfRecursion, rootGermplasmDbId, invalidPedigreeNodes,
          pedigreeMapSource?.get(sourcePedigreeOtherParent?.germplasmDbId),
          pedigreeMapSource, pedigreeMapDestination, germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds,
          checkForExistingAncestors, breedingMethodsDestByName);
      }
    });

  }

  private addToInvalidPedigreeNodes(validationType: PedigreeNodeValidationType,
                                    invalidPedigreeNodes: Map<string, Array<PedigreeNodeValidationResult>>,
                                    sourceGermplasmDbId: string,
                                    pedigreeNode: PedigreeNode): void {
    // Initialize array if still undefined
    if (!invalidPedigreeNodes.has(sourceGermplasmDbId)) {
      invalidPedigreeNodes.set(sourceGermplasmDbId, new Array<PedigreeNodeValidationResult>());
    }
    invalidPedigreeNodes.get(sourceGermplasmDbId)?.push(new PedigreeNodeValidationResult(pedigreeNode.germplasmDbId,
      pedigreeNode.germplasmName, validationType));
  }

  private createUnknownGraphNode(): GraphNode {
    return new GraphNode('0', 'UNKNOWN');
  }

  getPUI(germplasmDbId: string | undefined, pedigreeMap: Map<string, PedigreeNode> | undefined): string | undefined {
    if (germplasmDbId !== null && germplasmDbId !== undefined && pedigreeMap !== undefined) {
      return pedigreeMap.get(germplasmDbId)?.germplasmPUI;
    }
    return undefined;
  }

  filterGermplasmForCreation(germplasm: Germplasm[], pedigreeMapSource: Map<string, PedigreeNode>,
                             maximumLevelOfRecursion: number): Set<string> {
    const germplasmDbIds: Set<string> = new Set<string>();
    germplasm.forEach((g) => {
      if (g.germplasmDbId) {
        const pedigreeNode = pedigreeMapSource?.get(g.germplasmDbId);
        if (pedigreeNode && pedigreeNode.germplasmDbId) {
          const level = 1;
          germplasmDbIds.add(pedigreeNode.germplasmDbId);
          this.extractParentsGermplasmDbId(germplasmDbIds, level, maximumLevelOfRecursion, pedigreeNode?.germplasmDbId, pedigreeNode,
            pedigreeMapSource);
        }
      }
    });

    return germplasmDbIds;
  }

  private breedingMethodExistingInDestination(germplasm: any, breedingMethodsDestByName?: { [p: string]: BreedingMethod }): boolean {
    if (breedingMethodsDestByName && breedingMethodsDestByName[germplasm.breedingMethodName]) {
      return true;
    }
    return false;
  }

  private extractParentsGermplasmDbId(germplasmDbIds: Set<string>, level: number, maximumLevelOfRecursion: number, germplasmDbId: string,
                                      pedigreeNode: PedigreeNode,
                                      pedigreeMapSource: Map<string, PedigreeNode>): void {
    // Immediately terminate the function once max level is reached.
    if (level >= maximumLevelOfRecursion) {
      return;
    }
    const node = pedigreeMapSource?.get(germplasmDbId);
    if (node && node.germplasmDbId) {
      node.parents?.forEach((p) => {
        if (p.germplasmDbId) {
          germplasmDbIds.add(p?.germplasmDbId);
          if (p.parentType !== 'POPULATION') {
            this.extractParentsGermplasmDbId(germplasmDbIds, (level + 1), maximumLevelOfRecursion, p?.germplasmDbId, node,
              pedigreeMapSource);
          }
        }
      });
    }
  }
}
