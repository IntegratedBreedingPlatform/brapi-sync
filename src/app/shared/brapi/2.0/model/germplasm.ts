import { CrossExternalReferences } from './cross-external-references';
import { GermplasmDonors } from './germplasm-donors';
import { GermplasmGermplasmOrigin } from './germplasm-germplasm-origin';
import { GermplasmStorageTypes } from './germplasm-storage-types';
import { GermplasmSynonyms } from './germplasm-synonyms';
import { GermplasmTaxonIds } from './germplasm-taxon-Ids';

export interface Germplasm {
  accessionNumber?: string;
  acquisitionDate?: string;
  additionalInfo?: { [key: string]: string; };
  biologicalStatusOfAccessionCode?: Germplasm.BiologicalStatusOfAccessionCodeEnum;
  biologicalStatusOfAccessionDescription?: string;
  breedingMethodDbId?: string;
  collection?: string;
  commonCropName?: string;
  countryOfOriginCode?: string;
  defaultDisplayName?: string;
  documentationURL?: string;
  donors?: Array<GermplasmDonors>;
  externalReferences?: Array<CrossExternalReferences>;
  genus?: string;
  germplasmDbId?: string;
  germplasmName?: string;
  // FIXME array on pedigree sync branch?
  // germplasmOrigin?: Array<GermplasmGermplasmOrigin>;
  germplasmOrigin?: GermplasmGermplasmOrigin;
  germplasmPUI?: string;
  germplasmPreprocessing?: string;
  instituteCode?: string;
  instituteName?: string;
  pedigree?: string;
  seedSource?: string;
  seedSourceDescription?: string;
  species?: string;
  speciesAuthority?: string;
  storageTypes?: Array<GermplasmStorageTypes>;
  subtaxa?: string;
  subtaxaAuthority?: string;
  synonyms?: Array<GermplasmSynonyms>;
  taxonIds?: Array<GermplasmTaxonIds>;
}

export namespace Germplasm {
  export type BiologicalStatusOfAccessionCodeEnum =
    '100'
    | '110'
    | '120'
    | '130'
    | '200'
    | '300'
    | '400'
    | '410'
    | '411'
    | '412'
    | '413'
    | '414'
    | '415'
    | '416'
    | '420'
    | '421'
    | '422'
    | '423'
    | '500'
    | '600'
    | '999';
  export const BiologicalStatusOfAccessionCodeEnum = {
    _100: '100' as BiologicalStatusOfAccessionCodeEnum,
    _110: '110' as BiologicalStatusOfAccessionCodeEnum,
    _120: '120' as BiologicalStatusOfAccessionCodeEnum,
    _130: '130' as BiologicalStatusOfAccessionCodeEnum,
    _200: '200' as BiologicalStatusOfAccessionCodeEnum,
    _300: '300' as BiologicalStatusOfAccessionCodeEnum,
    _400: '400' as BiologicalStatusOfAccessionCodeEnum,
    _410: '410' as BiologicalStatusOfAccessionCodeEnum,
    _411: '411' as BiologicalStatusOfAccessionCodeEnum,
    _412: '412' as BiologicalStatusOfAccessionCodeEnum,
    _413: '413' as BiologicalStatusOfAccessionCodeEnum,
    _414: '414' as BiologicalStatusOfAccessionCodeEnum,
    _415: '415' as BiologicalStatusOfAccessionCodeEnum,
    _416: '416' as BiologicalStatusOfAccessionCodeEnum,
    _420: '420' as BiologicalStatusOfAccessionCodeEnum,
    _421: '421' as BiologicalStatusOfAccessionCodeEnum,
    _422: '422' as BiologicalStatusOfAccessionCodeEnum,
    _423: '423' as BiologicalStatusOfAccessionCodeEnum,
    _500: '500' as BiologicalStatusOfAccessionCodeEnum,
    _600: '600' as BiologicalStatusOfAccessionCodeEnum,
    _999: '999' as BiologicalStatusOfAccessionCodeEnum
  };
}
