import { MetadataDatafiles } from '../../2.1/model/metadataDatafiles';
import { MetadataPagination } from '../../2.1/model/metadataPagination';
import { MetadataStatus } from '../../2.1/model/metadataStatus';

export interface Metadata {
  datafiles?: Array<MetadataDatafiles>;
  pagination?: MetadataPagination;
  status?: Array<MetadataStatus>;
}
