export class PedigreeNodeValidationResult {
  constructor(
    public germplasmDbId?: string,
    public germplasmName?: string,
    public validationType?: PedigreeNodeValidationType,
  ) {
  }
}

export enum PedigreeNodeValidationType {
  PARENT_NODE_MISMATCH = 'PARENT_NODE_MISMATCH',
  ROOT_GERMPLASM_HAS_EXISTING_ANCESTORS = 'ROOT_GERMPLASM_HAS_EXISTING_ANCESTORS',
  BREEDING_METHOD_NOT_EXISTING_IN_DESTINATION = 'BREEDING_METHOD_NOT_EXISTING_IN_DESTINATION'
}
