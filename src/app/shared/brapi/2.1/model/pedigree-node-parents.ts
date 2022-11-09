import { ParentType } from './parent-type';

export interface PedigreeNodeParents {
    germplasmDbId?: string;
    germplasmName?: string;
    parentType: ParentType;
}
