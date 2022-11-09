
export interface GermplasmSearchRequest {
    accessionNumbers?: Array<string>;
    collections?: Array<string>;
    commonCropNames?: Array<string>;
    externalReferenceIDs?: Array<string>;
    externalReferenceSources?: Array<string>;
    genus?: Array<string>;
    germplasmDbIds?: Array<string>;
    germplasmNames?: Array<string>;
    germplasmPUIs?: Array<string>;
    page?: number;
    pageSize?: number;
    parentDbIds?: Array<string>;
    progenyDbIds?: Array<string>;
    species?: Array<string>;
    studyDbIds?: Array<string>;
    studyNames?: Array<string>;
    synonyms?: Array<string>;
}
