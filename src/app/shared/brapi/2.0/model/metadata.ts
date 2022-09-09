import { MetadataDataFiles } from './metadata-data-files';
import { MetadataPagination } from './metadata-pagination';
import { MetadataStatus } from './metadata-status';

export interface Metadata {
  datafiles?: Array<MetadataDataFiles>;
  pagination?: MetadataPagination;
  status?: Array<MetadataStatus>;
}