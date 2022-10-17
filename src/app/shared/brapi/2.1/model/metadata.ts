
import { MetadataDatafiles } from './metadata-datafiles';
import { MetadataPagination } from './metadata-pagination';
import { MetadataStatus } from './metadata-status';


export interface Metadata {
    datafiles?: Array<MetadataDatafiles>;
    pagination?: MetadataPagination;
    status?: Array<MetadataStatus>;
}