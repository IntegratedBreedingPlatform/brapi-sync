import { MetadataDatafiles } from './metadataDatafiles';
import { MetadataPagination } from './metadataPagination';
import { MetadataStatus } from './metadataStatus';

export interface Metadata {
  datafiles?: Array<MetadataDatafiles>;
  pagination?: MetadataPagination;
  status?: Array<MetadataStatus>;
}
