import { Metadata } from './metadata';
import { ListResponse } from '../../shared/model/list-response';
import { BreedingMethod } from './breeding-method';
import { ListResponseResult } from '../../shared/model/list-response-result';

export class BreedingMethodListResponse implements ListResponse<BreedingMethod> {
  metadata: Metadata;
  result: ListResponseResult<BreedingMethod>;

  constructor(metadata: Metadata, result: ListResponseResult<BreedingMethod>) {
    this.metadata = metadata;
    this.result = result;
  }

}
