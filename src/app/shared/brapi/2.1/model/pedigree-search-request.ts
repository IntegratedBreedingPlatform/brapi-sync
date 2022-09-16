export interface PedigreeSearchRequest {
  accessionNumbers?: Array<string>;
  binomialNames?: Array<string>;
  collections?: Array<string>;
  commonCropNames?: Array<string>;
  externalReferenceIDs?: Array<string>;
  externalReferenceIds?: Array<string>;
  externalReferenceSources?: Array<string>;
  familyCodes?: Array<string>;
  genus?: Array<string>;
  germplasmDbIds?: Array<string>;
  germplasmNames?: Array<string>;
  germplasmPUIs?: Array<string>;
  includeFullTree?: boolean;
  includeParents?: boolean;
  includeProgeny?: boolean;
  includeSiblings?: boolean;
  instituteCodes?: Array<string>;
  page?: number;
  pageSize?: number;
  pedigreeDepth?: number;
  progenyDepth?: number;
  programDbIds?: Array<string>;
  programNames?: Array<string>;
  species?: Array<string>;
  studyDbIds?: Array<string>;
  studyNames?: Array<string>;
  synonyms?: Array<string>;
  trialDbIds?: Array<string>;
  trialNames?: Array<string>;
}