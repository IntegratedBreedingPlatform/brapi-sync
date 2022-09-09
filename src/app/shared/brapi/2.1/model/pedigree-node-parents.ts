import { ParentType } from './parent-type';

export interface PedigreeNodeParents {
    germplasmDbId: string | null;
    germplasmName?: string | null;
    parentType: ParentType;
}
