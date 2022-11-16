import { ListResponse } from '../../shared/model/list-response';
import { ListResponseResult } from '../../shared/model/list-response-result';
import { Metadata } from '../../shared/model/metadata';
import { PedigreeNode } from './pedigree-node';

export class PedigreeListResponse implements ListResponse<PedigreeNode> {

  metadata: Metadata;
  result: ListResponseResult<PedigreeNode>;

  constructor(metadata: Metadata,
              result: ListResponseResult<PedigreeNode>) {
    this.metadata = metadata;
    this.result = result;
  }


}
