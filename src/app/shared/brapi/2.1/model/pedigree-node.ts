import { ExternalReferences } from './external-references';
import { PedigreeNodeParents } from './pedigree-node-parents';
import { PedigreeNodeSiblings } from './pedigree-node-siblings';

export interface PedigreeNode {
  additionalInfo?: { [key: string]: string; };
  breedingMethodDbId?: string;
  breedingMethodName?: string;
  crossingProjectDbId?: string;
  crossingYear?: number;
  defaultDisplayName?: string;
  externalReferences?: ExternalReferences;
  familyCode?: string;
  germplasmDbId?: string;
  germplasmName?: string;
  germplasmPUI?: string;
  parents?: Array<PedigreeNodeParents>;
  pedigreeString?: string;
  progeny?: Array<PedigreeNodeParents>;
  siblings?: Array<PedigreeNodeSiblings>;
}
