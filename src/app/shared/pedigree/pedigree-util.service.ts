import { Injectable } from '@angular/core';
import { brapiAll } from '../../util/brapi-all';
import { EntityEnum, ExternalReferenceService } from '../external-reference/external-reference.service';
import { Germplasm } from '../brapi/2.0/model/germplasm';
import { ContextService } from '../../context.service';
import { PedigreeNode } from '../brapi/2.1/model/pedigree-node';
import { PedigreeNodeParents } from '../brapi/2.1/model/pedigree-node-parents';
import { ParentType } from '../brapi/2.1/model/parent-type';
import { GermplasmTreeNode } from '../pedigree-graph/germplasm-tree-node';

declare const BrAPI: any;

@Injectable({
  providedIn: 'root'
})
export class PedigreeUtilService {

  brapiDestination: any;

  constructor(private externalReferenceService: ExternalReferenceService,
              private context: ContextService) {
    this.brapiDestination = BrAPI(this.context.destination, '2.0', this.context.destinationToken);
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

  createGermplasmTreeNode(rootGermplasmDbId: string, maximumLevelOfRecursion: number, pedigreeMapSource?: Map<string, PedigreeNode>,
                          pedigreeMapDestination?: Map<string, PedigreeNode>): GermplasmTreeNode | undefined {

    const pedigreeNode = pedigreeMapSource?.get(rootGermplasmDbId);
    const germplasmTreeNode = this.convertToGermplasmTreeNode(pedigreeNode);
    if (germplasmTreeNode) {
      const level = 1;
      this.addParentNodes(level, maximumLevelOfRecursion, germplasmTreeNode, pedigreeNode, pedigreeMapSource, pedigreeMapDestination);
    }
    return germplasmTreeNode;
  }

  private addParentNodes(level: number,
                         maximumLevelOfRecursion: number,
                         germplasmTreeNode?: GermplasmTreeNode, sourcePedigreeNode?: PedigreeNode,
                         pedigreeMapSource?: Map<string, PedigreeNode>,
                         pedigreeMapDestination?: Map<string, PedigreeNode>): void {

    if (!germplasmTreeNode) {
      return;
    }

    // Immediately terminate the function once max level is reached.
    if (level === maximumLevelOfRecursion) {
      return;
    }

    // Extract the parents
    const sourcePedigreeNodeParent1 = this.getParent1(sourcePedigreeNode);
    const sourcePedigreeNodeParent2 = this.getParent2(sourcePedigreeNode);
    const sourcePedigreeOtherMaleParents = this.getOtherMaleParents(sourcePedigreeNode);

    if (sourcePedigreeNodeParent1?.germplasmDbId && sourcePedigreeNodeParent1?.germplasmName) {
      if (!germplasmTreeNode?.isDerivative) {
        const parentNode = this.convertToGermplasmTreeNode(pedigreeMapSource?.get(sourcePedigreeNodeParent1?.germplasmDbId));
        const pedigreeNode = pedigreeMapSource?.get(sourcePedigreeNodeParent1?.germplasmDbId);
        germplasmTreeNode.femaleParentNode = parentNode;
        this.addParentNodes(level++, maximumLevelOfRecursion, parentNode, pedigreeNode, pedigreeMapSource, pedigreeMapDestination);
      }
    }
    if (sourcePedigreeNodeParent2?.germplasmDbId && sourcePedigreeNodeParent2?.germplasmName) {
      const parentNode = this.convertToGermplasmTreeNode(pedigreeMapSource?.get(sourcePedigreeNodeParent2?.germplasmDbId));
      const pedigreeNode = pedigreeMapSource?.get(sourcePedigreeNodeParent2?.germplasmDbId);
      germplasmTreeNode.maleParentNode = parentNode;
      this.addParentNodes(level++, maximumLevelOfRecursion, parentNode, pedigreeNode, pedigreeMapSource, pedigreeMapDestination);
    }
    sourcePedigreeOtherMaleParents?.forEach(sourcePedigreeOtherParent => {
      if (sourcePedigreeOtherParent?.germplasmDbId && sourcePedigreeOtherParent?.germplasmName) {
        const parentNode = this.convertToGermplasmTreeNode(pedigreeMapSource?.get(sourcePedigreeOtherParent?.germplasmDbId));
        const pedigreeNode = pedigreeMapSource?.get(sourcePedigreeOtherParent?.germplasmDbId);
        if (parentNode) {
          germplasmTreeNode.otherProgenitors?.push(parentNode);
        }
        this.addParentNodes(level++, maximumLevelOfRecursion, parentNode, pedigreeNode, pedigreeMapSource, pedigreeMapDestination);
      }
    });
  }

  convertToGermplasmTreeNode(pedigreeNode?: PedigreeNode): GermplasmTreeNode | undefined {
    let germplasmTreeNode;
    if (pedigreeNode && pedigreeNode.germplasmDbId && pedigreeNode.germplasmName) {
      germplasmTreeNode = new GermplasmTreeNode(pedigreeNode?.germplasmDbId, pedigreeNode?.germplasmName);
      germplasmTreeNode.isDerivative = this.isDerivative(pedigreeNode);
    }
    return germplasmTreeNode;
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

    // Immediately terminate the function once max level is reached.
    if (level === maximumLevelOfRecursion) {
      return;
    }

    if (sourcePedigreeNodeParent1?.germplasmDbId) {
      this.validatePedigreeNode(level++, maximumLevelOfRecursion, rootGermplasmDbId, invalidPedigreeNodes,
        pedigreeMapSource?.get(sourcePedigreeNodeParent1?.germplasmDbId),
        pedigreeMapSource, pedigreeMapDestination, germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
    }
    if (sourcePedigreeNodeParent2?.germplasmDbId) {
      this.validatePedigreeNode(level++, maximumLevelOfRecursion, rootGermplasmDbId, invalidPedigreeNodes,
        pedigreeMapSource?.get(sourcePedigreeNodeParent2?.germplasmDbId),
        pedigreeMapSource, pedigreeMapDestination, germplasmInDestinationByPUIs, germplasmInDestinationByReferenceIds);
    }
    sourcePedigreeOtherMaleParents?.forEach(sourcePedigreeOtherParent => {
      if (sourcePedigreeOtherParent?.germplasmDbId) {
        this.validatePedigreeNode(level++, maximumLevelOfRecursion, rootGermplasmDbId, invalidPedigreeNodes,
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
}
